import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/styles/aria-fabricator/ui/avatar"

const MEMBERS = [
  {
    name: "Gabriel Espinheira",
    src: "https://github.com/gabrielespinheira.png",
    initials: "GE",
  },
  {
    name: "Max Leiter",
    src: "https://github.com/maxleiter.png",
    initials: "ML",
  },
  {
    name: "Evil Rabbit",
    src: "https://github.com/evilrabbit.png",
    initials: "ER",
  },
  { name: "Ana Costa", initials: "AC" },
]

export function AvatarGroupTooltipExample() {
  return (
    <AvatarGroup>
      {MEMBERS.map((member) => (
        <Avatar key={member.name} tooltip={member.name}>
          {member.src ? <AvatarImage src={member.src} alt="" /> : null}
          <AvatarFallback>{member.initials}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  )
}
