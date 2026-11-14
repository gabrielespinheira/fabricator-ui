import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/styles/base-nova/ui/avatar"

export default function AvatarDemo() {
  return (
    <Avatar>
      <AvatarImage
        src="https://github.com/gabrielespinheira.png"
        alt="@gabrielespinheira"
      />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
