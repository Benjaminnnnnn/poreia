import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import React, { useState } from "react";

export interface FadeImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Size (px) of the placeholder icon shown while loading. Defaults to 22.
   * Scale down for small/avatar contexts (e.g. 16), up for large covers (e.g. 28).
   */
  iconSize?: number;
}

/**
 * FadeImage — Google-style image placeholder + fade-in.
 *
 * Renders a shimmer skeleton with a centred photo icon while the browser
 * fetches the image, then cross-fades to the loaded image.
 *
 * Usage: place inside any `relative overflow-hidden` container that already
 * has defined dimensions. FadeImage fills it with `absolute inset-0`.
 *
 * ```tsx
 * <div className="relative h-48 w-full overflow-hidden rounded-xl">
 *   <FadeImage src={url} alt="description" />
 * </div>
 * ```
 */
const FadeImage: React.FC<FadeImageProps> = ({
  src,
  alt,
  className,
  iconSize = 22,
  loading = "lazy",
  onLoad,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    onLoad?.(e);
  };

  return (
    <>
      {/* Skeleton — shimmer wave + centred photo icon, visible until image loads.
          z-10 ensures this sits above any sibling overlays (e.g. gradient scrims)
          that the parent renders after FadeImage in the DOM. It unmounts once
          the image is ready so those overlays resume their normal stacking. */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="img-shimmer absolute inset-0 z-10 flex items-center justify-center"
        >
          <ImageIcon
            size={iconSize}
            strokeWidth={1.5}
            className="text-white/25"
          />
        </div>
      )}

      <img
        src={src}
        alt={alt ?? ""}
        loading={loading}
        onLoad={handleLoad}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </>
  );
};

export default FadeImage;
