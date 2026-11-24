import {
  BookingComIcon,
  FigmaIcon,
  GithubIcon,
  LinearIcon,
  NotionIcon,
  StripeIcon,
  VercelIcon,
  type BrandIconComponent,
} from "@fabricator-ui/icons/brands"

import { type MailContact } from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"

// Companies are their logo, people their photo or coloured initials.
const BRANDS: Record<string, BrandIconComponent> = {
  booking: BookingComIcon,
  figma: FigmaIcon,
  github: GithubIcon,
  linear: LinearIcon,
  notion: NotionIcon,
  stripe: StripeIcon,
  vercel: VercelIcon,
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/** One hue per person, with text that reads on it in both themes. */
function getInitialsStyle(id: string) {
  const hue = [...id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
  return {
    background: `oklch(0.88 0.06 ${(hue * 47) % 360})`,
    color: `oklch(0.36 0.09 ${(hue * 47) % 360})`,
  }
}

export function MailAvatar({
  contact,
  size = "default",
  className,
}: {
  contact: MailContact | undefined
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const name = contact?.name ?? "Unknown sender"
  const Brand = contact?.brand ? BRANDS[contact.brand] : undefined

  if (Brand) {
    return (
      <Avatar size={size} className={className}>
        {/* A quiet tile: the logo brings the colour. */}
        <AvatarFallback className="bg-muted [&_svg]:size-1/2">
          <Brand color="brand" aria-hidden />
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar size={size} className={className}>
      {contact?.avatar && <AvatarImage src={contact.avatar} alt="" />}
      <AvatarFallback
        style={
          contact && !contact.avatar ? getInitialsStyle(contact.id) : undefined
        }
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
