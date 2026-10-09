import { Image as ExpoImage } from "expo-image";
import { Platform } from "react-native";

const PRODUCT_IMAGE_BASE_URL =
  "https://testing.frankotrading.com/Media/Products_Images";
const prefetchedUrls = new Set();
// Stable URLs let Expo Image reuse its disk cache between launches. Catalog
// requests still refresh independently; an image is fetched again only when
// the API changes its path or supplies a new revision for the same path.
export const versionMediaUri = (uri, revision) => {
  if (typeof uri !== "string" || !/^https?:\/\//i.test(uri) || !revision) return uri;
  if (!/^https?:\/\/testing\.frankotrading\.com\/Media\//i.test(uri)) return uri;
  return `${uri}${uri.includes("?") ? "&" : "?"}franko_v=${encodeURIComponent(String(revision))}`;
};
const prefetchingUrls = new Map();

// An image that already rendered successfully is cached too; don't prefetch
// that URL again just because a different shelf requests it.
export const markImageCached = (url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || prefetchedUrls.has(url)) return;
  if (prefetchedUrls.size >= 250) prefetchedUrls.delete(prefetchedUrls.values().next().value);
  prefetchedUrls.add(url);
};

// Image paths are supplied by the product API/database, not a local stock
// image. Accept the field variants returned by different catalog endpoints.
export const getProductImagePath = (product) => {
  if (!product || typeof product !== 'object') return null;
  const candidates = [product.productImage, product.ProductImage, product.productImageUrl,
    product.imagePath, product.imageUrl, product.imageURL, product.imageName, product.image];
  return candidates.find((value) => typeof value === 'string' && value.trim()) || null;
};

export const getProductImageUri = (product) => resolveProductImageUri(getProductImagePath(product), product);

export const resolveProductImageUri = (imagePath, product) => {
  if (typeof imagePath !== "string" || !imagePath.trim()) return null;
  if (/^data:image\//i.test(imagePath.trim())) return imagePath.trim();
  const normalizedPath = imagePath.trim().replace(/\\/g, "/");
  // Prefer image-specific revisions. Product modification dates provide a
  // fallback when the backend replaces a file without renaming it.
  const revision = product?.imageVersion || product?.imageModifiedDate || product?.imageUpdatedAt ||
    product?.dateModified || product?.modifiedDate || product?.updatedAt;
  if (/^https?:\/\//i.test(normalizedPath)) return versionMediaUri(normalizedPath, revision);
  const imageName = normalizedPath.split("/").pop();
  if (!imageName) return null;
  // Filenames from the API can contain spaces, # or pre-escaped characters.
  // Encode exactly once so the URL used for prefetch matches the displayed URL.
  let encodedName;
  try {
    encodedName = encodeURIComponent(decodeURIComponent(imageName));
  } catch {
    encodedName = encodeURIComponent(imageName);
  }
  return versionMediaUri(`${PRODUCT_IMAGE_BASE_URL}/${encodedName}`, revision);
};

// A single global queue prevents the 10+ home shelves from starting their
// own simultaneous prefetch batches and delaying the visible campaign image.
const MAX_BACKGROUND_REQUESTS = 2;
const pendingImages = [];
let activeImages = 0;

function pumpImageQueue() {
  while (activeImages < MAX_BACKGROUND_REQUESTS && pendingImages.length) {
    const { url, finish } = pendingImages.shift();
    activeImages += 1;
    Promise.resolve().then(async () => {
      // On iOS/Android this is a real disk-cache lookup. Unlike a normal
      // prefetch, a cache hit cannot trigger another image download.
      if (Platform.OS !== 'web' && typeof ExpoImage.getCachePathAsync === 'function') {
        try {
          if (await ExpoImage.getCachePathAsync(url)) return true;
        } catch { /* Fall through to prefetch on an unsupported device. */ }
      }
      return ExpoImage.prefetch(url, "memory-disk");
    })
      .then((success) => {
        if (success) markImageCached(url);
        finish(Boolean(success));
      })
      .catch(() => finish(false))
      .finally(() => {
        activeImages -= 1;
        prefetchingUrls.delete(url);
        pumpImageQueue();
      });
  }
}

/** Prefetch one remote image into the same Expo Image cache used for display. */
export const preloadImage = (url, { priority = "normal" } = {}) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return Promise.resolve(false);
  if (prefetchedUrls.has(url)) return Promise.resolve(true);
  if (prefetchingUrls.has(url)) return prefetchingUrls.get(url);

  const request = new Promise((finish) => {
    const job = { url, finish };
    if (priority === "high") pendingImages.unshift(job);
    else pendingImages.push(job);
    pumpImageQueue();
  });
  prefetchingUrls.set(url, request);
  return request;
};

/**
 * Warm a small, prioritized batch without flooding the network. Call after the
 * product data is available; this intentionally does not block rendering.
 */
export const preloadImageUrls = async (
  urls,
  { maxImages = 8, concurrency = 3, priority = "normal" } = {}
) => {
  const queue = [...new Set((Array.isArray(urls) ? urls : []).filter(Boolean))]
    .filter((url) => !prefetchedUrls.has(url))
    .slice(0, Math.max(0, maxImages));

  if (!queue.length) return [];

  const results = new Array(queue.length);
  let nextIndex = 0;
  const workerCount = Math.min(
    queue.length,
    Math.max(1, Number(concurrency) || 1)
  );

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < queue.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await preloadImage(queue[index], { priority });
      }
    })
  );

  return results;
};

export const preloadProductImages = (products, options) => {
  const urls = (Array.isArray(products) ? products : [])
    .map(getProductImageUri)
    .filter(Boolean);

  return preloadImageUrls(urls, options);
};
