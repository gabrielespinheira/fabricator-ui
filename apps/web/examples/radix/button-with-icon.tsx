import { GitBranchIcon } from "@fabricator-ui/icons"

import { Button } from "@/styles/radix-nova/ui/button"

export default function ButtonWithIcon() {
  return (
    <Button variant="outline" size="sm">
      <GitBranchIcon /> New Branch
    </Button>
  )
}
