import { PlusIcon } from "@fabricator-ui/icons"

import { Button } from "@/styles/aria-nova/ui/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/styles/aria-nova/ui/button-group"

export default function ButtonGroupSplit() {
  return (
    <ButtonGroup>
      <Button variant="secondary">Button</Button>
      <ButtonGroupSeparator />
      <Button size="icon" variant="secondary">
        <PlusIcon />
      </Button>
    </ButtonGroup>
  )
}
