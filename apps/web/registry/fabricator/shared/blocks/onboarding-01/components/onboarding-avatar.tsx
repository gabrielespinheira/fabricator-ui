import {
  ONBOARDING_COLLEAGUES,
  ONBOARDING_OWNER,
  type OnboardingPerson,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"

/** Someone we know, or the first letter of an address. */
export function findOnboardingPerson(email: string): OnboardingPerson {
  return (
    [ONBOARDING_OWNER, ...ONBOARDING_COLLEAGUES].find(
      (person) => person.email === email
    ) ?? { name: email, email }
  )
}

function getInitials(name: string) {
  const words = name.split(/\s+/).slice(0, 2)
  return words.map((word) => word.charAt(0).toUpperCase()).join("")
}

// A stable hue, so people without a photo differ from each other.
function getHue(email: string) {
  return (
    [...email].reduce((sum, letter) => sum + letter.charCodeAt(0) * 7, 0) % 360
  )
}

export function OnboardingAvatar({
  person,
  size = "sm",
  className,
}: {
  person: OnboardingPerson
  size?: "sm" | "default"
  className?: string
}) {
  const hue = getHue(person.email)
  return (
    <Avatar size={size} className={className}>
      {person.photo && <AvatarImage src={person.photo} alt="" />}
      <AvatarFallback
        style={{
          background: `oklch(0.88 0.06 ${hue})`,
          color: `oklch(0.36 0.09 ${hue})`,
        }}
      >
        {getInitials(person.name)}
      </AvatarFallback>
    </Avatar>
  )
}
