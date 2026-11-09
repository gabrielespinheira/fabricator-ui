import { VideoPlayer } from "@/styles/base-fabricator/ui/video-player"

export function VideoPlayerError() {
  return (
    <VideoPlayer
      src="/media/missing-video.mp4"
      title="A video that can't load"
      className="w-full max-w-md"
    />
  )
}
