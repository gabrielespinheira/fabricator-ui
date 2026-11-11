import { BotFace } from "@/styles/aria-fabricator/ui/bot-face"

export function BotFaceSizes() {
  return (
    <div className="flex items-end gap-6">
      <BotFace size="sm" color="violet" aria-label="Small assistant" />
      <BotFace color="info" shape="circle" aria-label="Default assistant" />
      <BotFace
        size="lg"
        color="success"
        shape="flower"
        aria-label="Large assistant"
      />
    </div>
  )
}
