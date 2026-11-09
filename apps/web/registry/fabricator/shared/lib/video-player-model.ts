// Video Player's rules as pure functions: times as text, the keyboard map,
// the seek and volume sliders' steps, chapters on the track, and when the
// controls show. No React and no DOM, so the website and React Native share
// it. Times are in seconds; a duration the player doesn't know yet is NaN.

type VideoPlayerVariant = "default" | "compact"

type VideoPlayerChapter = {
  /** Where the chapter starts, in seconds. */
  start: number
  title: string
}

type VideoPlayerChapterSegment = {
  start: number
  end: number
  title: string
  /** Where the segment starts along the track, from 0 to 1. */
  offset: number
  /** The share of the track it covers, from 0 to 1. */
  width: number
}

type VideoPlayerKey = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

type VideoPlayerAction =
  | { type: "toggle-play" }
  | { type: "seek-by"; seconds: number }
  | { type: "seek-to"; fraction: number }
  | { type: "volume-by"; delta: number }
  | { type: "toggle-mute" }
  | { type: "toggle-fullscreen" }
  | { type: "toggle-captions" }
  | { type: "rate-by"; step: 1 | -1 }

type VideoPlayerStatus =
  | "idle"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error"

type VideoPlayerVolumeLevel = "muted" | "low" | "high"

const VIDEO_PLAYER_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

/** Seconds an arrow key moves the playhead. */
const VIDEO_PLAYER_SEEK_STEP = 5

/** Seconds the skip buttons, J and L move the playhead. */
const VIDEO_PLAYER_SKIP = 10

const VIDEO_PLAYER_VOLUME_STEP = 0.05

const VIDEO_PLAYER_VOLUME_PAGE_STEP = 0.2

/** How long the volume readout stays after a volume shortcut. */
const VIDEO_PLAYER_VOLUME_READOUT_DURATION = 1000

/** How long the pointer rests before the controls of a playing video hide. */
const VIDEO_PLAYER_IDLE_DELAY = 2500

function toSeconds(seconds: number) {
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
}

function formatVideoTime(seconds: number, duration = seconds) {
  const total = toSeconds(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secondsPart = String(total % 60).padStart(2, "0")
  if (hours > 0 || toSeconds(duration) >= 3600) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secondsPart}`
  }
  return `${minutes}:${secondsPart}`
}

function formatUnit(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`
}

/** A time as a screen reader should say it: "1 minute 5 seconds". */
function formatVideoTimeSpoken(seconds: number) {
  const total = toSeconds(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secondsPart = total % 60
  const parts = [
    hours > 0 ? formatUnit(hours, "hour") : null,
    minutes > 0 ? formatUnit(minutes, "minute") : null,
    secondsPart > 0 ? formatUnit(secondsPart, "second") : null,
  ].filter((part) => part !== null)
  return parts.length > 0 ? parts.join(" ") : formatUnit(0, "second")
}

/** The seek slider's `aria-valuetext`. */
function getVideoSeekText(time: number, duration: number) {
  const spokenTime = formatVideoTimeSpoken(time)
  if (!Number.isFinite(duration)) return spokenTime
  return `${spokenTime} of ${formatVideoTimeSpoken(duration)}`
}

function clampVideoTime(time: number, duration: number) {
  const floored = Math.max(0, time)
  return Number.isFinite(duration) ? Math.min(floored, duration) : floored
}

function getVideoPlayerKeyAction(
  event: VideoPlayerKey
): VideoPlayerAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  const { key } = event
  if (/^[0-9]$/.test(key))
    return { type: "seek-to", fraction: Number(key) / 10 }
  switch (key.length === 1 ? key.toLowerCase() : key) {
    case " ":
    case "k":
      return { type: "toggle-play" }
    case "ArrowLeft":
      return { type: "seek-by", seconds: -VIDEO_PLAYER_SEEK_STEP }
    case "ArrowRight":
      return { type: "seek-by", seconds: VIDEO_PLAYER_SEEK_STEP }
    case "j":
      return { type: "seek-by", seconds: -VIDEO_PLAYER_SKIP }
    case "l":
      return { type: "seek-by", seconds: VIDEO_PLAYER_SKIP }
    case "Home":
      return { type: "seek-to", fraction: 0 }
    case "End":
      return { type: "seek-to", fraction: 1 }
    case "ArrowUp":
      return { type: "volume-by", delta: VIDEO_PLAYER_VOLUME_STEP }
    case "ArrowDown":
      return { type: "volume-by", delta: -VIDEO_PLAYER_VOLUME_STEP }
    case "m":
      return { type: "toggle-mute" }
    case "f":
      return { type: "toggle-fullscreen" }
    case "c":
      return { type: "toggle-captions" }
    case ">":
      return { type: "rate-by", step: 1 }
    case "<":
      return { type: "rate-by", step: -1 }
    default:
      return null
  }
}

/**
 * Where a key moves the seek slider, or null. Up and Down are left to the
 * player, which sets the volume with them wherever focus is.
 */
function getVideoSeekKeyTime(
  key: string,
  { time, duration }: { time: number; duration: number }
) {
  const page = Number.isFinite(duration) ? duration / 10 : VIDEO_PLAYER_SKIP
  const next = (() => {
    switch (key) {
      case "ArrowRight":
        return time + VIDEO_PLAYER_SEEK_STEP
      case "ArrowLeft":
        return time - VIDEO_PLAYER_SEEK_STEP
      case "PageUp":
        return time + page
      case "PageDown":
        return time - page
      case "Home":
        return 0
      case "End":
        return duration
      default:
        return null
    }
  })()
  return next === null ? null : clampVideoTime(next, duration)
}

function clampVolume(volume: number) {
  return Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100
}

/**
 * The volume a shortcut steps to, from the volume you hear: a muted video
 * counts as silent, so Up unmutes it quietly and Down keeps it muted.
 */
function getVideoVolumeStep({
  volume,
  isMuted,
  delta,
}: {
  volume: number
  isMuted: boolean
  delta: number
}) {
  return clampVolume((isMuted ? 0 : volume) + delta)
}

function formatVideoVolume(volume: number, isMuted: boolean) {
  if (isMuted || volume === 0) return "Muted"
  return `${Math.round(volume * 100)}%`
}

/** Where a key moves the volume slider, or null. */
function getVideoVolumeKeyValue(key: string, volume: number) {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampVolume(volume + VIDEO_PLAYER_VOLUME_STEP)
    case "ArrowLeft":
    case "ArrowDown":
      return clampVolume(volume - VIDEO_PLAYER_VOLUME_STEP)
    case "PageUp":
      return clampVolume(volume + VIDEO_PLAYER_VOLUME_PAGE_STEP)
    case "PageDown":
      return clampVolume(volume - VIDEO_PLAYER_VOLUME_PAGE_STEP)
    case "Home":
      return 0
    case "End":
      return 1
    default:
      return null
  }
}

function getVideoFractionAtPoint({
  x,
  left,
  width,
}: {
  x: number
  left: number
  width: number
}) {
  if (width <= 0) return 0
  return Math.min(1, Math.max(0, (x - left) / width))
}

/** How far the video has loaded past the playhead. */
function getVideoBufferedEnd(
  ranges: ReadonlyArray<readonly [number, number]>,
  time: number
) {
  const range = ranges.find(([start, end]) => start <= time && time <= end)
  return range ? range[1] : time
}

function getVideoRateStep(
  rates: ReadonlyArray<number>,
  rate: number,
  step: 1 | -1
) {
  const sorted = [...rates].sort((a, b) => a - b)
  if (step === 1)
    return sorted.find((value) => value > rate) ?? sorted.at(-1) ?? rate
  return sorted.findLast((value) => value < rate) ?? sorted[0] ?? rate
}

function formatVideoRate(rate: number) {
  return rate === 1 ? "Normal" : `${rate}×`
}

function sortChapters(chapters: ReadonlyArray<VideoPlayerChapter>) {
  return [...chapters].sort((a, b) => a.start - b.start)
}

/** The index, in the given list, of the chapter the time falls in, or -1. */
function getVideoChapterIndex(
  chapters: ReadonlyArray<VideoPlayerChapter>,
  time: number
) {
  const current = sortChapters(chapters).findLast(
    (chapter) => chapter.start <= time
  )
  return current ? chapters.indexOf(current) : -1
}

function getVideoChapterSegments(
  chapters: ReadonlyArray<VideoPlayerChapter>,
  duration: number
): VideoPlayerChapterSegment[] {
  if (!Number.isFinite(duration) || duration <= 0) return []
  const inside = sortChapters(chapters).filter(
    (chapter) => chapter.start < duration
  )
  if (inside.length === 0) return []
  const starts =
    inside[0].start > 0 ? [{ start: 0, title: "" }, ...inside] : inside
  return starts.map((chapter, index) => {
    const end = starts[index + 1]?.start ?? duration
    return {
      start: chapter.start,
      end,
      title: chapter.title,
      offset: chapter.start / duration,
      width: (end - chapter.start) / duration,
    }
  })
}

/**
 * A CSS mask for the seek track with a 2px gap at each chapter's start. Masks
 * read only alpha, so #000 is "shown", not a colour.
 */
function getVideoChapterMask(
  segments: ReadonlyArray<VideoPlayerChapterSegment>
) {
  const cuts = segments.slice(1).map((segment) => {
    const at = `${Math.round(segment.offset * 10000) / 100}%`
    return `#000 calc(${at} - 1px), transparent calc(${at} - 1px), transparent calc(${at} + 1px), #000 calc(${at} + 1px)`
  })
  if (cuts.length === 0) return "none"
  return `linear-gradient(to right, #000 0, ${cuts.join(", ")}, #000 100%)`
}

function getVideoVolumeLevel(
  volume: number,
  isMuted: boolean
): VideoPlayerVolumeLevel {
  if (isMuted || volume === 0) return "muted"
  return volume < 0.5 ? "low" : "high"
}

function getVideoPlayerStatus({
  isPaused,
  isWaiting,
  isEnded,
  hasError,
  hasStarted,
}: {
  isPaused: boolean
  isWaiting: boolean
  isEnded: boolean
  hasError: boolean
  hasStarted: boolean
}): VideoPlayerStatus {
  if (hasError) return "error"
  if (isEnded) return "ended"
  if (!hasStarted) return "idle"
  if (isPaused) return "paused"
  return isWaiting ? "buffering" : "playing"
}

function isVideoControlsVisible({
  isPlaying,
  isIdle,
  isMenuOpen,
  isSeeking,
}: {
  isPlaying: boolean
  isIdle: boolean
  isMenuOpen: boolean
  isSeeking: boolean
}) {
  return !isPlaying || !isIdle || isMenuOpen || isSeeking
}

/** The captions track C turns on or off: -1 is off. */
function toggleVideoCaptions({
  current,
  previous,
  count,
}: {
  current: number
  previous: number
  count: number
}) {
  if (current >= 0 || count === 0) return -1
  return previous >= 0 && previous < count ? previous : 0
}

export {
  clampVideoTime,
  formatVideoRate,
  formatVideoTime,
  formatVideoTimeSpoken,
  formatVideoVolume,
  getVideoBufferedEnd,
  getVideoChapterIndex,
  getVideoChapterMask,
  getVideoChapterSegments,
  getVideoFractionAtPoint,
  getVideoPlayerKeyAction,
  getVideoPlayerStatus,
  getVideoRateStep,
  getVideoSeekKeyTime,
  getVideoSeekText,
  getVideoVolumeKeyValue,
  getVideoVolumeLevel,
  getVideoVolumeStep,
  isVideoControlsVisible,
  toggleVideoCaptions,
  VIDEO_PLAYER_IDLE_DELAY,
  VIDEO_PLAYER_RATES,
  VIDEO_PLAYER_SEEK_STEP,
  VIDEO_PLAYER_SKIP,
  VIDEO_PLAYER_VOLUME_READOUT_DURATION,
  VIDEO_PLAYER_VOLUME_STEP,
  type VideoPlayerAction,
  type VideoPlayerChapter,
  type VideoPlayerChapterSegment,
  type VideoPlayerKey,
  type VideoPlayerStatus,
  type VideoPlayerVariant,
  type VideoPlayerVolumeLevel,
}
