import { Image as ExpoImage } from "expo-image";

const PRODUCT_IMAGE_BASE_URL =
  "https://testing.frankotrading.com/Media/Products_Images";
const prefetchedUrls = new Set();
const prefetchingUrls = new Map();

export const resolveProductImageUri = (imagePath) => {
  if (typeof imagePath !== "string" || !imagePath.trim()) return null;
  const normalizedPath = imagePath.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
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
  return `${PRODUCT_IMAGE_BASE_URL}/${encodedName}`;
};

/** Prefetch one remote image into Expo Image's memory/disk cache. */
export const preloadImage = (url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return Promise.resolve(false);
  }
  if (prefetchedUrls.has(url)) return Promise.resolve(true);
  if (prefetchingUrls.has(url)) return prefetchingUrls.get(url);
  const request = ExpoImage.prefetch(url, "memory-disk")
    .then((success) => {
      if (success) prefetchedUrls.add(url);
      return Boolean(success);
    })
    .catch(() => false)
    .finally(() => prefetchingUrls.delete(url));

  prefetchingUrls.set(url, request);
  return request;
};

/**
 * Warm a small, prioritized batch without flooding the network. Call after the
 * product data is available; this intentionally does not block rendering.
 */
export const preloadImageUrls = async (
  urls,
  { maxImages = 8, concurrency = 3 } = {}
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
        results[index] = await preloadImage(queue[index]);
      }
    })
  );

  return results;
};

export const preloadProductImages = (products, options) => {
  const urls = (Array.isArray(products) ? products : [])
    .map((product) =>
      resolveProductImageUri(
        product?.productImage ??
          product?.imagePath ??
          product?.imageUrl ??
          product?.imageURL ??
          product?.image
      )
    )
    .filter(Boolean);

  return preloadImageUrls(urls, options);
};
