import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/** A person or a group: their picture, or initials, and a dot while online. */
export function MessengerAvatar({
  name,
  src,
  isOnline = false,
  size = "default",
  className,
}: {
  name: string
  src?: string
  isOnline?: boolean
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
      {isOnline && (
        <AvatarBadge role="img" aria-label="Online" className="bg-success" />
      )}
    </Avatar>
  )
}
