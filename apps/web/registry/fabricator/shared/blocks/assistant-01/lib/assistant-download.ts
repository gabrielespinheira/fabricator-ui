/** Saves text as a file on the person's device. */
export function downloadAssistantFile(
  name: string,
  type: string,
  text: string
) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
