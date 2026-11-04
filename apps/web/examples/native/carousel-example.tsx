import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { Card, CardContent } from "@/registry/native/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/registry/native/ui/carousel"
import { Text } from "@/registry/native/ui/text"

const SLIDES = [1, 2, 3, 4, 5]

function Slide({ value }: { value: number }) {
  return (
    <Card className="m-px">
      <CardContent className="aspect-square items-center justify-center">
        <Text className="text-4xl font-semibold">{value}</Text>
      </CardContent>
    </Card>
  )
}

function CarouselExample() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!api) return
    const update = () => {
      setCount(api.scrollSnapList().length)
      setCurrent(api.selectedScrollSnap() + 1)
    }
    update()
    api.on("init", update).on("reInit", update).on("select", update)
    return () => {
      api.off("init", update).off("reInit", update).off("select", update)
    }
  }, [api])

  return (
    <ExampleWrapper>
      <Example title="Default" className="items-center">
        <View className="w-48">
          <Carousel>
            <CarouselContent>
              {SLIDES.map((value) => (
                <CarouselItem key={value}>
                  <Slide value={value} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </View>
      </Example>
      <Example
        title="Half a viewport each, and spacing"
        className="items-center"
      >
        <View className="w-56">
          <Carousel opts={{ align: "start" }}>
            <CarouselContent className="-ml-1">
              {SLIDES.map((value) => (
                <CarouselItem key={value} className="basis-1/2 pl-1">
                  <Slide value={value} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </View>
      </Example>
      <Example title="Vertical" className="items-center pt-16 pb-16">
        <View className="w-48">
          <Carousel orientation="vertical" opts={{ align: "start" }}>
            <CarouselContent className="-mt-1 h-[270px]">
              {SLIDES.map((value) => (
                <CarouselItem key={value} className="basis-1/2 pt-1">
                  <Card className="m-px flex-1">
                    <CardContent className="flex-1 items-center justify-center">
                      <Text className="text-3xl font-semibold">{value}</Text>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </View>
      </Example>
      <Example title="Loop" className="items-center">
        <View className="w-48">
          <Carousel opts={{ loop: true }}>
            <CarouselContent>
              {SLIDES.map((value) => (
                <CarouselItem key={value}>
                  <Slide value={value} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </View>
      </Example>
      <Example title="The API, driven from outside" className="items-center">
        <View className="w-48">
          <Carousel setApi={setApi}>
            <CarouselContent>
              {SLIDES.map((value) => (
                <CarouselItem key={value}>
                  <Slide value={value} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </View>
        <Text className="text-muted-foreground">
          Slide {current} of {count}
        </Text>
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!api?.canScrollPrev()}
            onPress={() => api?.scrollPrev()}
          >
            Back
          </Button>
          <Button variant="outline" size="sm" onPress={() => api?.scrollTo(0)}>
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!api?.canScrollNext()}
            onPress={() => api?.scrollNext()}
          >
            Forward
          </Button>
        </View>
      </Example>
      <Example title="Dragging off" className="items-center">
        <View className="w-48">
          <Carousel opts={{ watchDrag: false }}>
            <CarouselContent>
              {SLIDES.map((value) => (
                <CarouselItem key={value}>
                  <Slide value={value} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious variant="ghost" size="icon" />
            <CarouselNext variant="ghost" size="icon" />
          </Carousel>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { CarouselExample }
