import { VideoPlayer } from "@/styles/aria-fabricator/ui/video-player"

export function VideoPlayerDemo() {
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
      tracks={[
        {
          src: "/media/sintel-trailer.en.vtt",
          srcLang: "en",
          label: "English",
        },
        {
          src: "/media/sintel-trailer.pt.vtt",
          srcLang: "pt-BR",
          label: "Português",
        },
      ]}
      className="w-full max-w-2xl"
    />
  )
}
