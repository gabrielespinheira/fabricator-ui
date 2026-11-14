import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/styles/aria-fabricator/ui/avatar"

export default function AvatarDemo() {
  return (
    <div className="flex flex-row flex-wrap items-center gap-6 md:gap-12">
      <Avatar>
        <AvatarImage
          src="https://github.com/gabrielespinheira.png"
          alt="@gabrielespinheira"
        />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage
          src="https://github.com/evilrabbit.png"
          alt="@evilrabbit"
        />
        <AvatarFallback>ER</AvatarFallback>
        <AvatarBadge className="bg-success" />
      </Avatar>
      <AvatarGroup>
        <Avatar tooltip="Gabriel Espinheira">
          <AvatarImage src="https://github.com/gabrielespinheira.png" alt="" />
          <AvatarFallback>GE</AvatarFallback>
        </Avatar>
        <Avatar tooltip="Max Leiter">
          <AvatarImage src="https://github.com/maxleiter.png" alt="" />
          <AvatarFallback>ML</AvatarFallback>
        </Avatar>
        <Avatar tooltip="Evil Rabbit">
          <AvatarImage src="https://github.com/evilrabbit.png" alt="" />
          <AvatarFallback>ER</AvatarFallback>
        </Avatar>
        <Avatar tooltip="Ana Costa">
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    </div>
  )
}
