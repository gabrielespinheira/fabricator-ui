import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { AudioPlayer } from "@/registry/native/ui/audio-player"
import { Text } from "@/registry/native/ui/text"

const MEDIA = "https://fabricator-ui.vercel.app/media"

// The trailer's loudness, worked out once from the file with getAudioPeaks.
const PEAKS = [
  0, 0.01, 0.12, 0.14, 0.1, 0.12, 0.68, 1, 0.62, 0.44, 0.27, 1, 1, 0.67, 0.21,
  0.94, 0.81, 0.48, 0.26, 0.28, 1, 1, 0.75, 0.55, 0.3, 0.36, 0.31, 0.62, 0.61,
  0.59, 0.52, 0.95, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.54, 0.36, 0.22, 0.33, 0.72,
  0.55, 0.49, 0.23, 1, 0.75, 0.47, 0.44, 0.36, 0.18, 0.19, 0.33, 0.85, 1, 1,
  0.61, 0.19, 0.04, 0,
]

function AudioPlayerExample() {
  const [isPlaying, setIsPlaying] = React.useState(false)
  return (
    <ExampleWrapper fit>
      <Example title="Default, with a waveform">
        <AudioPlayer
          src={`${MEDIA}/sintel-trailer.m4a`}
          artwork={`${MEDIA}/sintel-trailer-cover.jpg`}
          title="Sintel, trailer"
          artist="Blender Foundation"
          peaks={PEAKS}
          onPlayingChange={setIsPlaying}
          className="w-full"
        />
        <Text className="text-(length:--density-text-12) text-muted-foreground">
          {isPlaying ? "Playing" : "Paused"} · Sintel © Blender Foundation, CC
          BY 3.0
        </Text>
      </Example>
      <Example title="Cover">
        <AudioPlayer
          variant="cover"
          src={`${MEDIA}/sintel-trailer.m4a`}
          artwork={`${MEDIA}/sintel-trailer-cover.jpg`}
          title="Sintel, trailer"
          artist="Blender Foundation"
          peaks={PEAKS}
          className="w-full max-w-xs self-center"
        />
      </Example>
      <Example title="Compact">
        <AudioPlayer
          variant="compact"
          src={`${MEDIA}/sintel-trailer.m4a`}
          title="Sintel, trailer"
          peaks={PEAKS}
          className="w-full"
        />
      </Example>
      <Example title="Without a waveform">
        <AudioPlayer
          src={`${MEDIA}/sintel-trailer.m4a`}
          title="Sintel, trailer"
          artist="Blender Foundation"
          playbackRates={[1, 1.5, 2]}
          className="w-full"
        />
        <AudioPlayer
          variant="compact"
          src={`${MEDIA}/sintel-trailer.m4a`}
          title="Sintel, trailer"
          className="w-full"
        />
      </Example>
      <Example title="Audio that can't load">
        <AudioPlayer
          src={`${MEDIA}/missing-audio.m4a`}
          title="An episode that can't load"
          artist="Acme Inc"
          className="w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}

export { AudioPlayerExample }
