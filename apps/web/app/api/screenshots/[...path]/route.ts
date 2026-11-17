import { z } from "zod"

import screenshotAttachments from "../../../../../../docs/screenshot-attachments.json"

const screenshotPaths = z.object({
  path: z.array(z.string().regex(/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/)).min(1),
})
const attachments: Readonly<Record<string, { url: string; sha256: string }>> =
  screenshotAttachments

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const parsed = screenshotPaths.safeParse(await context.params)
  if (!parsed.success) return new Response(null, { status: 400 })

  const attachment =
    attachments[`apps/web/public/${parsed.data.path.join("/")}`]
  if (!attachment) return new Response(null, { status: 404 })

  // Follow GitHub's short-lived storage redirect before Next Image reads bytes.
  const response = await fetch(attachment.url, {
    redirect: "follow",
    next: { revalidate: 86400 },
  })
  const contentType = response.headers.get("Content-Type")
  if (!response.ok || !contentType?.startsWith("image/")) {
    return new Response(null, { status: 502 })
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
