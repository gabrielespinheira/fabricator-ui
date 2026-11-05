import * as React from "react"
import {
  ArrowUpIcon,
  CalendarIcon,
  CircleDotIcon,
  FlagIcon,
  IconProvider,
  TagIcon,
  UserIcon,
  type IconProps,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"
import { useCSSVariable } from "uniwind"

import { AppShellPanelView } from "@/registry/native/ui/app-shell"
import { Avatar, AvatarFallback } from "@/registry/native/ui/avatar"
import { Badge } from "@/registry/native/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/native/ui/input-group"
import { Progress } from "@/registry/native/ui/progress"
import { Separator } from "@/registry/native/ui/separator"
import { Text } from "@/registry/native/ui/text"

type Person = { name: string; initials: string }

const GABS: Person = { name: "Gabs Fabricator", initials: "GF" }
const MAYA: Person = { name: "Maya Lin", initials: "ML" }
const NOAH: Person = { name: "Noah Reis", initials: "NR" }

const ACTIVITY = [
  { who: MAYA, did: "moved this to In progress", when: "2 hours ago" },
  { who: NOAH, did: "added the Mobile label", when: "Yesterday at 16:20" },
  { who: GABS, did: "set the due date to Nov 28", when: "Yesterday at 11:05" },
  { who: GABS, did: "created this page", when: "Monday at 09:41" },
]

const INITIAL_COMMENTS = [
  {
    id: "first",
    who: MAYA,
    when: "2 hours ago",
    body: "Design is signed off. Only the empty states are left.",
  },
  {
    id: "second",
    who: NOAH,
    when: "Yesterday",
    body: "Can we ship the tab bar change in the same release?",
  },
]

function PersonAvatar({ person }: { person: Person }) {
  return (
    <Avatar size="sm">
      <AvatarFallback>{person.initials}</AvatarFallback>
    </Avatar>
  )
}

/** A property: its icon and name on the left, its value on the right. */
function PropertyRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<IconProps>
  label: string
  children: React.ReactNode
}) {
  const color = useCSSVariable("--muted-foreground")
  return (
    <View className="min-h-11 flex-row items-center justify-between gap-4">
      <View className="flex-row items-center gap-2">
        <IconProvider
          size={16}
          color={typeof color === "string" ? color : undefined}
        >
          <Icon />
        </IconProvider>
        <Text className="text-(length:--density-text-13) text-muted-foreground">
          {label}
        </Text>
      </View>
      <View className="shrink flex-row flex-wrap items-center justify-end gap-1.5">
        {children}
      </View>
    </View>
  )
}

function DetailsView({ title }: { title: string }) {
  return (
    <View className="gap-5 px-(--density-16) pt-2 pb-8">
      <View className="gap-1">
        <Text role="heading" className="text-lg font-semibold text-foreground">
          {title}
        </Text>
        <Text className="text-(length:--density-text-13) text-muted-foreground">
          Who owns this page, where it stands and what's left.
        </Text>
      </View>
      <View>
        <PropertyRow icon={CircleDotIcon} label="Status">
          <Badge variant="info">In progress</Badge>
        </PropertyRow>
        <Separator />
        <PropertyRow icon={UserIcon} label="Owner">
          <PersonAvatar person={MAYA} />
          <Text className="text-(length:--density-text-13) text-foreground">
            {MAYA.name}
          </Text>
        </PropertyRow>
        <Separator />
        <PropertyRow icon={FlagIcon} label="Priority">
          <Text className="text-(length:--density-text-13) text-foreground">
            High
          </Text>
        </PropertyRow>
        <Separator />
        <PropertyRow icon={CalendarIcon} label="Due">
          <Text className="text-(length:--density-text-13) text-foreground">
            Nov 28
          </Text>
        </PropertyRow>
        <Separator />
        <PropertyRow icon={TagIcon} label="Labels">
          <Badge variant="outline">Launch</Badge>
          <Badge variant="outline">Mobile</Badge>
        </PropertyRow>
      </View>
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-(length:--density-text-13) font-medium text-foreground">
            Progress
          </Text>
          <Text className="text-(length:--density-text-13) text-muted-foreground">
            7 of 11 tasks
          </Text>
        </View>
        <Progress value={64} accessibilityLabel="Progress" />
      </View>
    </View>
  )
}

function ActivityView() {
  return (
    <View className="px-(--density-16) pt-2 pb-8">
      {ACTIVITY.map((entry, index) => (
        <View key={entry.did} className="flex-row gap-3">
          <View className="items-center">
            <PersonAvatar person={entry.who} />
            {index < ACTIVITY.length - 1 ? (
              <View className="my-1 w-px flex-1 bg-border" />
            ) : null}
          </View>
          <View className="flex-1 gap-0.5 pb-6">
            <Text className="text-(length:--density-text-13) text-foreground">
              <Text className="text-(length:--density-text-13) font-medium text-foreground">
                {entry.who.name}
              </Text>{" "}
              {entry.did}
            </Text>
            <Text className="text-(length:--density-text-12) text-muted-foreground">
              {entry.when}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function CommentsView() {
  const [comments, setComments] = React.useState(INITIAL_COMMENTS)
  const [draft, setDraft] = React.useState("")
  const body = draft.trim()
  const send = () => {
    if (!body) return
    setComments((current) => [
      ...current,
      { id: String(current.length), who: GABS, when: "Just now", body },
    ])
    setDraft("")
  }
  return (
    <View className="gap-5 px-(--density-16) pt-2 pb-8">
      {comments.map((comment) => (
        <View key={comment.id} className="flex-row gap-3">
          <PersonAvatar person={comment.who} />
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-(length:--density-text-13) font-medium text-foreground">
                {comment.who.name}
              </Text>
              <Text className="text-(length:--density-text-12) text-muted-foreground">
                {comment.when}
              </Text>
            </View>
            <Text className="text-(length:--density-text-13) text-foreground">
              {comment.body}
            </Text>
          </View>
        </View>
      ))}
      <InputGroup>
        <InputGroupInput
          accessibilityLabel="Add a comment"
          placeholder="Add a comment"
          value={draft}
          onChangeText={setDraft}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            variant="default"
            size="icon-xs"
            accessibilityLabel="Send comment"
            disabled={!body}
            onPress={send}
          >
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </View>
  )
}

/** The panel's three views, with what a real page would show in them. */
export function PanelViews({ title }: { title: string }) {
  return (
    <>
      <AppShellPanelView value="details">
        <DetailsView title={title} />
      </AppShellPanelView>
      <AppShellPanelView value="activity">
        <ActivityView />
      </AppShellPanelView>
      <AppShellPanelView value="comments">
        <CommentsView />
      </AppShellPanelView>
    </>
  )
}
