import React, { memo, useMemo } from "react";
import { Image as ExpoImage } from "expo-image";

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
 * the prefetch helper in utils/imageCache.js.
 */
const CachedImage = memo(
  ({
    source,
    resizeMode,
    resizeMethod: _resizeMethod,
    contentFit,
    cachePolicy = "memory-disk",
    transition = 0,
    ...props
  }) => {
    const resolvedContentFit = useMemo(
      () => contentFit || CONTENT_FIT_BY_RESIZE_MODE[resizeMode] || "cover",
      [contentFit, resizeMode]
    );

    return (
      <ExpoImage
        {...props}
        source={source}
        contentFit={resolvedContentFit}
        cachePolicy={cachePolicy}
        transition={transition}
      />
    );
  }
);

CachedImage.displayName = "CachedImage";

export default CachedImage;
