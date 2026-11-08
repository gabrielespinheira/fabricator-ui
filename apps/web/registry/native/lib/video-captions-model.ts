// Video Player's captions on React Native. The website hands WebVTT files to
// the browser's <track>; expo-video only plays captions inside the stream, so
// the native player reads the files itself. Pure: no React Native imports.

type VideoCaptionCue = {
  start: number
  end: number
  text: string
}

const TIME = /^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/

/** A WebVTT timestamp in seconds: `mm:ss.ttt` or `hh:mm:ss.ttt`. */
function parseVideoCaptionTime(value: string) {
  const match = TIME.exec(value.trim())
  if (!match) return null
  const [, hours = "0", minutes, seconds, milliseconds] = match
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  )
}

/** A WebVTT file's cues, with their tags (<i>, <v Speaker>) taken out. */
function parseVideoCaptions(source: string): VideoCaptionCue[] {
  const text = source.replace(/\r\n?/g, "\n")
  if (!text.trimStart().startsWith("WEBVTT")) return []
  return text.split(/\n{2,}/).flatMap((block) => {
    const lines = block.split("\n")
    const timingIndex = lines.findIndex((line) => line.includes("-->"))
    if (timingIndex === -1) return []
    const [from = "", rest = ""] = lines[timingIndex].split("-->")
    const start = parseVideoCaptionTime(from)
    const end = parseVideoCaptionTime(rest.trim().split(/\s+/)[0] ?? "")
    if (start === null || end === null) return []
    const cueText = lines
      .slice(timingIndex + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim()
    return cueText ? [{ start, end, text: cueText }] : []
  })
}

/** The text of every cue showing at the time, one per line. */
function getVideoCaptionText(
  cues: ReadonlyArray<VideoCaptionCue>,
  time: number
) {
  return cues
    .filter((cue) => cue.start <= time && time < cue.end)
    .map((cue) => cue.text)
    .join("\n")
}

export {
  getVideoCaptionText,
  parseVideoCaptions,
  parseVideoCaptionTime,
  type VideoCaptionCue,
}
