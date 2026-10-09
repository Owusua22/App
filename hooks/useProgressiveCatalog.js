import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BATCH_SIZE = 12;
// Visible batch counts survive a details -> back navigation when a native
// navigator detaches and remounts a list. No product data is duplicated here.
const batchCounts = new Map();

/** The API returns a complete category/brand result; mount its cards in small
 * batches as the user reaches the end. Never claim this paginates the backend. */
export function useProgressiveCatalog(products, key) {
  const [batch, setBatch] = useState(() => ({ key, limit: batchCounts.get(key) || BATCH_SIZE }));
  const limit = batch.key === key ? batch.limit : (batchCounts.get(key) || BATCH_SIZE);
  const pending = useRef(false);
  useEffect(() => { batchCounts.set(key, limit); pending.current = false; }, [key, limit]);
  const visibleProducts = useMemo(() => products.slice(0, limit), [products, limit]);
  const showMore = useCallback(() => {
    if (pending.current || limit >= products.length) return;
    pending.current = true;
    setBatch((current) => ({ key, limit: Math.min(products.length, (current.key === key ? current.limit : (batchCounts.get(key) || BATCH_SIZE)) + BATCH_SIZE) }));
  }, [key, limit, products.length]);
  return { visibleProducts, showMore, hasMore: visibleProducts.length < products.length };
}
