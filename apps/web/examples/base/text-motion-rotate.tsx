import {
  TextMotion,
  TextMotionGroup,
  TextMotionRotate,
} from "@/styles/base-fabricator/ui/text-motion"

export function TextMotionRotateDemo() {
  return (
    <TextMotionGroup className="text-center">
      <h3 className="text-3xl font-semibold tracking-tight text-foreground">
        <TextMotion>Made for</TextMotion>{" "}
        <TextMotionRotate
          texts={["designers", "engineers", "founders"]}
          className="text-primary-text"
        />
      </h3>
    </TextMotionGroup>
  )
}
