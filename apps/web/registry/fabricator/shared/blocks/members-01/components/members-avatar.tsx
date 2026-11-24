import {
  getAvatarHue,
  getInitials,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** A person's photo or initials in their own colour; an envelope until they join. */
export function MembersAvatar({
  row,
  size,
  className,
}: {
  row: TeamRow
  size?: "default" | "lg"
  className?: string
}) {
  if (row.kind === "invitation") {
    return (
      <Avatar size={size} className={className}>
        <AvatarFallback className="[&_svg]:size-(--density-icon-16)">
          <IconPlaceholder
            lucide="MailIcon"
            tabler="IconMail"
            hugeicons="Mail01Icon"
            phosphor="EnvelopeIcon"
            remixicon="RiMailLine"
          />
        </AvatarFallback>
      </Avatar>
    )
  }
  const hue = getAvatarHue(row.id)
  return (
    <Avatar size={size} className={className}>
      {row.photo && <AvatarImage src={row.photo} alt="" />}
      <AvatarFallback
        style={{
          background: `oklch(0.88 0.06 ${hue})`,
          color: `oklch(0.36 0.09 ${hue})`,
        }}
      >
        {getInitials(row.name)}
      </AvatarFallback>
    </Avatar>
  )
}
