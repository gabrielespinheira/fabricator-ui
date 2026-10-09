import { type Metadata } from "next"

import { SITE_BLOCK_STYLE } from "@/lib/site-style"
import { BlockDisplay } from "@/components/block-display"
import { getStyle } from "@/registry/_legacy-styles"

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  alternates: {
    canonical: "/blocks",
  },
}

const FEATURED_BLOCKS = ["sidebar-07", "sidebar-03", "login-03", "login-04"]

export default async function BlocksPage() {
  const activeStyle = getStyle(SITE_BLOCK_STYLE)!

  return (
    <div className="flex flex-col gap-12 md:gap-24">
      {FEATURED_BLOCKS.map((name) => (
        <BlockDisplay name={name} key={name} styleName={activeStyle.name} />
      ))}
    </div>
  )
}
