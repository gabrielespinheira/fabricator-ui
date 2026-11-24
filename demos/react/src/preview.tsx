import { blocks, demos } from "virtual:fabricator-explorer"

import { SoundEffects } from "@/styles/base-fabricator/components/sound-effects"
import { DensityProvider } from "@/styles/base-fabricator/ui/density"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import { Toaster as SonnerToaster } from "@/styles/base-fabricator/ui/sonner"
import { Toaster } from "@/styles/base-fabricator/ui/toast"

import type { DemoPreview } from "./explorer-model"
import { keepInDemo, RenderDemo } from "./render-demo"
import { useSettings } from "./settings"

/** One full-page demo with nothing around it: what a DemoFrame loads. */
function Preview({ preview }: { preview: DemoPreview }) {
  const [settings, , density] = useSettings()
  const demo = (preview.kind === "block" ? blocks : demos).find(
    (entry) => entry.id === preview.id
  )
  return (
    <DensityProvider density={density}>
      <Toaster>
        <SoundEffects enabled={settings.sounds} />
        <main className="preview-stage" onClick={keepInDemo}>
          {demo ? (
            <RenderDemo demo={demo} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Item not found</EmptyTitle>
                <EmptyDescription>
                  Choose an item from the current component catalog.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </main>
        <SonnerToaster />
      </Toaster>
    </DensityProvider>
  )
}

export { Preview }
