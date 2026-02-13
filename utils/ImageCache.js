// utils/imageCache.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { getLambdaHeaders } from "./lambdaClient";

const INDEX_KEY = "PRODUCT_IMG_CACHE_INDEX_V1";
const CACHE_DIR = `${FileSystem.cacheDirectory}product-images/`;

let memIndex = null;
const inflight = new Map();

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
}

async function loadIndex() {
  if (memIndex) return memIndex;
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  memIndex = raw ? JSON.parse(raw) : {};
  return memIndex;
}

async function saveIndex(next) {
  memIndex = next;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

async function sha1(text) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, text);
}

function extFromContentType(ct) {
  const v = String(ct || "").toLowerCase();
  if (v.includes("image/png")) return "png";
  if (v.includes("image/webp")) return "webp";
  if (v.includes("image/gif")) return "gif";
  if (v.includes("image/jpeg") || v.includes("image/jpg")) return "jpg";
  return "jpg";
}

export async function getLocalUriIfCached(remoteUri) {
  if (!remoteUri) return null;

  await ensureDir();
  const idx = await loadIndex();

  const key = await sha1(remoteUri);
  const entry = idx[key];
  if (!entry?.localUri) return null;

  const info = await FileSystem.getInfoAsync(entry.localUri);
  return info.exists ? entry.localUri : null;
}

export async function ensureImageCached(remoteUri) {
  if (!remoteUri) return null;

  await ensureDir();
  const idx = await loadIndex();

  if (inflight.has(remoteUri)) return inflight.get(remoteUri);

  const p = (async () => {
    const headers = getLambdaHeaders(); // ✅ derived from imported api
    const key = await sha1(remoteUri);

    const existing = idx[key]?.localUri;
    if (existing) {
      const info = await FileSystem.getInfoAsync(existing);
      if (info.exists) return existing;
    }

    const tmpUri = `${CACHE_DIR}${key}.tmp`;
    const res = await FileSystem.downloadAsync(remoteUri, tmpUri, { headers });

    if (res?.status >= 400) {
      console.log("CACHE DOWNLOAD HTTP ERROR:", { remoteUri, status: res.status });
      throw new Error(`HTTP ${res.status}`);
    }

    const ct = res?.headers?.["Content-Type"] || res?.headers?.["content-type"];
    const ext = extFromContentType(ct);
    const finalUri = `${CACHE_DIR}${key}.${ext}`;

    await FileSystem.moveAsync({ from: tmpUri, to: finalUri });

    const next = { ...idx, [key]: { remoteUri, localUri: finalUri, ts: Date.now() } };
    await saveIndex(next);

    return finalUri;
  })();

  inflight.set(remoteUri, p);
  try {
    return await p;
  } finally {
    inflight.delete(remoteUri);
  }
}

export async function preCacheImages(remoteUris) {
  const uris = (remoteUris || []).filter(Boolean);
  return Promise.allSettled(uris.map((u) => ensureImageCached(u)));
}