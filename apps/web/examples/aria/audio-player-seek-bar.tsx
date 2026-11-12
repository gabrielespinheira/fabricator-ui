import { AudioPlayer } from "@/styles/aria-fabricator/ui/audio-player"

export function AudioPlayerSeekBar() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <AudioPlayer
        src="/media/sintel-trailer.m4a"
        title="Sintel, trailer"
        artist="Blender Foundation"
        className="w-full"
      />
      <AudioPlayer
        variant="compact"
        src="/media/sintel-trailer.m4a"
        title="Sintel, trailer"
        className="w-full"
      />
    </div>
  )
}
