import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/styles/aria-nova/ui/avatar"

export default function AvatarDemo() {
  return (
    <Avatar>
      <AvatarImage
        src="https://github.com/gabrielespinheira.png"
        alt="@gabrielespinheira"
        className="grayscale"
      />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
