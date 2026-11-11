import { notFound } from "next/navigation"

export default async function DesktopNewTabPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^new-\d+$/.test(id)) notFound()
  return null
}
