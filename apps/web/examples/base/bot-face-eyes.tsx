import { BotFace } from "@/styles/base-fabricator/ui/bot-face"

export function BotFaceEyes() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <BotFace eyes="slant" color="violet" aria-label="Slanted eyes" />
      <BotFace eyes="dots" shape="pill" color="teal" aria-label="Dot eyes" />
      <BotFace
        eyes="square"
        shape="hexagon"
        color="orange"
        aria-label="Square eyes"
      />
    </div>
  )
}
