// Audio Player's rules as pure functions: the waveform's bars, the speed
// button, the time labels and the keyboard map. Times, volume and seeking
// follow the Video Player's model, which this one builds on. No React and no
// DOM, so the website and React Native share it.

import {
  formatVideoTime,
  getVideoPlayerKeyAction,
  type VideoPlayerAction,
  type VideoPlayerKey,
  type VideoPlayerStatus,
} from "./video-player-model"

type AudioPlayerVariant = "default" | "compact" | "cover"

type AudioPlayerStatus = VideoPlayerStatus

type AudioPlayerAction = Exclude<
  VideoPlayerAction,
  { type: "toggle-fullscreen" } | { type: "toggle-captions" }
>

/** The speeds the speed button steps through, in order. */
const AUDIO_PLAYER_RATES = [0.75, 1, 1.25, 1.5, 2] as const

/** How tall a silent bar stays, so the waveform reads as one line. */
const AUDIO_PLAYER_MIN_BAR_LEVEL = 0.12

/** The keys the Video Player answers to, less full screen and captions. */
function getAudioPlayerKeyAction(
  event: VideoPlayerKey
): AudioPlayerAction | null {
  const action = getVideoPlayerKeyAction(event)
  if (!action) return null
  if (action.type === "toggle-fullscreen" || action.type === "toggle-captions")
    return null
  return action
}

/**
 * Resamples peaks to the bars that fit: each bar keeps the loudest peak in
 * its share, and the loudest bar fills the height. Quiet bars keep a stub.
 */
function getAudioWaveformBars(
  peaks: ReadonlyArray<number>,
  count: number
): number[] {
  if (peaks.length === 0 || count <= 0) return []
  const levels = Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * peaks.length) / count)
    const end = Math.max(
      start + 1,
      Math.floor(((index + 1) * peaks.length) / count)
    )
    return Math.max(
      ...peaks.slice(start, end).map((peak) => Math.min(1, Math.max(0, peak)))
    )
  })
  const loudest = Math.max(...levels)
  return levels.map((level) =>
    loudest > 0
      ? Math.max(AUDIO_PLAYER_MIN_BAR_LEVEL, level / loudest)
      : AUDIO_PLAYER_MIN_BAR_LEVEL
  )
}

function getAudioWaveformBarCount({
  width,
  barWidth,
  gap,
}: {
  width: number
  barWidth: number
  gap: number
}) {
  if (width <= 0 || barWidth <= 0) return 0
  return Math.floor((width + gap) / (barWidth + gap))
}

/**
 * Peaks for `peaks` from decoded samples (an AudioBuffer's channel data, -1
 * to 1): the loudest sample in each of `count` slices, to two decimals.
 * Compute them once, when the file is made or uploaded, and store them.
 */
function getAudioPeaks(samples: ArrayLike<number>, count: number) {
  const total = Math.min(count, samples.length)
  return Array.from({ length: total }, (_, index) => {
    const start = Math.floor((index * samples.length) / total)
    const end = Math.floor(((index + 1) * samples.length) / total)
    let peak = 0
    for (let sample = start; sample < end; sample++)
      peak = Math.max(peak, Math.abs(samples[sample]))
    return Math.round(Math.min(1, peak) * 100) / 100
  })
}

/** The speed button's next speed, wrapping from the fastest to the slowest. */
function getNextAudioRate(rates: ReadonlyArray<number>, rate: number) {
  const sorted = [...rates].sort((a, b) => a - b)
  return sorted.find((value) => value > rate) ?? sorted[0] ?? rate
}

function formatAudioRate(rate: number) {
  return `${rate}×`
}

/**
 * The time played and the time left (after a minus sign, which keeps the
 * figures' width), and compact's single label: the length
 * before the first play and at the end, the time played in between.
 */
function getAudioTimeLabels({
  status,
  time,
  duration,
}: {
  status: AudioPlayerStatus
  time: number
  duration: number
}) {
  const current = formatVideoTime(time, duration)
  const left = Number.isFinite(duration) ? Math.max(0, duration - time) : 0
  return {
    current,
    remaining: `−${formatVideoTime(left, duration)}`,
    compact:
      status === "idle" || status === "ended"
        ? formatVideoTime(duration)
        : current,
  }
}

export {
  AUDIO_PLAYER_MIN_BAR_LEVEL,
  AUDIO_PLAYER_RATES,
  formatAudioRate,
  getAudioPeaks,
  getAudioPlayerKeyAction,
  getAudioTimeLabels,
  getAudioWaveformBarCount,
  getAudioWaveformBars,
  getNextAudioRate,
  type AudioPlayerAction,
  type AudioPlayerStatus,
  type AudioPlayerVariant,
}
