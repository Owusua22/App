// A fast, provisional preview from catalog data the user already has. The
// brand endpoint remains authoritative and replaces this list when it returns.
const EMPTY_PRODUCTS = [];
const normalized = (value) => String(value ?? '').trim().toLowerCase();

export function getBrandCatalogPreview(catalog, brandId, brandName, maxItems = 80) {
  if (!brandId) return EMPTY_PRODUCTS;
  const name = normalized(brandName);
  const matches = (product) => {
    if (!product || (product.status != null && String(product.status) !== '1')) return false;
    const id = product.brandId ?? product.brandID ?? product.BrandId ?? product.BrandID;
    if (id != null && String(id).trim()) return normalized(id) === normalized(brandId);
    return Boolean(name) && normalized(product.brandName) === name;
  };
  const results = [];
  const seen = new Set();
  const append = (products) => {
    if (!Array.isArray(products)) return;
    for (const product of products) {
      if (results.length >= maxItems) break;
      const id = product?.productID;
      if (id == null || seen.has(String(id)) || !matches(product)) continue;
      seen.add(String(id));
      results.push(product);
    }
  };
  // Prefer complete/category listings to the 24-item page-one cache.
  Object.values(catalog?.productsByCategory || {}).forEach(append);
  Object.values(catalog?.productsByShowroom || {}).forEach(append);
  append(catalog?.products);
  append(catalog?.paginatedProducts);
  return results;
}
