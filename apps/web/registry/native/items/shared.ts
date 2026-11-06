export const docs = (name: string) => ({
  links: {
    docs: `https://fabricator-ui.vercel.app/docs/components/native/${name}`,
  },
})

/** Every overlay brings these with the component. */
export const OVERLAY_REGISTRY_DEPENDENCIES = [
  "@fabricator/button",
  "@fabricator/density",
  "@fabricator/motion",
  "@fabricator/render",
  "@fabricator/text",
]
