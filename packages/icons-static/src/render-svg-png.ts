export class MissingRendererError extends Error {
  override name = "MissingRendererError"
}

function isModuleNotFound(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ERR_MODULE_NOT_FOUND"
  )
}

async function loadResvg() {
  try {
    return (await import("@resvg/resvg-js")).Resvg
  } catch (error) {
    if (!isModuleNotFound(error)) throw error
    throw new MissingRendererError(
      "PNG export needs @resvg/resvg-js: install it next to @fabricator-ui/icons-static"
    )
  }
}

/** Rasterizes canonical SVG artwork without loading the generated icon catalog. */
export async function renderSvgPng(svg: string, pixelSize: number) {
  const Resvg = await loadResvg()
  return new Resvg(svg, {
    fitTo: { mode: "width", value: pixelSize },
    // Icon artwork has no text; rescanning host fonts adds work and host dependence.
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng()
}
