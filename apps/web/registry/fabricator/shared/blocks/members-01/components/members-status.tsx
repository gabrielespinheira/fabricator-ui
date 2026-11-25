import { type InvitationStatus } from "@/registry/bases/__base__/blocks/members-01/lib/members-model"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const STATUSES: Record<
  InvitationStatus,
  { label: string; variant: "outline" | "warning" | "destructive" }
> = {
  pending: { label: "Pending", variant: "outline" },
  expired: { label: "Expired", variant: "warning" },
  undelivered: { label: "Not delivered", variant: "destructive" },
}

/** Where an invitation stands. People who joined carry no badge. */
export function MembersInvitationBadge({
  status,
}: {
  status: InvitationStatus
}) {
  return (
    <Badge variant={STATUSES[status].variant}>{STATUSES[status].label}</Badge>
  )
}

/** Two-factor as a shield and a word. */
export function MembersTwoFactor({ isOn }: { isOn: boolean }) {
  return isOn ? (
    <span className="inline-flex items-center gap-(--density-6) align-middle [&_svg]:size-(--density-icon-16)">
      <IconPlaceholder
        lucide="ShieldCheckIcon"
        tabler="IconShieldCheck"
        hugeicons="SecurityCheckIcon"
        phosphor="ShieldCheckIcon"
        remixicon="RiShieldCheckLine"
      />
      On
    </span>
  ) : (
    <span className="inline-flex items-center gap-(--density-6) align-middle text-warning-text [&_svg]:size-(--density-icon-16)">
      <IconPlaceholder
        lucide="ShieldOffIcon"
        tabler="IconShieldOff"
        hugeicons="ShieldBanIcon"
        phosphor="ShieldSlashIcon"
        remixicon="RiShieldLine"
      />
      Off
    </span>
  )
}
