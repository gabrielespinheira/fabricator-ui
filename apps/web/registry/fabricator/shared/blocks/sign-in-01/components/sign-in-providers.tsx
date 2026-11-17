import { AppleIcon, GoogleIcon } from "@fabricator-ui/icons/brands"

import { Button } from "@/registry/bases/__base__/ui/button"

// Each provider starts its own redirect flow; wire `onSelect` to your auth
// library's social sign-in.
const providers = [
  { id: "google", label: "Continue with Google", Icon: GoogleIcon },
  { id: "apple", label: "Continue with Apple", Icon: AppleIcon },
] as const

export type SignInProvider = (typeof providers)[number]["id"]

export function SignInProviders({
  onSelect,
}: {
  onSelect: (provider: SignInProvider) => void
}) {
  return (
    <div className="flex flex-col gap-(--density-8)">
      {providers.map(({ id, label, Icon }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onSelect(id)}
        >
          <Icon color="brand" data-icon="inline-start" />
          {label}
        </Button>
      ))}
    </div>
  )
}
