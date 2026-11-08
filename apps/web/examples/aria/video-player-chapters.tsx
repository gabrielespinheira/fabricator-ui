import { VideoPlayer } from "@/styles/aria-fabricator/ui/video-player"

export function VideoPlayerChapters() {
  return (
    <VideoPlayer
      src="/media/sintel-trailer.mp4"
      poster="/media/sintel-trailer.jpg"
      title="Sintel, trailer"
      chapters={[
        { start: 0, title: "The mountains" },
        { start: 10, title: "The gatekeeper" },
        { start: 24, title: "The dragon" },
        { start: 35, title: "The quest" },
        { start: 46, title: "Credits" },
      ]}
      playbackRates={[0.5, 1, 1.5, 2]}
      className="w-full max-w-2xl"
    />
  )
}
