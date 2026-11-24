import type { ComponentProps } from "react"

type ImageProps = Omit<ComponentProps<"img">, "src"> & {
  src: string | { src: string; width?: number; height?: number }
  fill?: boolean
  priority?: boolean
  quality?: number
  placeholder?: string
  blurDataURL?: string
  unoptimized?: boolean
}

function Image({
  src,
  fill,
  priority,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  unoptimized: _unoptimized,
  style,
  alt,
  ...props
}: ImageProps) {
  return (
    <img
      src={typeof src === "string" ? src : src.src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...style,
            }
          : style
      }
      {...props}
    />
  )
}

export { Image as default }
