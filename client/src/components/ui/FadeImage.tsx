import { cn } from "@/lib/utils";
import React, { useState } from "react";

export interface FadeImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {}

const FadeImage: React.FC<FadeImageProps> = ({
  src,
  alt,
  className,
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
  );
};

export default FadeImage;
