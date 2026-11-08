import { VideoPlayer } from "@/styles/radix-fabricator/ui/video-player"

export function VideoPlayerCompact() {
  return (
    <VideoPlayer
      variant="compact"
      src="/media/sintel-trailer.mp4"
      poster="/media/sintel-trailer.jpg"
      title="Sintel, trailer"
      className="w-full max-w-sm"
    />
  )
}
