// Offline catalog regression: persisted data paints instantly, then updates
// from the existing endpoints; no backend credentials or live calls needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const { configureStore } = require('@reduxjs/toolkit');
const source = (file) => readFileSync(file, 'utf8');
const cache = new Map();
const calls = [];
const prefetchCalls = [];
const diskImages = new Set();
const platform = { OS: 'web' };
const expoImage = { Image: {
  prefetch: async (url) => { prefetchCalls.push(url); diskImages.add(url); return true; },
  getCachePathAsync: async (url) => diskImages.has(url) ? `/cached/${encodeURIComponent(url)}` : null,
} };
let nextData = [];
let resolvePending = null;
const api = {
  get: async (_url, config) => {
    calls.push(config.params);
    if (resolvePending) {
      const promise = new Promise((resolve) => { pendingRequest = resolve; });
      resolvePending();
      return promise;
    }
    return { data: nextData };
  },
};
let pendingRequest = null;
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = babel.transformSync(source(file), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const mockedRequire = (name) => {
    if (name === './axiosInstance') return api;
    if (name === 'expo-image') return expoImage;
    if (name === 'react-native') return { Platform: platform, StyleSheet: { create: (styles) => styles } };
    if (name.startsWith('./') || name.startsWith('../')) {
      const parts = file.split('/'); parts.pop();
      for (const segment of name.split('/')) {
        if (segment === '..') parts.pop();
        else if (segment !== '.') parts.push(segment);
      }
      return load(parts.join('/') + '.js');
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(mockedRequire, module, module.exports);
  return module.exports;
}
const products = load('redux/slice/productSlice.js');
const { refreshCatalog } = load('utils/catalogRefresh.js');
const { resolveProductImageUri, getProductImageUri, preloadProductImages, preloadImage, markImageCached } = load('utils/ImageCache.js');
const old = { productID: 'old', status: '1', dateCreated: '2022-01-01', productImage: 'old.jpg' };
const latest = { productID: 'new', status: '1', dateCreated: '2026-10-09', productImage: 'new.jpg' };
const store = configureStore({ reducer: products.default, preloadedState: {
  ...products.default(undefined, { type: 'init' }), products: [old], productsByCategory: { phones: [old] },
}});
assert.deepEqual(store.getState().products.map((p) => p.productID), ['old']);
resolvePending = () => { resolvePending = null; };
const first = refreshCatalog(store.dispatch, 'products:all', products.fetchProducts);
const same = refreshCatalog(store.dispatch, 'products:all', products.fetchProducts);
assert.strictEqual(first, same, 'Only one fetch per catalog key should be in flight');
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(store.getState().products.map((p) => p.productID), ['old'], 'Cached list must remain visible during refresh');
assert.ok(pendingRequest);
pendingRequest({ data: [old, latest] });
await first;
assert.deepEqual(store.getState().products.map((p) => p.productID), ['new', 'old']);
assert.ok(calls[0]._fresh, 'Network URL should bypass a stale HTTP cache');
assert.equal(calls[0].endpoint, '/Product/Product-Get');
assert.equal(await refreshCatalog(store.dispatch, 'products:all', products.fetchProducts), null, 'Recent fetch should be throttled');

// A later update replaces removed items and preserves catalog isolation.
nextData = [latest];
await refreshCatalog(store.dispatch, 'products:all', products.fetchProducts, { force: true });
assert.deepEqual(store.getState().products.map((p) => p.productID), ['new']);
nextData = [old];
await store.dispatch(products.fetchProductsByBrand('brand-id'));
assert.deepEqual(store.getState().products.map((p) => p.productID), ['new']);
assert.deepEqual(store.getState().productsByBrand['brand-id'].map((p) => p.productID), ['old']);
nextData = [latest];
await store.dispatch(products.fetchProductsByCategory('phones'));
assert.deepEqual(store.getState().productsByCategory.phones.map((p) => p.productID), ['new']);
nextData = [old];
await store.dispatch(products.fetchPaginatedProducts({ pageNumber: 1 }));
assert.deepEqual(store.getState().products.map((p) => p.productID), ['new']);
assert.deepEqual(store.getState().paginatedProducts.map((p) => p.productID), ['old']);

// Refresh product records as usual, but a picture must keep the same cache
// key across catalog requests, visits, and elapsed time.
const uri = resolveProductImageUri('new.jpg', latest);
assert.equal(uri, resolveProductImageUri('new.jpg', latest));
assert.equal(uri, 'https://testing.frankotrading.com/Media/Products_Images/new.jpg');
assert.equal(getProductImageUri({ imagePath: 'D:\\Media\\Products_Images\\db-only.jpg' }), resolveProductImageUri('db-only.jpg'));
assert.equal(getProductImageUri({ ProductImage: 'database.jpg' }), resolveProductImageUri('database.jpg'));
assert.equal(getProductImageUri({ productImage: 'data:image/png;base64,YQ==' }), 'data:image/png;base64,YQ==');
const now = Date.now;
try {
  Date.now = () => now() + 60 * 60 * 1000;
  assert.equal(uri, resolveProductImageUri('new.jpg', latest), 'Time alone must never invalidate an image');
} finally { Date.now = now; }
const revised = resolveProductImageUri('new.jpg', { imageVersion: 'v2' });
assert.notEqual(uri, revised, 'An explicit image revision must bust the old cache');
assert.equal(revised, resolveProductImageUri('new.jpg', { imageVersion: 'v2' }));
assert.notEqual(revised, resolveProductImageUri('different.jpg', { imageVersion: 'v2' }));
assert.notEqual(resolveProductImageUri('new.jpg', { dateModified: '2026-10-09' }),
  resolveProductImageUri('new.jpg', { dateModified: '2026-10-10' }), 'A changed API modification date invalidates a replaced image');
assert.deepEqual(await preloadProductImages([{ imagePath: 'db-only.jpg' }], { maxImages: 1 }), [true]);
const prefetchedUri = getProductImageUri({ imagePath: 'db-only.jpg' });
assert.deepEqual(prefetchCalls, [prefetchedUri]);
await preloadProductImages([{ imagePath: 'db-only.jpg' }]);
assert.deepEqual(prefetchCalls, [prefetchedUri], 'Repeated lists must not prefetch the same image twice');
markImageCached(uri); // An already-rendered image needs no speculative prefetch.
await preloadImage(uri);
assert.deepEqual(prefetchCalls, [prefetchedUri]);
// Reopening the app clears JS memory, but native prefetch must use its disk copy.
platform.OS = 'android';
cache.delete('utils/ImageCache.js');
const restartedCache = load('utils/ImageCache.js');
await restartedCache.preloadImage(prefetchedUri);
assert.deepEqual(prefetchCalls, [prefetchedUri], 'Native restart should hit disk without a network prefetch');
await restartedCache.preloadImage(revised);
assert.deepEqual(prefetchCalls, [prefetchedUri, revised], 'A new image revision should download once');
platform.OS = 'web';
assert.match(source('components/CachedImage.js'), /onLoad=\{onImageLoad\}/);
assert.match(source('components/CachedImage.js'), /markImageCached\(source\.uri\)/);
assert.match(source('screens/shop/SearchScreen.js').split("from 'react-native'")[0], /useWindowDimensions/, 'Search must import its layout hook');
assert.match(source('utils/Invoicepdf.js'), /pdf-lib\/dist\/pdf-lib\.esm\.js/);
const webStyles = load('theme/webSafeStyles.js').createWebSafeStyles({
  card: { shadowColor: '#086942', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
});
assert.ok(webStyles.card.boxShadow.includes('rgba(8, 105, 66, 0.2)'));
assert.equal('shadowColor' in webStyles.card, false);
console.log('Catalog checks passed (stale-while-revalidate, new products, deduplication, cache-busting, isolated lists, image revisions, Search and PDF imports).');
