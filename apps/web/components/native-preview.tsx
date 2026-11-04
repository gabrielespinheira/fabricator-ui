/** A screenshot of a component on a phone: the website can't render React Native. */
export function NativePreview({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="not-typeset my-6 flex justify-center rounded-xl bg-muted p-6">
      <img
        src={src}
        alt={alt}
        width={430}
        height={724}
        loading="lazy"
        className="h-auto w-full max-w-[280px] rounded-3xl shadow-surface-3"
      />
    </figure>
  )
}
