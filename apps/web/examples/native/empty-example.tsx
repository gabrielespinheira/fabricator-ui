import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  FolderIcon,
  InboxIcon,
  PlusIcon,
} from "@fabricator-ui/icons-react-native"

import { Avatar, AvatarFallback } from "@/registry/native/ui/avatar"
import { Button } from "@/registry/native/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/native/ui/empty"

function EmptyExample() {
  return (
    <ExampleWrapper>
      <Example title="Media: icon" className="p-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderIcon />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              You haven't created any projects yet. Get started by creating your
              first one.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button>Create project</Button>
            <Button variant="outline">Import</Button>
          </EmptyContent>
        </Empty>
      </Example>
      <Example title="Media: default" className="p-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="default">
              <Avatar size="lg">
                <AvatarFallback>GE</AvatarFallback>
              </Avatar>
            </EmptyMedia>
            <EmptyTitle>No team members</EmptyTitle>
            <EmptyDescription>
              Invite your team to collaborate on this project.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">
              <PlusIcon />
              Invite members
            </Button>
          </EmptyContent>
        </Empty>
      </Example>
      <Example title="Outlined" className="bg-transparent p-0 shadow-none">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing in your inbox</EmptyTitle>
            <EmptyDescription>New messages land here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Example>
    </ExampleWrapper>
  )
}

export { EmptyExample }
