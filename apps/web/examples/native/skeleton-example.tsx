import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Skeleton } from "@/registry/native/ui/skeleton"

function SkeletonExample() {
  return (
    <ExampleWrapper>
      <Example title="Avatar and text" className="flex-row items-center">
        <Skeleton className="size-12 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </View>
      </Example>
      <Example title="Card" className="items-stretch">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </Example>
    </ExampleWrapper>
  )
}

export { SkeletonExample }
