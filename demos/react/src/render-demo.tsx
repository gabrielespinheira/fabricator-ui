import {
  Component,
  lazy,
  Suspense,
  useMemo,
  type MouseEvent,
  type ReactNode,
} from "react"
import type { ExplorerDemo } from "virtual:fabricator-explorer"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"

import { writePreview, type DemoPreview } from "./explorer-model"

class DemoBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null }

  static getDerivedStateFromError(error: unknown) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "This example could not render.",
    }
  }

  render() {
    if (this.state.message)
      return (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Example could not render</EmptyTitle>
            <EmptyDescription>{this.state.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    return this.props.children
  }
}

function LoadingDemo() {
  return (
    <div
      className="flex w-full max-w-sm flex-col gap-3"
      aria-label="Loading example"
      role="status"
    >
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-1/3" />
    </div>
  )
}

/** One demo, loaded on its own and kept from taking the explorer down. */
function RenderDemo({ demo }: { demo: ExplorerDemo }) {
  const Example = useMemo(() => lazy(demo.load), [demo])
  return (
    <DemoBoundary key={demo.id}>
      <Suspense fallback={<LoadingDemo />}>
        <Example />
      </Suspense>
    </DemoBoundary>
  )
}

/** Demo links point at pages the explorer doesn't have. */
function keepInDemo(event: MouseEvent) {
  const { target } = event
  const link = target instanceof Element ? target.closest("a[href]") : null
  if (link && link.getAttribute("target") !== "_blank") event.preventDefault()
}

/** A full-page demo in a viewport of its own, so its fixed parts stay inside. */
function DemoFrame({
  preview,
  title,
}: {
  preview: DemoPreview
  title: string
}) {
  return (
    <iframe className="demo-frame" src={writePreview(preview)} title={title} />
  )
}

export { DemoFrame, keepInDemo, LoadingDemo, RenderDemo }
