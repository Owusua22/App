import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { notifyScrollActivity } from '../utils/scrollActivity';

// Only a visit to ProductDetails can create a pending restore. Nothing is
// stored on disk, so a fresh app launch or a first visit ALWAYS starts at top.
const returningPositions = new Map();

export function useCatalogScroll(screenKey) {
  const listRef = useRef(null);
  const offsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const restoreRef = useRef(null);

  const tryRestore = useCallback(() => {
    if (restoreRef.current == null || !listRef.current || contentHeightRef.current <= 0) return;
    const offset = restoreRef.current;
    restoreRef.current = null;
    returningPositions.delete(screenKey);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset, animated: false }));
  }, [screenKey]);

  useFocusEffect(useCallback(() => {
    const saved = returningPositions.get(screenKey);
    if (saved != null) {
      restoreRef.current = saved;
      tryRestore();
    }
  }, [screenKey, tryRestore]));

  const onScroll = useCallback((event) => {
    offsetRef.current = Math.max(0, event.nativeEvent.contentOffset.y);
    notifyScrollActivity();
  }, []);
  const onContentSizeChange = useCallback((_, height) => {
    contentHeightRef.current = height;
    tryRestore();
  }, [tryRestore]);
  const rememberPosition = useCallback(() => {
    returningPositions.set(screenKey, offsetRef.current);
  }, [screenKey]);

  return { listRef, onScroll, onContentSizeChange, rememberPosition };
}
