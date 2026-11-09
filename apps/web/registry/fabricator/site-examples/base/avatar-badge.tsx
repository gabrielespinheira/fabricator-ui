import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/styles/base-nova/ui/avatar"

export function AvatarWithBadge() {
  return (
    <Avatar>
      <AvatarImage
        src="https://github.com/gabrielespinheira.png"
        alt="@gabrielespinheira"
      />
      <AvatarFallback>CN</AvatarFallback>
      <AvatarBadge className="bg-success" />
    </Avatar>
  )
}
