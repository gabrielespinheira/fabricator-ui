import { AudioPlayer } from "@/styles/radix-fabricator/ui/audio-player"

export function AudioPlayerError() {
  return (
    <AudioPlayer
      src="/media/missing-audio.m4a"
      title="An episode that can't load"
      artist="Acme Inc"
      className="w-full max-w-md"
    />
  )
}
