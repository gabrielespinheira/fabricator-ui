import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Text } from "@/registry/native/ui/text"
import { VideoPlayer } from "@/registry/native/ui/video-player"

const MEDIA = "https://fabricator-ui.vercel.app/media"

const TRACKS = [
  {
    src: `${MEDIA}/sintel-trailer.en.vtt`,
    srcLang: "en",
    label: "English",
  },
  {
    src: `${MEDIA}/sintel-trailer.pt.vtt`,
    srcLang: "pt-BR",
    label: "Português",
  },
]

function VideoPlayerExample() {
  const [isPlaying, setIsPlaying] = React.useState(false)
  return (
    <ExampleWrapper fit>
      <Example title="Default, with chapters and captions">
        <VideoPlayer
          src="https://fabricator-ui.vercel.app/media/sintel-trailer.mp4"
          poster="https://fabricator-ui.vercel.app/media/sintel-trailer.jpg"
          title="Sintel, trailer"
          chapters={[
            { start: 0, title: "The mountains" },
            { start: 10, title: "The gatekeeper" },
            { start: 24, title: "The dragon" },
            { start: 35, title: "The quest" },
            { start: 46, title: "Credits" },
          ]}
          tracks={[
            {
              src: "https://fabricator-ui.vercel.app/media/sintel-trailer.en.vtt",
              srcLang: "en",
              label: "English",
            },
            {
              src: "https://fabricator-ui.vercel.app/media/sintel-trailer.pt.vtt",
              srcLang: "pt-BR",
              label: "Português",
            },
          ]}
          onPlayingChange={setIsPlaying}
          className="w-full"
        />
        <Text className="text-(length:--density-text-12) text-muted-foreground">
          {isPlaying ? "Playing" : "Paused"} · Sintel © Blender Foundation, CC
          BY 3.0
        </Text>
      </Example>
      <Example title="Captions on from the start">
        <VideoPlayer
          src={`${MEDIA}/sintel-trailer.mp4`}
          poster={`${MEDIA}/sintel-trailer.jpg`}
          title="Sintel, trailer"
          tracks={[{ ...TRACKS[0], default: true }, TRACKS[1]]}
          playbackRates={[0.5, 1, 1.5, 2]}
          className="w-full"
        />
      </Example>
      <Example title="Compact">
        <VideoPlayer
          variant="compact"
          src={`${MEDIA}/sintel-trailer.mp4`}
          poster={`${MEDIA}/sintel-trailer.jpg`}
          title="Sintel, trailer"
          className="w-full"
        />
      </Example>
      <Example title="Autoplay, muted and looping">
        <VideoPlayer
          variant="compact"
          src={`${MEDIA}/sintel-trailer.mp4`}
          title="Sintel, trailer"
          autoPlay
          muted
          loop
          className="w-full"
        />
      </Example>
      <Example title="A video that can't load">
        <VideoPlayer
          src={`${MEDIA}/missing-video.mp4`}
          title="A video that can't load"
          className="w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}

export { VideoPlayerExample }
