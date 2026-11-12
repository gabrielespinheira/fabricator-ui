"use client"

import * as React from "react"
import { cn } from "cn"

import {
  AUDIO_PLAYER_RATES,
  formatAudioRate,
  getAudioPlayerKeyAction,
  getAudioTimeLabels,
  getAudioWaveformBarCount,
  getAudioWaveformBars,
  getNextAudioRate,
  type AudioPlayerAction,
  type AudioPlayerVariant,
} from "@/registry/bases/__base__/lib/audio-player-model"
import {
  clampVideoTime,
  formatVideoTime,
  getVideoBufferedEnd,
  getVideoFractionAtPoint,
  getVideoPlayerStatus,
  getVideoRateStep,
  getVideoSeekKeyTime,
  getVideoSeekText,
  getVideoVolumeKeyValue,
  getVideoVolumeLevel,
  getVideoVolumeStep,
  VIDEO_PLAYER_SKIP,
  VIDEO_PLAYER_VOLUME_READOUT_DURATION,
  type VideoPlayerVolumeLevel,
} from "@/registry/bases/__base__/lib/video-player-model"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// An audio file with its own controls on a card: the artwork and what's
// playing, a seek bar drawn as the file's waveform when `peaks` are given,
// the time played and left, skip back and forward, a speed button and the
// volume. `variant="cover"` stacks a large artwork above the controls, and
// `variant="compact"` keeps play, the seek bar, the time and the speed on one
// row, as a voice message. The keyboard follows the Video Player's.

type AudioPlayerProps = Omit<React.ComponentProps<"div">, "title"> & {
  src: string
  /** Names the player for screen readers, and shows beside the artwork. */
  title?: string
  artist?: string
  /** A square image, such as an album or podcast cover. Not in compact. */
  artwork?: string
  variant?: AudioPlayerVariant
  /**
   * The file's loudness from start to end, each from 0 to 1, drawn as the
   * seek bar's waveform. Any count works; the bars resample them.
   */
  peaks?: ReadonlyArray<number>
  /** The speeds the speed button steps through. */
  playbackRates?: ReadonlyArray<number>
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  onPlayingChange?: (isPlaying: boolean) => void
  onEnded?: () => void
}

type AudioPlayerStyle = React.CSSProperties & Record<`--${string}`, number>

type AudioPlayerState = {
  isPaused: boolean
  isWaiting: boolean
  isEnded: boolean
  hasError: boolean
  hasStarted: boolean
  time: number
  duration: number
  bufferedEnd: number
  volume: number
  isMuted: boolean
  rate: number
}

const INITIAL_STATE: AudioPlayerState = {
  isPaused: true,
  isWaiting: false,
  isEnded: false,
  hasError: false,
  hasStarted: false,
  time: 0,
  duration: Number.NaN,
  bufferedEnd: 0,
  volume: 1,
  isMuted: false,
  rate: 1,
}

/** The waveform's bar and gap, in px; the bars stretch to fill the track. */
const WAVEFORM_BAR_WIDTH = 3
const WAVEFORM_GAP = 2

// The equalizer's bounce and the waveform's rise, on the motion tokens so
// they follow the project's speed and stop with motion off or reduced.
const AUDIO_PLAYER_STYLES = `
@keyframes fabricator-audio-player-equalizer {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}
@keyframes fabricator-audio-player-rise {
  from { transform: scaleY(0); }
}
[data-slot="audio-player-equalizer-bar"] {
  animation: fabricator-audio-player-equalizer calc(var(--motion-sheet, 400ms) * 2) var(--motion-ease-move, ease-in-out) infinite;
  animation-delay: calc(var(--audio-player-bar-index) * var(--motion-sheet, 400ms) * -0.6);
  animation-play-state: paused;
}
[data-slot="audio-player"][data-status="playing"] [data-slot="audio-player-equalizer-bar"] {
  animation-play-state: running;
}
[data-slot="audio-player-waveform-bar"] {
  animation: fabricator-audio-player-rise var(--motion-sheet, 400ms) var(--motion-ease-drawer, ease-out) both;
  animation-delay: calc(var(--audio-player-bar-index) * var(--motion-feedback, 150ms) / 12);
}
[data-motion="off"] [data-slot="audio-player-equalizer-bar"],
[data-motion="off"] [data-slot="audio-player-waveform-bar"] { animation: none; }
@media (prefers-reduced-motion: reduce) {
  [data-slot="audio-player-equalizer-bar"],
  [data-slot="audio-player-waveform-bar"] { animation: none; }
}
`

function readAudioState(audio: HTMLAudioElement) {
  const ranges = Array.from(
    { length: audio.buffered.length },
    (_, index) =>
      [audio.buffered.start(index), audio.buffered.end(index)] as const
  )
  return {
    isPaused: audio.paused,
    isEnded: audio.ended,
    hasError: audio.error !== null,
    time: audio.currentTime,
    duration: audio.duration,
    bufferedEnd: getVideoBufferedEnd(ranges, audio.currentTime),
    volume: audio.volume,
    isMuted: audio.muted,
    rate: audio.playbackRate,
  }
}

function AudioPlayer({
  src,
  title,
  artist,
  artwork,
  variant = "default",
  peaks,
  playbackRates = AUDIO_PLAYER_RATES,
  autoPlay = false,
  muted = false,
  loop = false,
  onPlayingChange,
  onEnded,
  className,
  onKeyDown,
  ...props
}: AudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const seekRef = React.useRef<HTMLDivElement>(null)
  const volumeReadoutTimer =
    React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const isCompact = variant === "compact"

  const [state, setState] = React.useState<AudioPlayerState>({
    ...INITIAL_STATE,
    isMuted: muted,
  })
  const [isSeeking, setIsSeeking] = React.useState(false)
  const [isVolumeChanging, setIsVolumeChanging] = React.useState(false)

  const status = getVideoPlayerStatus(state)
  const isPlaying = !state.isPaused && !state.isEnded

  const onPlayingChangeRef = React.useRef(onPlayingChange)
  const onEndedRef = React.useRef(onEnded)
  React.useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange
    onEndedRef.current = onEnded
  })

  // The media element is the source of truth: every event re-reads it.
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const sync = () =>
      setState((current) => ({ ...current, ...readAudioState(audio) }))
    const onPlay = () => {
      setState((current) => ({
        ...current,
        ...readAudioState(audio),
        hasStarted: true,
      }))
      onPlayingChangeRef.current?.(true)
    }
    const onPause = () => {
      sync()
      onPlayingChangeRef.current?.(false)
    }
    const onWaiting = () =>
      setState((current) => ({ ...current, isWaiting: true }))
    const onPlaying = () =>
      setState((current) => ({
        ...current,
        ...readAudioState(audio),
        isWaiting: false,
      }))
    const onEndedEvent = () => {
      sync()
      onEndedRef.current?.()
    }
    const events: [string, () => void][] = [
      ["loadedmetadata", sync],
      ["durationchange", sync],
      ["timeupdate", sync],
      ["progress", sync],
      ["seeked", sync],
      ["volumechange", sync],
      ["ratechange", sync],
      ["error", sync],
      ["play", onPlay],
      ["pause", onPause],
      ["waiting", onWaiting],
      ["playing", onPlaying],
      ["canplay", onPlaying],
      ["ended", onEndedEvent],
    ]
    for (const [name, listener] of events)
      audio.addEventListener(name, listener)
    sync()
    return () => {
      for (const [name, listener] of events)
        audio.removeEventListener(name, listener)
    }
  }, [])

  // What has played follows the playhead every frame through a CSS variable,
  // so playing audio doesn't re-render the player 60 times a second.
  React.useEffect(() => {
    const audio = audioRef.current
    const seek = seekRef.current
    if (!audio || !seek || !isPlaying || isSeeking) return
    let frame = requestAnimationFrame(function tick() {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        seek.style.setProperty(
          "--audio-player-progress",
          String(audio.currentTime / audio.duration)
        )
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, isSeeking])

  React.useEffect(() => () => clearTimeout(volumeReadoutTimer.current), [])

  // A volume key holds the volume slider open for a moment, so the change
  // shows.
  const showVolumeChange = React.useCallback(() => {
    setIsVolumeChanging(true)
    clearTimeout(volumeReadoutTimer.current)
    volumeReadoutTimer.current = setTimeout(
      () => setIsVolumeChanging(false),
      VIDEO_PLAYER_VOLUME_READOUT_DURATION
    )
  }, [])

  const togglePlay = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused || audio.ended) {
      // A rejected play (autoplay policy, a source that fails) shows as the
      // paused or error state; there's nothing more to do with it here.
      audio.play().catch(() => undefined)
      return
    }
    audio.pause()
  }, [])

  const seekTo = React.useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    const next = clampVideoTime(time, audio.duration)
    audio.currentTime = next
    seekRef.current?.style.setProperty(
      "--audio-player-progress",
      String(Number.isFinite(audio.duration) ? next / audio.duration : 0)
    )
    setState((current) => ({ ...current, time: next, isEnded: false }))
  }, [])

  const setVolume = React.useCallback((volume: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = volume === 0
  }, [])

  const toggleMute = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.muted && audio.volume === 0) audio.volume = 1
    audio.muted = !audio.muted
  }, [])

  const setRate = React.useCallback((rate: number) => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = rate
  }, [])

  const runAction = (action: AudioPlayerAction) => {
    const audio = audioRef.current
    if (!audio) return
    switch (action.type) {
      case "toggle-play":
        togglePlay()
        return
      case "seek-by":
        seekTo(audio.currentTime + action.seconds)
        return
      case "seek-to":
        if (Number.isFinite(audio.duration))
          seekTo(audio.duration * action.fraction)
        return
      case "volume-by":
        setVolume(
          getVideoVolumeStep({
            volume: audio.volume,
            isMuted: audio.muted,
            delta: action.delta,
          })
        )
        showVolumeChange()
        return
      case "toggle-mute":
        toggleMute()
        showVolumeChange()
        return
      case "rate-by":
        setRate(
          getVideoRateStep(playbackRates, audio.playbackRate, action.step)
        )
        return
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    const target = event.target
    // A focused button keeps Space and Enter; the sliders keep their own keys.
    if (
      target instanceof HTMLElement &&
      target.closest("button") &&
      (event.key === " " || event.key === "Enter")
    ) {
      return
    }
    const action = getAudioPlayerKeyAction(event)
    if (!action) return
    event.preventDefault()
    runAction(action)
  }

  const isKnown = Number.isFinite(state.duration) && state.duration > 0
  const progress = isKnown ? state.time / state.duration : 0
  const buffered = isKnown ? state.bufferedEnd / state.duration : 0
  const times = getAudioTimeLabels({
    status,
    time: state.time,
    duration: state.duration,
  })
  const volumeLevel = getVideoVolumeLevel(state.volume, state.isMuted)
  const hasError = status === "error"

  const seek = hasError ? (
    <div
      data-slot="audio-player-error"
      role="alert"
      className="cn-audio-player-error flex min-w-0 flex-1 items-center"
    >
      <IconPlaceholder
        lucide="AlertCircleIcon"
        tabler="IconAlertCircle"
        hugeicons="AlertCircleIcon"
        phosphor="WarningCircleIcon"
        remixicon="RiErrorWarningLine"
      />
      <span className="truncate">This audio can&apos;t be played.</span>
    </div>
  ) : (
    <AudioPlayerSeek
      seekRef={seekRef}
      audioRef={audioRef}
      time={state.time}
      duration={state.duration}
      progress={progress}
      buffered={buffered}
      peaks={peaks}
      onSeek={seekTo}
      onSeekingChange={setIsSeeking}
    />
  )

  const play = (
    <AudioPlayerPlay
      isPlaying={isPlaying}
      isBuffering={status === "buffering"}
      isEnded={status === "ended"}
      disabled={hasError}
      onClick={togglePlay}
    />
  )

  const speed = (
    <AudioPlayerControl
      label={`Speed ${formatAudioRate(state.rate)}`}
      control="speed"
      shortcut=">"
      disabled={hasError}
      onClick={() => setRate(getNextAudioRate(playbackRates, state.rate))}
    >
      <span
        key={state.rate}
        data-slot="audio-player-speed"
        className="cn-audio-player-speed tabular-nums"
      >
        {formatAudioRate(state.rate)}
      </span>
    </AudioPlayerControl>
  )

  return (
    <div
      // A group, not a region: a chat full of voice messages would otherwise
      // fill the page's landmarks.
      role="group"
      aria-label={title ?? "Audio player"}
      tabIndex={-1}
      data-slot="audio-player"
      data-variant={variant}
      data-status={status}
      data-volume-changing={isVolumeChanging ? "" : undefined}
      className={cn(
        "cn-audio-player group/audio-player relative flex outline-none select-none",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <style href="fabricator-audio-player" precedence="components">
        {AUDIO_PLAYER_STYLES}
      </style>
      <audio
        ref={audioRef}
        data-slot="audio-player-audio"
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        preload="metadata"
      />

      {isCompact ? (
        <>
          {play}
          {seek}
          <span
            data-slot="audio-player-time"
            className="cn-audio-player-time tabular-nums"
          >
            {times.compact}
          </span>
          {speed}
        </>
      ) : (
        <>
          <div
            data-slot="audio-player-header"
            className="cn-audio-player-header flex min-w-0 items-center"
          >
            <div
              data-slot="audio-player-artwork"
              data-playing={isPlaying ? "" : undefined}
              className="cn-audio-player-artwork relative flex shrink-0 items-center justify-center overflow-hidden"
            >
              {artwork ? (
                <img
                  data-slot="audio-player-artwork-image"
                  src={artwork}
                  alt=""
                  className="pointer-events-none size-full object-cover"
                />
              ) : (
                <IconPlaceholder
                  lucide="MusicIcon"
                  tabler="IconMusic"
                  hugeicons="MusicNote01Icon"
                  phosphor="MusicNoteIcon"
                  remixicon="RiMusic2Line"
                />
              )}
            </div>
            <div
              data-slot="audio-player-meta"
              className="cn-audio-player-meta flex min-w-0 flex-1 flex-col"
            >
              {title && (
                <p
                  data-slot="audio-player-title"
                  className="cn-audio-player-title truncate"
                >
                  {title}
                </p>
              )}
              {artist && (
                <p
                  data-slot="audio-player-artist"
                  className="cn-audio-player-artist truncate"
                >
                  {artist}
                </p>
              )}
            </div>
            <span
              data-slot="audio-player-equalizer"
              aria-hidden
              className="cn-audio-player-equalizer flex shrink-0 items-end"
            >
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  data-slot="audio-player-equalizer-bar"
                  className="cn-audio-player-equalizer-bar h-full origin-bottom"
                  style={
                    { "--audio-player-bar-index": index } as AudioPlayerStyle
                  }
                />
              ))}
            </span>
          </div>
          <div
            data-slot="audio-player-timeline"
            className="cn-audio-player-timeline flex flex-col *:flex-none"
          >
            {seek}
            <div
              data-slot="audio-player-time"
              className="cn-audio-player-time flex justify-between tabular-nums"
            >
              <span data-slot="audio-player-time-current">{times.current}</span>
              <span data-slot="audio-player-time-remaining">
                <span className="sr-only">Remaining </span>
                {times.remaining}
              </span>
            </div>
          </div>
          <div
            data-slot="audio-player-bar"
            className="cn-audio-player-bar grid grid-cols-[1fr_auto_1fr] items-center"
          >
            <div className="flex justify-start">{speed}</div>
            <div
              data-slot="audio-player-transport"
              className="cn-audio-player-transport flex items-center"
            >
              <AudioPlayerControl
                label={`Back ${VIDEO_PLAYER_SKIP} seconds`}
                control="skip-back"
                shortcut="j"
                disabled={hasError}
                onClick={() =>
                  runAction({ type: "seek-by", seconds: -VIDEO_PLAYER_SKIP })
                }
              >
                <IconPlaceholder
                  lucide="RotateCcwIcon"
                  tabler="IconRotate"
                  hugeicons="RotateLeft01Icon"
                  phosphor="ArrowCounterClockwiseIcon"
                  remixicon="RiRestartLine"
                />
                <span
                  aria-hidden
                  data-slot="audio-player-skip-label"
                  className="cn-audio-player-skip-label absolute"
                >
                  {VIDEO_PLAYER_SKIP}
                </span>
              </AudioPlayerControl>
              {play}
              <AudioPlayerControl
                label={`Forward ${VIDEO_PLAYER_SKIP} seconds`}
                control="skip-forward"
                shortcut="l"
                disabled={hasError}
                onClick={() =>
                  runAction({ type: "seek-by", seconds: VIDEO_PLAYER_SKIP })
                }
              >
                <IconPlaceholder
                  lucide="RotateCwIcon"
                  tabler="IconRotateClockwise"
                  hugeicons="RotateRight01Icon"
                  phosphor="ArrowClockwiseIcon"
                  remixicon="RiRefreshLine"
                />
                <span
                  aria-hidden
                  data-slot="audio-player-skip-label"
                  className="cn-audio-player-skip-label absolute"
                >
                  {VIDEO_PLAYER_SKIP}
                </span>
              </AudioPlayerControl>
            </div>
            <div
              data-slot="audio-player-volume"
              className="cn-audio-player-volume group/audio-player-volume flex items-center justify-end"
            >
              <AudioPlayerVolumeSlider
                volume={state.isMuted ? 0 : state.volume}
                onVolumeChange={setVolume}
              />
              <AudioPlayerControl
                label={volumeLevel === "muted" ? "Unmute" : "Mute"}
                control="mute"
                shortcut="m"
                disabled={hasError}
                onClick={toggleMute}
              >
                <AudioPlayerVolumeIcon level={volumeLevel} />
              </AudioPlayerControl>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Play and pause trade places by scaling and blurring through each other;
 * a spinner takes over while the audio waits for data, and replay shows at
 * the end.
 */
function AudioPlayerPlay({
  isPlaying,
  isBuffering,
  isEnded,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-label"> & {
  isPlaying: boolean
  isBuffering: boolean
  isEnded: boolean
}) {
  const icon = isBuffering
    ? "buffering"
    : isEnded
      ? "replay"
      : isPlaying
        ? "pause"
        : "play"
  return (
    <button
      type="button"
      data-slot="audio-player-play"
      data-icon={icon}
      aria-label={isEnded ? "Replay" : isPlaying ? "Pause" : "Play"}
      aria-keyshortcuts="k"
      className={cn(
        "cn-audio-player-play relative flex shrink-0 items-center justify-center outline-none",
        className
      )}
      {...props}
    >
      <span
        data-slot="audio-player-play-icon"
        data-icon="play"
        data-visible={icon === "play" ? "" : undefined}
        className="cn-audio-player-play-icon absolute flex items-center justify-center"
      >
        <IconPlaceholder
          lucide="PlayIcon"
          tabler="IconPlayerPlay"
          hugeicons="PlayIcon"
          phosphor="PlayIcon"
          remixicon="RiPlayFill"
        />
      </span>
      <span
        data-slot="audio-player-play-icon"
        data-icon="pause"
        data-visible={icon === "pause" ? "" : undefined}
        className="cn-audio-player-play-icon absolute flex items-center justify-center"
      >
        <IconPlaceholder
          lucide="PauseIcon"
          tabler="IconPlayerPause"
          hugeicons="PauseIcon"
          phosphor="PauseIcon"
          remixicon="RiPauseFill"
        />
      </span>
      <span
        data-slot="audio-player-play-icon"
        data-icon="replay"
        data-visible={icon === "replay" ? "" : undefined}
        className="cn-audio-player-play-icon absolute flex items-center justify-center"
      >
        <IconPlaceholder
          lucide="RotateCcwIcon"
          tabler="IconRotate"
          hugeicons="RotateLeft01Icon"
          phosphor="ArrowCounterClockwiseIcon"
          remixicon="RiRestartLine"
        />
      </span>
      {isBuffering && (
        <Spinner
          data-slot="audio-player-spinner"
          className="cn-audio-player-spinner"
        />
      )}
    </button>
  )
}

function AudioPlayerVolumeIcon({ level }: { level: VideoPlayerVolumeLevel }) {
  if (level === "muted")
    return (
      <IconPlaceholder
        lucide="VolumeXIcon"
        tabler="IconVolumeOff"
        hugeicons="VolumeMute02Icon"
        phosphor="SpeakerXIcon"
        remixicon="RiVolumeMuteLine"
      />
    )
  if (level === "low")
    return (
      <IconPlaceholder
        lucide="Volume1Icon"
        tabler="IconVolume2"
        hugeicons="VolumeLowIcon"
        phosphor="SpeakerLowIcon"
        remixicon="RiVolumeDownLine"
      />
    )
  return (
    <IconPlaceholder
      lucide="Volume2Icon"
      tabler="IconVolume"
      hugeicons="VolumeHighIcon"
      phosphor="SpeakerHighIcon"
      remixicon="RiVolumeUpLine"
    />
  )
}

function AudioPlayerControl({
  label,
  control,
  shortcut,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-label"> & {
  label: string
  control: string
  /** The player's key for it, offered to assistive technology. */
  shortcut?: string
}) {
  return (
    <button
      type="button"
      data-slot="audio-player-control"
      data-control={control}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={label}
      className={cn(
        "cn-audio-player-control relative flex shrink-0 items-center justify-center outline-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Follows a pointer across a track from a press until it lets go, reading
 * each position as 0 to 1.
 */
function useTrackDrag({
  onStart,
  onMove,
  onEnd,
}: {
  onStart?: () => void
  onMove: (fraction: number) => void
  onEnd?: () => void
}) {
  const isDragging = React.useRef(false)
  const read = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return getVideoFractionAtPoint({
      x: event.clientX,
      left: rect.left,
      width: rect.width,
    })
  }
  return {
    isDragging,
    read,
    handlers: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.focus({ preventScroll: true })
        isDragging.current = true
        onStart?.()
        onMove(read(event))
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        if (isDragging.current) onMove(read(event))
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        if (!isDragging.current) return
        isDragging.current = false
        event.currentTarget.releasePointerCapture(event.pointerId)
        onEnd?.()
      },
      onPointerCancel: () => {
        if (!isDragging.current) return
        isDragging.current = false
        onEnd?.()
      },
    },
  }
}

/** How many bars fit the waveform's width, kept up to date as it resizes. */
function useWaveformBarCount(ref: React.RefObject<HTMLDivElement | null>) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setCount(
        getAudioWaveformBarCount({
          width: entry.contentRect.width,
          barWidth: WAVEFORM_BAR_WIDTH,
          gap: WAVEFORM_GAP,
        })
      )
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return count
}

function AudioPlayerSeek({
  seekRef,
  audioRef,
  time,
  duration,
  progress,
  buffered,
  peaks,
  onSeek,
  onSeekingChange,
}: {
  seekRef: React.RefObject<HTMLDivElement | null>
  audioRef: React.RefObject<HTMLAudioElement | null>
  time: number
  duration: number
  progress: number
  buffered: number
  peaks?: ReadonlyArray<number>
  onSeek: (time: number) => void
  onSeekingChange: (isSeeking: boolean) => void
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const wasPlaying = React.useRef(false)
  const waveformRef = React.useRef<HTMLDivElement>(null)
  const barCount = useWaveformBarCount(waveformRef)
  const isKnown = Number.isFinite(duration) && duration > 0
  const hasWaveform = peaks !== undefined && peaks.length > 0
  const bars = React.useMemo(
    () => (peaks ? getAudioWaveformBars(peaks, barCount) : []),
    [peaks, barCount]
  )
  const drag = useTrackDrag({
    onStart: () => {
      const audio = audioRef.current
      wasPlaying.current = audio !== null && !audio.paused
      audio?.pause()
      onSeekingChange(true)
    },
    onMove: (fraction) => {
      if (!isKnown) return
      setHover(fraction)
      onSeek(fraction * duration)
    },
    onEnd: () => {
      onSeekingChange(false)
      if (wasPlaying.current) audioRef.current?.play().catch(() => undefined)
    },
  })
  const seekStyle: AudioPlayerStyle = {
    "--audio-player-progress": progress,
    "--audio-player-buffered": buffered,
    "--audio-player-hover": hover ?? 0,
  }

  return (
    <div
      ref={seekRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={isKnown ? Math.round(duration) : 0}
      aria-valuenow={Math.round(time)}
      aria-valuetext={getVideoSeekText(time, duration)}
      aria-disabled={!isKnown || undefined}
      data-slot="audio-player-seek"
      data-waveform={hasWaveform ? "" : undefined}
      data-hovering={hover !== null ? "" : undefined}
      className="cn-audio-player-seek group/audio-player-seek relative flex min-w-0 flex-1 touch-none items-center outline-none"
      style={seekStyle}
      onKeyDown={(event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        const next = getVideoSeekKeyTime(event.key, { time, duration })
        if (next === null || !isKnown) return
        event.preventDefault()
        event.stopPropagation()
        onSeek(next)
      }}
      onPointerMove={(event) => {
        drag.handlers.onPointerMove(event)
        if (!drag.isDragging.current && event.pointerType !== "touch")
          setHover(drag.read(event))
      }}
      onPointerLeave={() => {
        if (!drag.isDragging.current) setHover(null)
      }}
      onPointerDown={drag.handlers.onPointerDown}
      onPointerUp={(event) => {
        drag.handlers.onPointerUp(event)
        if (event.pointerType === "touch") setHover(null)
      }}
      onPointerCancel={() => {
        drag.handlers.onPointerCancel()
        setHover(null)
      }}
    >
      {hasWaveform ? (
        <div
          ref={waveformRef}
          data-slot="audio-player-waveform"
          className="relative h-full w-full"
        >
          <AudioPlayerWaveformBars layer="track" bars={bars} />
          <AudioPlayerWaveformBars layer="hover" bars={bars} />
          <AudioPlayerWaveformBars layer="played" bars={bars} />
        </div>
      ) : (
        <>
          <div
            data-slot="audio-player-seek-track"
            className="cn-audio-player-seek-track relative w-full overflow-hidden"
          >
            <div
              data-slot="audio-player-seek-buffered"
              className="cn-audio-player-seek-buffered absolute inset-0 origin-left scale-x-(--audio-player-buffered)"
            />
            <div
              data-slot="audio-player-seek-hover"
              className="cn-audio-player-seek-hover absolute inset-0 origin-left scale-x-(--audio-player-hover)"
            />
            <div
              data-slot="audio-player-seek-played"
              className="cn-audio-player-seek-played absolute inset-0 origin-left scale-x-(--audio-player-progress)"
            />
          </div>
          <div
            data-slot="audio-player-seek-thumb"
            className="cn-audio-player-seek-thumb pointer-events-none absolute top-1/2 left-[calc(var(--audio-player-progress)*100%)] -translate-x-1/2 -translate-y-1/2"
          />
        </>
      )}
      {hover !== null && isKnown && (
        <div
          data-slot="audio-player-seek-preview"
          aria-hidden
          className="cn-audio-player-seek-preview pointer-events-none absolute bottom-full -translate-x-1/2 whitespace-nowrap tabular-nums"
          style={{
            left: `clamp(1.5rem, ${hover * 100}%, calc(100% - 1.5rem))`,
          }}
        >
          {formatVideoTime(hover * duration, duration)}
        </div>
      )}
    </div>
  )
}

/**
 * One layer of the waveform. The three layers draw the same bars: the track,
 * then the part under the pointer and the part played, each clipped at its
 * fraction so a bar fills partway as the playhead crosses it.
 */
function AudioPlayerWaveformBars({
  layer,
  bars,
}: {
  layer: "track" | "hover" | "played"
  bars: ReadonlyArray<number>
}) {
  return (
    <div
      aria-hidden
      data-slot="audio-player-waveform-bars"
      data-layer={layer}
      className="cn-audio-player-waveform-bars absolute inset-0 flex items-center data-[layer=hover]:[clip-path:inset(0_calc((1_-_var(--audio-player-hover))*100%)_0_0)] data-[layer=played]:[clip-path:inset(0_calc((1_-_var(--audio-player-progress))*100%)_0_0)]"
    >
      {bars.map((level, index) => (
        <span
          key={index}
          data-slot="audio-player-waveform-bar"
          className="cn-audio-player-waveform-bar min-w-0 flex-1"
          style={
            {
              height: `${level * 100}%`,
              "--audio-player-bar-index": index,
            } as AudioPlayerStyle
          }
        />
      ))}
    </div>
  )
}

function AudioPlayerVolumeSlider({
  volume,
  onVolumeChange,
}: {
  volume: number
  onVolumeChange: (volume: number) => void
}) {
  const drag = useTrackDrag({
    onMove: (fraction) => onVolumeChange(Math.round(fraction * 100) / 100),
  })
  const volumeStyle: AudioPlayerStyle = { "--audio-player-volume": volume }
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(volume * 100)}
      aria-valuetext={volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}
      data-slot="audio-player-volume-slider"
      className="cn-audio-player-volume-slider relative flex touch-none items-center outline-none"
      style={volumeStyle}
      onKeyDown={(event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        const next = getVideoVolumeKeyValue(event.key, volume)
        if (next === null) return
        event.preventDefault()
        event.stopPropagation()
        onVolumeChange(next)
      }}
      {...drag.handlers}
    >
      <div
        data-slot="audio-player-volume-track"
        className="cn-audio-player-volume-track relative w-full overflow-hidden"
      >
        <div
          data-slot="audio-player-volume-level"
          className="cn-audio-player-volume-level absolute inset-0 origin-left scale-x-(--audio-player-volume)"
        />
      </div>
      <div
        data-slot="audio-player-volume-thumb"
        className="cn-audio-player-volume-thumb pointer-events-none absolute top-1/2 left-[calc(var(--audio-player-volume)*100%)] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  )
}

export { AudioPlayer, type AudioPlayerProps, type AudioPlayerVariant }
