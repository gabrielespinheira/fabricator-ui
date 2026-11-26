import { TextMotion } from "@/styles/radix-fabricator/ui/text-motion"

export function TextMotionLoops() {
  return (
    <div className="flex flex-col items-center gap-6">
      <p role="status" className="text-sm text-muted-foreground">
        <TextMotion by="character" effect="fade" loop="shimmer">
          Reading 12 files…
        </TextMotion>
      </p>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        <TextMotion by="character" effect={["fade", "rise"]} loop="wave">
          Listening
        </TextMotion>
      </p>
    </div>
  )
}
