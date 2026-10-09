import React, { memo, useCallback, useMemo } from "react";
import { Image as ExpoImage } from "expo-image";
import { markImageCached } from '../utils/ImageCache';

const CONTENT_FIT_BY_RESIZE_MODE = {
  cover: "cover",
  contain: "contain",
  stretch: "fill",
  center: "none",
  repeat: "cover",
};

/**
 * Shared Expo Image wrapper for remote and bundled app images.
 * Remote images use Expo Image's memory + disk cache, which is shared with
 * the prefetch helper in utils/ImageCache.js.
 */
const CachedImage = memo(
  ({
    source,
    resizeMode,
    resizeMethod: _resizeMethod,
    contentFit,
    cachePolicy = "memory-disk",
    transition = 0,
    placeholder,
    onLoad,
    ...props
  }) => {
    const resolvedContentFit = useMemo(
      () => contentFit || CONTENT_FIT_BY_RESIZE_MODE[resizeMode] || "cover",
      [contentFit, resizeMode]
    );
    const onImageLoad = useCallback((event) => {
      if (source?.uri) markImageCached(source.uri);
      onLoad?.(event);
    }, [source?.uri, onLoad]);

    return (
      <ExpoImage
        {...props}
        source={source}
        placeholder={placeholder === undefined && source?.uri ? require("../assets/frankoIcon.png") : placeholder}
        placeholderContentFit="contain"
        contentFit={resolvedContentFit}
        cachePolicy={cachePolicy}
        onLoad={onImageLoad}
        transition={transition}
      />
    );
  }
);

CachedImage.displayName = "CachedImage";

export default CachedImage;
