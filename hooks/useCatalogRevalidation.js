import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { CATALOG_MAX_AGE_MS, refreshCatalog } from '../utils/catalogRefresh';

// Cached products remain visible while a fresh copy is fetched. One request per
// key is shared across the home shelves and listing screens. Focus, foreground
// and an interval cover browsing, returning to the app and staying on a page.
export function useCatalogRevalidation(key, makeAction, { enabled = true, maxAgeMs = CATALOG_MAX_AGE_MS, onResult } = {}) {
  const dispatch = useDispatch();
  const [fetching, setFetching] = useState(false);
  const actionRef = useRef(makeAction);
  const resultRef = useRef(onResult);
  actionRef.current = makeAction;
  resultRef.current = onResult;

  useFocusEffect(useCallback(() => {
    if (!enabled || !key) return undefined;
    let focused = true;
    const revalidate = () => {
      const request = refreshCatalog(dispatch, key, () => actionRef.current(), { maxAgeMs });
      if (!request) {
        resultRef.current?.(null); // A recent shared fetch may already be cached.
        return;
      }
      setFetching(true);
      void request
        .then((result) => { if (focused) resultRef.current?.(result); })
        .catch(() => { /* Preserve the last good catalog offline. */ })
        .finally(() => { if (focused) setFetching(false); });
    };
    revalidate();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') revalidate();
    });
    const timer = setInterval(revalidate, Math.max(10_000, Math.floor(maxAgeMs / 2)));
    return () => { focused = false; clearInterval(timer); subscription?.remove?.(); setFetching(false); };
  }, [dispatch, key, enabled, maxAgeMs]));
  return fetching;
}
