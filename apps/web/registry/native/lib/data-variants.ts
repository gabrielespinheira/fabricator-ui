const DATA_VARIANT = /data-\[([a-z-]+)=([^\]]+)\]:/g

/**
 * The classes that apply to an element with these attributes, for reading a style
 * off a class string: `useResolveClassNames` can't see the element's props, so it
 * never matches `data-[…]:`. Conflicts are the caller's to merge.
 */
export function applyDataVariants(
  className: string,
  attributes: Record<string, unknown>
) {
  return className
    .split(/\s+/)
    .flatMap((token) => {
      let isMatch = true
      const applied = token.replace(DATA_VARIANT, (_, name, value) => {
        if (String(attributes[`data-${name}`]) !== value) isMatch = false
        return ""
      })
      return isMatch && applied !== "" ? [applied] : []
    })
    .join(" ")
}
