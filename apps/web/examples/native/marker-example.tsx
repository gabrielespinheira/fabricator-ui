import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CheckIcon,
  GitBranchIcon,
  RotateCcwIcon,
} from "@fabricator-ui/icons-react-native"
import { Pressable } from "react-native"

import { Marker, MarkerContent, MarkerIcon } from "@/registry/native/ui/marker"
import { Spinner } from "@/registry/native/ui/spinner"

function MarkerExample() {
  return (
    <ExampleWrapper>
      <Example title="Variants" className="items-stretch gap-6">
        <Marker variant="default">
          <MarkerContent>A default marker for inline notes.</MarkerContent>
        </Marker>
        <Marker variant="separator">
          <MarkerContent>A separator marker</MarkerContent>
        </Marker>
        <Marker variant="border">
          <MarkerContent>A border marker for row boundaries.</MarkerContent>
        </Marker>
      </Example>
      <Example title="With an icon" className="items-stretch">
        <Marker>
          <MarkerIcon>
            <CheckIcon />
          </MarkerIcon>
          <MarkerContent>Ran the tests in 12 seconds.</MarkerContent>
        </Marker>
        <Marker>
          <MarkerIcon>
            <Spinner />
          </MarkerIcon>
          <MarkerContent>Installing dependencies</MarkerContent>
        </Marker>
      </Example>
      <Example title="Shimmer" className="items-stretch">
        <Marker role="status">
          <MarkerContent className="shimmer">Thinking...</MarkerContent>
        </Marker>
        <Marker variant="separator" role="status">
          <MarkerContent className="shimmer">Reading 4 files</MarkerContent>
        </Marker>
      </Example>
      <Example title="Pressable" className="items-stretch">
        <Marker render={<Pressable onPress={() => {}} />}>
          <MarkerIcon>
            <GitBranchIcon />
          </MarkerIcon>
          <MarkerContent>View the pull request</MarkerContent>
        </Marker>
        <Marker asChild>
          <Pressable onPress={() => {}}>
            <MarkerIcon>
              <RotateCcwIcon />
            </MarkerIcon>
            <MarkerContent>Revert this change</MarkerContent>
          </Pressable>
        </Marker>
      </Example>
    </ExampleWrapper>
  )
}

export { MarkerExample }
