import { VideoPlayer } from "@/styles/base-fabricator/ui/video-player"

export function VideoPlayerCaptions() {
  return (
    <VideoPlayer
      src="/media/sintel-trailer.mp4"
      poster="/media/sintel-trailer.jpg"
      title="Sintel, trailer"
      tracks={[
        {
          src: "/media/sintel-trailer.en.vtt",
          srcLang: "en",
          label: "English",
          default: true,
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
