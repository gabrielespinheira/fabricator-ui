import { AudioPlayer } from "@/styles/base-fabricator/ui/audio-player"

const PEAKS = [
  0, 0.01, 0.12, 0.14, 0.1, 0.12, 0.68, 1, 0.62, 0.44, 0.27, 1, 1, 0.67, 0.21,
  0.94, 0.81, 0.48, 0.26, 0.28, 1, 1, 0.75, 0.55, 0.3, 0.36, 0.31, 0.62, 0.61,
  0.59, 0.52, 0.95, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.54, 0.36, 0.22, 0.33, 0.72,
  0.55, 0.49, 0.23, 1, 0.75, 0.47, 0.44, 0.36, 0.18, 0.19, 0.33, 0.85, 1, 1,
  0.61, 0.19, 0.04, 0,
]

export function AudioPlayerCover() {
  return (
    <AudioPlayer
      variant="cover"
      src="/media/sintel-trailer.m4a"
      artwork="/media/sintel-trailer-cover.jpg"
      title="Sintel, trailer"
      artist="Blender Foundation"
      peaks={PEAKS}
      className="w-full max-w-xs"
    />
  )
}
