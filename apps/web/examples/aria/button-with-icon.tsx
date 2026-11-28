import { GitBranchIcon, GitForkIcon } from "@fabricator-ui/icons"

import { Button } from "@/styles/aria-nova/ui/button"

export default function ButtonWithIcon() {
  return (
    <div className="flex gap-2">
      <Button variant="outline">
        <GitBranchIcon data-icon="inline-start" /> New Branch
      </Button>
      <Button variant="outline">
        Fork
        <GitForkIcon data-icon="inline-end" />
      </Button>
    </div>
  )
}
