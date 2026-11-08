"use client"

import * as React from "react"
import { cn } from "cn"

import {
  clampVideoTime,
  formatVideoRate,
  formatVideoTime,
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
  VIDEO_PLAYER_VOLUME_READOUT_DURATION,
  type VideoPlayerAction,
  type VideoPlayerChapter,
  type VideoPlayerStatus,
  type VideoPlayerVariant,
  type VideoPlayerVolumeLevel,
} from "@/registry/bases/__base__/lib/video-player-model"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A video with its own controls, drawn over the picture so they work the same
// in full screen: play and pause in the middle, a seek bar
// with what has loaded, chapters and a time preview, play, volume, captions drawn by the player, speed and
// captions in a settings menu, picture in picture and full screen. The
// controls fade while a video plays untouched. `variant="compact"` keeps
// play, a slim seek bar, the time, mute and full screen, for cards and feeds.
// The keyboard follows the common web players: Space or K, J and L, the
// arrows, M, F, C, the digits, and < and >.

type VideoPlayerTrack = {
  src: string
  /** The language's BCP 47 tag, such as "en" or "pt-BR". */
  srcLang: string
  label: string
  kind?: "captions" | "subtitles"
  /** Show this track from the start. */
  default?: boolean
}

type VideoPlayerProps = Omit<React.ComponentProps<"div">, "title"> & {
  src: string
  poster?: string
  /** Names the player for screen readers, and shows over the default one. */
  title?: string
  variant?: VideoPlayerVariant
  /** Captions or subtitles as WebVTT files, same-origin or CORS-enabled. */
  tracks?: VideoPlayerTrack[]
  /** Marks on the seek bar, from where each chapter starts. Default only. */
  chapters?: VideoPlayerChapter[]
  /** The speeds the settings menu offers. */
  playbackRates?: ReadonlyArray<number>
  autoPlay?: boolean
  /** Start muted; browsers only autoplay a muted video. */
  muted?: boolean
  loop?: boolean
  onPlayingChange?: (isPlaying: boolean) => void
  onEnded?: () => void
}

type VideoPlayerStyle = React.CSSProperties & Record<`--${string}`, number>

type VideoPlayerMenuView = "main" | "speed" | "captions"

type VideoPlayerFlash = { id: number; icon: "play" | "pause" }

type VideoPlayerState = {
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

const INITIAL_STATE: VideoPlayerState = {
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

function readVideoState(video: HTMLVideoElement) {
  const ranges = Array.from(
    { length: video.buffered.length },
    (_, index) =>
      [video.buffered.start(index), video.buffered.end(index)] as const
  )
  return {
    isPaused: video.paused,
    isEnded: video.ended,
    hasError: video.error !== null,
    time: video.currentTime,
    duration: video.duration,
    bufferedEnd: getVideoBufferedEnd(ranges, video.currentTime),
    volume: video.volume,
    isMuted: video.muted,
    rate: video.playbackRate,
  }
}

/** Cue text without its WebVTT tags (<i>, <b>, <v Speaker>). */
function readCueText(cues: TextTrackCueList | null) {
  if (!cues) return ""
  return Array.from(cues)
    .map((cue) => (cue instanceof VTTCue ? cue.text : ""))
    .join("\n")
    .replace(/<[^>]+>/g, "")
    .trim()
}

function getFullscreenElement() {
  return typeof document === "undefined" ? null : document.fullscreenElement
}

function VideoPlayer({
  src,
  poster,
  title,
  variant = "default",
  tracks = [],
  chapters = [],
  playbackRates = VIDEO_PLAYER_RATES,
  autoPlay = false,
  muted = false,
  loop = false,
  onPlayingChange,
  onEnded,
  className,
  onKeyDown,
  onPointerMove,
  onPointerLeave,
  onFocus,
  ...props
}: VideoPlayerProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const seekRef = React.useRef<HTMLDivElement>(null)
  const settingsRef = React.useRef<HTMLButtonElement>(null)
  const idleTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const previousCaptions = React.useRef(-1)
  const menuId = React.useId()
  const isCompact = variant === "compact"

  const [state, setState] = React.useState<VideoPlayerState>({
    ...INITIAL_STATE,
    isMuted: muted,
  })
  const [isIdle, setIsIdle] = React.useState(true)
  const [isSeeking, setIsSeeking] = React.useState(false)
  const [menuView, setMenuView] = React.useState<VideoPlayerMenuView | null>(
    null
  )
  const [captionIndex, setCaptionIndex] = React.useState(() =>
    tracks.findIndex((track) => track.default)
  )
  const [cueText, setCueText] = React.useState("")
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [isPictureInPicture, setIsPictureInPicture] = React.useState(false)
  const [canPictureInPicture, setCanPictureInPicture] = React.useState(false)
  const [flash, setFlash] = React.useState<VideoPlayerFlash | null>(null)
  const [isVolumeReadoutVisible, setIsVolumeReadoutVisible] =
    React.useState(false)
  const volumeReadoutTimer =
    React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const status = getVideoPlayerStatus(state)
  const isPlaying = !state.isPaused && !state.isEnded
  const isControlsVisible = isVideoControlsVisible({
    isPlaying,
    isIdle,
    isMenuOpen: menuView !== null,
    isSeeking,
  })

  const onPlayingChangeRef = React.useRef(onPlayingChange)
  const onEndedRef = React.useRef(onEnded)
  React.useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange
    onEndedRef.current = onEnded
  })

  // The media element is the source of truth: every event re-reads it.
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () =>
      setState((current) => ({ ...current, ...readVideoState(video) }))
    const onPlay = () => {
      setState((current) => ({
        ...current,
        ...readVideoState(video),
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
        ...readVideoState(video),
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
      video.addEventListener(name, listener)
    sync()
    return () => {
      for (const [name, listener] of events)
        video.removeEventListener(name, listener)
    }
  }, [])

  // The played bar follows the playhead every frame through a CSS variable,
  // so a playing video doesn't re-render the player 60 times a second.
  React.useEffect(() => {
    const video = videoRef.current
    const seek = seekRef.current
    if (!video || !seek || !isPlaying || isSeeking) return
    let frame = requestAnimationFrame(function tick() {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        seek.style.setProperty(
          "--video-player-progress",
          String(video.currentTime / video.duration)
        )
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, isSeeking])

  // Captions are drawn by the player, above the controls when they show: the
  // chosen track is "hidden" (it loads and fires cues), the others disabled.
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const textTracks = Array.from(video.textTracks)
    textTracks.forEach((track, index) => {
      track.mode = index === captionIndex ? "hidden" : "disabled"
    })
    const selected = textTracks[captionIndex]
    if (!selected) {
      setCueText("")
      return
    }
    const onCueChange = () => setCueText(readCueText(selected.activeCues))
    onCueChange()
    selected.addEventListener("cuechange", onCueChange)
    return () => selected.removeEventListener("cuechange", onCueChange)
  }, [captionIndex, tracks.length])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setCanPictureInPicture(
      document.pictureInPictureEnabled && !video.disablePictureInPicture
    )
    const onFullscreenChange = () =>
      setIsFullscreen(getFullscreenElement() === rootRef.current)
    const onEnter = () => setIsPictureInPicture(true)
    const onLeave = () => setIsPictureInPicture(false)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    video.addEventListener("enterpictureinpicture", onEnter)
    video.addEventListener("leavepictureinpicture", onLeave)
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      video.removeEventListener("enterpictureinpicture", onEnter)
      video.removeEventListener("leavepictureinpicture", onLeave)
    }
  }, [])

  React.useEffect(
    () => () => {
      clearTimeout(idleTimer.current)
      clearTimeout(volumeReadoutTimer.current)
    },
    []
  )

  // A volume change from a key or the slider shows the level for a moment:
  // the bar's volume slider held open, with the percentage over its knob.
  const showVolumeReadout = React.useCallback(() => {
    setIsVolumeReadoutVisible(true)
    clearTimeout(volumeReadoutTimer.current)
    volumeReadoutTimer.current = setTimeout(
      () => setIsVolumeReadoutVisible(false),
      VIDEO_PLAYER_VOLUME_READOUT_DURATION
    )
  }, [])

  const wake = React.useCallback(() => {
    setIsIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(
      () => setIsIdle(true),
      VIDEO_PLAYER_IDLE_DELAY
    )
  }, [])

  const togglePlay = React.useCallback((showFlash: boolean) => {
    const video = videoRef.current
    if (!video) return
    const willPlay = video.paused || video.ended
    if (showFlash)
      setFlash((current) => ({
        id: (current?.id ?? 0) + 1,
        icon: willPlay ? "play" : "pause",
      }))
    if (willPlay) {
      // A rejected play (autoplay policy, a source that fails) shows as the
      // paused or error state; there's nothing more to do with it here.
      video.play().catch(() => undefined)
      return
    }
    video.pause()
  }, [])

  const seekTo = React.useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    const next = clampVideoTime(time, video.duration)
    video.currentTime = next
    seekRef.current?.style.setProperty(
      "--video-player-progress",
      String(Number.isFinite(video.duration) ? next / video.duration : 0)
    )
    setState((current) => ({ ...current, time: next, isEnded: false }))
  }, [])

  const setVolume = React.useCallback((volume: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = volume === 0
  }, [])

  const toggleMute = React.useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.muted && video.volume === 0) video.volume = 1
    video.muted = !video.muted
  }, [])

  const setRate = React.useCallback((rate: number) => {
    const video = videoRef.current
    if (video) video.playbackRate = rate
  }, [])

  const selectCaptions = React.useCallback((index: number) => {
    setCaptionIndex((current) => {
      if (current >= 0) previousCaptions.current = current
      return index
    })
  }, [])

  const toggleFullscreen = React.useCallback(() => {
    const root = rootRef.current
    const video = videoRef.current
    if (!root || !video) return
    if (getFullscreenElement()) {
      document.exitFullscreen().catch(() => undefined)
      return
    }
    if (document.fullscreenEnabled) {
      root.requestFullscreen().catch(() => undefined)
      return
    }
    // iOS Safari only puts the video itself in full screen, with its own
    // controls.
    if (
      "webkitEnterFullscreen" in video &&
      typeof video.webkitEnterFullscreen === "function"
    ) {
      video.webkitEnterFullscreen()
    }
  }, [])

  const togglePictureInPicture = React.useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => undefined)
      return
    }
    video.requestPictureInPicture().catch(() => undefined)
  }, [])

  const runAction = (action: VideoPlayerAction) => {
    const video = videoRef.current
    if (!video) return
    switch (action.type) {
      case "toggle-play":
        togglePlay(true)
        return
      case "seek-by":
        seekTo(video.currentTime + action.seconds)
        return
      case "seek-to":
        if (Number.isFinite(video.duration))
          seekTo(video.duration * action.fraction)
        return
      case "volume-by":
        setVolume(
          getVideoVolumeStep({
            volume: video.volume,
            isMuted: video.muted,
            delta: action.delta,
          })
        )
        showVolumeReadout()
        return
      case "toggle-mute":
        toggleMute()
        showVolumeReadout()
        return
      case "toggle-fullscreen":
        toggleFullscreen()
        return
      case "toggle-captions":
        selectCaptions(
          toggleVideoCaptions({
            current: captionIndex,
            previous: previousCaptions.current,
            count: tracks.length,
          })
        )
        return
      case "rate-by":
        setRate(
          getVideoRateStep(playbackRates, video.playbackRate, action.step)
        )
        return
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    const target = event.target
    // A focused button keeps Space and Enter; the menu and sliders keep
    // their own keys.
    if (
      target instanceof HTMLElement &&
      target !== event.currentTarget &&
      target.closest("button") &&
      (event.key === " " || event.key === "Enter")
    ) {
      return
    }
    const action = getVideoPlayerKeyAction(event)
    if (!action) return
    event.preventDefault()
    wake()
    runAction(action)
  }

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    rootRef.current?.focus({ preventScroll: true })
    if (status === "error") return
    // On touch the first tap shows the controls; the next one plays or
    // pauses.
    if (
      event.nativeEvent instanceof PointerEvent &&
      event.nativeEvent.pointerType === "touch" &&
      !isControlsVisible
    ) {
      wake()
      return
    }
    togglePlay(true)
  }

  // The default variant keeps play and pause in the middle of the picture
  // while the controls show; compact only offers play before the start and
  // replay at the end.
  const isStarted = status === "playing" || status === "paused"
  const hasCentrePlay =
    status === "idle" || status === "ended" || (!isCompact && isStarted)
  const centreAction =
    status === "ended" ? "replay" : isPlaying ? "pause" : "play"

  const volumeStyle: VideoPlayerStyle = {
    "--video-player-volume": state.isMuted ? 0 : state.volume,
  }
  const chapterSegments = isCompact
    ? []
    : getVideoChapterSegments(chapters, state.duration)
  const chapterIndex = getVideoChapterIndex(chapters, state.time)
  const chapterTitle = chapterIndex >= 0 ? chapters[chapterIndex].title : ""
  const volumeLevel = getVideoVolumeLevel(state.volume, state.isMuted)
  const progress =
    Number.isFinite(state.duration) && state.duration > 0
      ? state.time / state.duration
      : 0
  const buffered =
    Number.isFinite(state.duration) && state.duration > 0
      ? state.bufferedEnd / state.duration
      : 0

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={title ?? "Video player"}
      tabIndex={-1}
      data-slot="video-player"
      data-variant={variant}
      data-status={status}
      data-controls={isControlsVisible ? "visible" : "hidden"}
      data-fullscreen={isFullscreen ? "" : undefined}
      data-volume-changing={isVolumeReadoutVisible ? "" : undefined}
      className={cn(
        "cn-video-player group/video-player relative isolate overflow-hidden outline-none select-none",
        className
      )}
      onKeyDown={handleKeyDown}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        if (event.pointerType !== "touch") wake()
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)
        clearTimeout(idleTimer.current)
        setIsIdle(true)
      }}
      onFocus={(event) => {
        onFocus?.(event)
        wake()
      }}
      {...props}
    >
      <video
        ref={videoRef}
        data-slot="video-player-video"
        className="cn-video-player-video absolute inset-0 size-full"
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
      >
        {tracks.map((track) => (
          <track
            key={track.src}
            kind={track.kind ?? "captions"}
            src={track.src}
            srcLang={track.srcLang}
            label={track.label}
          />
        ))}
      </video>

      <div
        data-slot="video-player-surface"
        aria-hidden
        className="cn-video-player-surface absolute inset-0"
        onClick={handleSurfaceClick}
        onDoubleClick={isCompact ? undefined : toggleFullscreen}
      />

      {title && !isCompact && (
        <div
          data-slot="video-player-header"
          className="cn-video-player-header pointer-events-none absolute inset-x-0 top-0 flex items-center"
        >
          <p
            data-slot="video-player-title"
            className="cn-video-player-title truncate"
          >
            {title}
          </p>
        </div>
      )}

      <div
        data-slot="video-player-center"
        className="cn-video-player-center pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      >
        {hasCentrePlay && (
          <div
            data-slot="video-player-transport"
            className="cn-video-player-transport flex items-center"
          >
            <button
              type="button"
              data-slot="video-player-play"
              data-action={centreAction}
              aria-label={
                centreAction === "replay"
                  ? "Replay"
                  : centreAction === "pause"
                    ? "Pause video"
                    : "Play video"
              }
              className="cn-video-player-play pointer-events-auto flex items-center justify-center outline-none"
              onClick={() => togglePlay(false)}
            >
              {centreAction === "replay" && (
                <IconPlaceholder
                  lucide="RotateCcwIcon"
                  tabler="IconRotate"
                  hugeicons="ArrowReloadHorizontalIcon"
                  phosphor="ArrowCounterClockwiseIcon"
                  remixicon="RiRestartLine"
                />
              )}
              {centreAction === "pause" && (
                <IconPlaceholder
                  lucide="PauseIcon"
                  tabler="IconPlayerPause"
                  hugeicons="PauseIcon"
                  phosphor="PauseIcon"
                  remixicon="RiPauseFill"
                />
              )}
              {centreAction === "play" && (
                <IconPlaceholder
                  lucide="PlayIcon"
                  tabler="IconPlayerPlay"
                  hugeicons="PlayIcon"
                  phosphor="PlayIcon"
                  remixicon="RiPlayFill"
                />
              )}
            </button>
          </div>
        )}
        {status === "buffering" && (
          <Spinner
            data-slot="video-player-spinner"
            className="cn-video-player-spinner"
          />
        )}
        {status === "error" && (
          <div
            data-slot="video-player-error"
            role="alert"
            className="cn-video-player-error flex flex-col items-center text-center"
          >
            <IconPlaceholder
              lucide="AlertCircleIcon"
              tabler="IconAlertCircle"
              hugeicons="AlertCircleIcon"
              phosphor="WarningCircleIcon"
              remixicon="RiErrorWarningLine"
            />
            This video can&apos;t be played.
          </div>
        )}
        {isCompact &&
          flash &&
          (status === "playing" || status === "paused") && (
            <span
              key={flash.id}
              data-slot="video-player-flash"
              aria-hidden
              className="cn-video-player-flash absolute flex items-center justify-center"
              onAnimationEnd={() => setFlash(null)}
            >
              {flash.icon === "play" ? (
                <IconPlaceholder
                  lucide="PlayIcon"
                  tabler="IconPlayerPlay"
                  hugeicons="PlayIcon"
                  phosphor="PlayIcon"
                  remixicon="RiPlayFill"
                />
              ) : (
                <IconPlaceholder
                  lucide="PauseIcon"
                  tabler="IconPlayerPause"
                  hugeicons="PauseIcon"
                  phosphor="PauseIcon"
                  remixicon="RiPauseFill"
                />
              )}
            </span>
          )}
      </div>

      {cueText && (
        <div
          data-slot="video-player-captions"
          className="cn-video-player-captions pointer-events-none absolute inset-x-0 flex justify-center text-center"
        >
          <span className="cn-video-player-cue whitespace-pre-line">
            {cueText}
          </span>
        </div>
      )}

      <div
        data-slot="video-player-controls"
        className="cn-video-player-controls absolute inset-x-0 bottom-0 flex flex-col"
      >
        {!isCompact && (
          <VideoPlayerSeek
            seekRef={seekRef}
            time={state.time}
            duration={state.duration}
            progress={progress}
            buffered={buffered}
            chapters={chapters}
            chapterMask={getVideoChapterMask(chapterSegments)}
            onSeek={seekTo}
            onSeekingChange={setIsSeeking}
            videoRef={videoRef}
          />
        )}
        <div
          data-slot="video-player-bar"
          className="cn-video-player-bar flex items-center"
        >
          <VideoPlayerControl
            label={isPlaying ? "Pause" : "Play"}
            control="play"
            shortcut="k"
            onClick={() => togglePlay(false)}
          >
            {isPlaying ? (
              <IconPlaceholder
                lucide="PauseIcon"
                tabler="IconPlayerPause"
                hugeicons="PauseIcon"
                phosphor="PauseIcon"
                remixicon="RiPauseFill"
              />
            ) : (
              <IconPlaceholder
                lucide="PlayIcon"
                tabler="IconPlayerPlay"
                hugeicons="PlayIcon"
                phosphor="PlayIcon"
                remixicon="RiPlayFill"
              />
            )}
          </VideoPlayerControl>
          {isCompact && (
            <VideoPlayerSeek
              seekRef={seekRef}
              time={state.time}
              duration={state.duration}
              progress={progress}
              buffered={buffered}
              chapters={[]}
              chapterMask="none"
              onSeek={seekTo}
              onSeekingChange={setIsSeeking}
              videoRef={videoRef}
            />
          )}
          <div
            data-slot="video-player-volume"
            className="cn-video-player-volume group/video-player-volume relative flex items-center"
            style={volumeStyle}
          >
            <VideoPlayerControl
              label={volumeLevel === "muted" ? "Unmute" : "Mute"}
              control="mute"
              shortcut="m"
              onClick={toggleMute}
            >
              <VideoPlayerVolumeIcon level={volumeLevel} />
            </VideoPlayerControl>
            {!isCompact && (
              <VideoPlayerVolumeSlider
                volume={state.isMuted ? 0 : state.volume}
                onVolumeChange={(volume) => {
                  setVolume(volume)
                  showVolumeReadout()
                }}
              />
            )}
            <div
              role="status"
              aria-hidden={!isVolumeReadoutVisible}
              data-slot="video-player-volume-readout"
              data-visible={isVolumeReadoutVisible ? "" : undefined}
              className="cn-video-player-volume-readout pointer-events-none absolute -translate-x-1/2 text-center whitespace-nowrap tabular-nums"
            >
              <span className="sr-only">Volume </span>
              {formatVideoVolume(state.volume, state.isMuted)}
            </div>
          </div>
          <span
            data-slot="video-player-time"
            className="cn-video-player-time tabular-nums"
          >
            {isCompact ? (
              status === "idle" ? (
                formatVideoTime(state.duration)
              ) : (
                `-${formatVideoTime(
                  Math.max(0, state.duration - state.time),
                  state.duration
                )}`
              )
            ) : (
              <>
                {formatVideoTime(state.time, state.duration)}
                <span className="cn-video-player-time-separator"> / </span>
                {formatVideoTime(state.duration)}
              </>
            )}
          </span>
          {!isCompact && chapterTitle && (
            <span
              data-slot="video-player-chapter"
              className="cn-video-player-chapter min-w-0 truncate"
            >
              {chapterTitle}
            </span>
          )}
          {!isCompact && <span className="flex-1" />}
          {!isCompact && tracks.length > 0 && (
            <VideoPlayerControl
              label="Captions"
              control="captions"
              shortcut="c"
              aria-pressed={captionIndex >= 0}
              onClick={() => runAction({ type: "toggle-captions" })}
            >
              <IconPlaceholder
                lucide="CaptionsIcon"
                tabler="IconBadgeCc"
                hugeicons="ClosedCaptionIcon"
                phosphor="ClosedCaptioningIcon"
                remixicon="RiClosedCaptioningLine"
              />
            </VideoPlayerControl>
          )}
          {!isCompact && (
            <VideoPlayerControl
              ref={settingsRef}
              label="Settings"
              control="settings"
              aria-haspopup="menu"
              aria-expanded={menuView !== null}
              aria-controls={menuView !== null ? menuId : undefined}
              onClick={() =>
                setMenuView((current) => (current === null ? "main" : null))
              }
            >
              <IconPlaceholder
                lucide="SettingsIcon"
                tabler="IconSettings"
                hugeicons="Settings01Icon"
                phosphor="GearIcon"
                remixicon="RiSettings3Line"
              />
            </VideoPlayerControl>
          )}
          {!isCompact && canPictureInPicture && (
            <VideoPlayerControl
              label={
                isPictureInPicture
                  ? "Exit picture in picture"
                  : "Picture in picture"
              }
              control="picture-in-picture"
              onClick={togglePictureInPicture}
            >
              <IconPlaceholder
                lucide="PictureInPicture2Icon"
                tabler="IconPictureInPicture"
                hugeicons="PictureInPictureOnIcon"
                phosphor="PictureInPictureIcon"
                remixicon="RiPictureInPictureLine"
              />
            </VideoPlayerControl>
          )}
          <VideoPlayerControl
            label={isFullscreen ? "Exit full screen" : "Full screen"}
            control="fullscreen"
            shortcut="f"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <IconPlaceholder
                lucide="MinimizeIcon"
                tabler="IconMinimize"
                hugeicons="MinimizeScreenIcon"
                phosphor="CornersInIcon"
                remixicon="RiFullscreenExitLine"
              />
            ) : (
              <IconPlaceholder
                lucide="MaximizeIcon"
                tabler="IconMaximize"
                hugeicons="MaximizeScreenIcon"
                phosphor="CornersOutIcon"
                remixicon="RiFullscreenLine"
              />
            )}
          </VideoPlayerControl>
        </div>
      </div>

      {menuView !== null && (
        <VideoPlayerMenu
          id={menuId}
          view={menuView}
          onViewChange={setMenuView}
          triggerRef={settingsRef}
          rate={state.rate}
          rates={playbackRates}
          onRateChange={setRate}
          tracks={tracks}
          captionIndex={captionIndex}
          onCaptionsChange={selectCaptions}
        />
      )}
    </div>
  )
}

function VideoPlayerVolumeIcon({ level }: { level: VideoPlayerVolumeLevel }) {
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

function VideoPlayerControl({
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
      data-slot="video-player-control"
      data-control={control}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={label}
      className={cn(
        "cn-video-player-control relative flex shrink-0 items-center justify-center outline-none",
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

function VideoPlayerSeek({
  seekRef,
  videoRef,
  time,
  duration,
  progress,
  buffered,
  chapters,
  chapterMask,
  onSeek,
  onSeekingChange,
}: {
  seekRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  time: number
  duration: number
  progress: number
  buffered: number
  chapters: ReadonlyArray<VideoPlayerChapter>
  chapterMask: string
  onSeek: (time: number) => void
  onSeekingChange: (isSeeking: boolean) => void
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const wasPlaying = React.useRef(false)
  const isKnown = Number.isFinite(duration) && duration > 0
  const drag = useTrackDrag({
    onStart: () => {
      const video = videoRef.current
      wasPlaying.current = video !== null && !video.paused
      video?.pause()
      onSeekingChange(true)
    },
    onMove: (fraction) => {
      if (!isKnown) return
      setHover(fraction)
      onSeek(fraction * duration)
    },
    onEnd: () => {
      onSeekingChange(false)
      if (wasPlaying.current) videoRef.current?.play().catch(() => undefined)
    },
  })
  const seekStyle: VideoPlayerStyle = {
    "--video-player-progress": progress,
    "--video-player-buffered": buffered,
  }
  const previewTime = hover === null ? 0 : hover * duration
  const previewChapter = getVideoChapterIndex(chapters, previewTime)

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
      data-slot="video-player-seek"
      className="cn-video-player-seek group/video-player-seek relative flex min-w-0 flex-1 touch-none items-center outline-none"
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
      <div
        data-slot="video-player-seek-track"
        className="cn-video-player-seek-track relative w-full overflow-hidden"
        style={{ maskImage: chapterMask }}
      >
        <div
          data-slot="video-player-seek-buffered"
          className="cn-video-player-seek-buffered absolute inset-0 origin-left scale-x-(--video-player-buffered)"
        />
        {hover !== null && (
          <div
            data-slot="video-player-seek-hover"
            className="cn-video-player-seek-hover absolute inset-0 origin-left"
            style={{ transform: `scaleX(${hover})` }}
          />
        )}
        <div
          data-slot="video-player-seek-played"
          className="cn-video-player-seek-played absolute inset-0 origin-left scale-x-(--video-player-progress)"
        />
      </div>
      <div
        data-slot="video-player-seek-thumb"
        className="cn-video-player-seek-thumb pointer-events-none absolute top-1/2 left-[calc(var(--video-player-progress)*100%)] -translate-x-1/2 -translate-y-1/2"
      />
      {hover !== null && isKnown && (
        <div
          data-slot="video-player-seek-preview"
          aria-hidden
          className="cn-video-player-seek-preview pointer-events-none absolute bottom-full flex -translate-x-1/2 flex-col items-center whitespace-nowrap"
          style={{
            left: `clamp(2.5rem, ${hover * 100}%, calc(100% - 2.5rem))`,
          }}
        >
          {previewChapter >= 0 && (
            <span className="cn-video-player-seek-preview-chapter max-w-48 truncate">
              {chapters[previewChapter].title}
            </span>
          )}
          <span className="tabular-nums">
            {formatVideoTime(previewTime, duration)}
          </span>
        </div>
      )}
    </div>
  )
}

function VideoPlayerVolumeSlider({
  volume,
  onVolumeChange,
}: {
  volume: number
  onVolumeChange: (volume: number) => void
}) {
  const drag = useTrackDrag({
    onMove: (fraction) => onVolumeChange(Math.round(fraction * 100) / 100),
  })
  const volumeStyle: VideoPlayerStyle = { "--video-player-volume": volume }
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(volume * 100)}
      aria-valuetext={volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}
      data-slot="video-player-volume-slider"
      className="cn-video-player-volume-slider relative flex touch-none items-center outline-none"
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
        data-slot="video-player-volume-track"
        className="cn-video-player-volume-track relative w-full overflow-hidden"
      >
        <div
          data-slot="video-player-volume-level"
          className="cn-video-player-volume-level absolute inset-0 origin-left scale-x-(--video-player-volume)"
        />
      </div>
      <div
        data-slot="video-player-volume-thumb"
        className="cn-video-player-volume-thumb pointer-events-none absolute top-1/2 left-[calc(var(--video-player-volume)*100%)] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  )
}

function getMenuItems(menu: HTMLElement | null) {
  return Array.from(
    menu?.querySelectorAll<HTMLElement>("[data-slot=video-player-menu-item]") ??
      []
  )
}

/**
 * Settings, drawn inside the player so it stays in full screen: speed and
 * captions, each a page of choices behind a row that shows the current one.
 * The WAI-ARIA menu pattern: arrows move, Enter, Space and Right open or
 * pick, Left and Escape go back, Escape on the first page closes.
 */
function VideoPlayerMenu({
  id,
  view,
  onViewChange,
  triggerRef,
  rate,
  rates,
  onRateChange,
  tracks,
  captionIndex,
  onCaptionsChange,
}: {
  id: string
  view: VideoPlayerMenuView
  onViewChange: (view: VideoPlayerMenuView | null) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  rate: number
  rates: ReadonlyArray<number>
  onRateChange: (rate: number) => void
  tracks: ReadonlyArray<VideoPlayerTrack>
  captionIndex: number
  onCaptionsChange: (index: number) => void
}) {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const returnTo = React.useRef<VideoPlayerMenuView | null>(null)

  const getItems = () => getMenuItems(menuRef.current)

  // Each page opens with focus on its checked choice, or on the row it came
  // back to.
  React.useEffect(() => {
    const items = getMenuItems(menuRef.current)
    const target =
      items.find((item) => item.dataset.page === returnTo.current) ??
      items.find((item) => item.getAttribute("aria-checked") === "true") ??
      items[0]
    target?.focus({ preventScroll: true })
    returnTo.current = null
  }, [view])

  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (menuRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      onViewChange(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [onViewChange, triggerRef])

  const close = () => {
    onViewChange(null)
    triggerRef.current?.focus({ preventScroll: true })
  }

  const back = () => {
    returnTo.current = view
    onViewChange("main")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getItems()
    const index = items.findIndex((item) => item === document.activeElement)
    const focusAt = (next: number) =>
      items[(next + items.length) % items.length]?.focus({
        preventScroll: true,
      })
    event.stopPropagation()
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        focusAt(index + 1)
        return
      case "ArrowUp":
        event.preventDefault()
        focusAt(index - 1)
        return
      case "Home":
        event.preventDefault()
        focusAt(0)
        return
      case "End":
        event.preventDefault()
        focusAt(items.length - 1)
        return
      case "ArrowRight": {
        const page = items[index]?.dataset.page
        if (view === "main" && (page === "speed" || page === "captions")) {
          event.preventDefault()
          onViewChange(page)
        }
        return
      }
      case "ArrowLeft":
        if (view !== "main") {
          event.preventDefault()
          back()
        }
        return
      case "Escape":
        event.preventDefault()
        if (view === "main") close()
        else back()
        return
      case "Tab":
        onViewChange(null)
        return
    }
  }

  const captionLabel = captionIndex >= 0 ? tracks[captionIndex]?.label : "Off"

  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={
        view === "speed"
          ? "Speed"
          : view === "captions"
            ? "Captions"
            : "Settings"
      }
      data-slot="video-player-menu"
      data-view={view}
      className="cn-video-player-menu absolute z-10 flex flex-col"
      onKeyDown={handleKeyDown}
    >
      {view === "main" && (
        <>
          <VideoPlayerMenuItem
            data-page="speed"
            aria-haspopup="menu"
            onClick={() => onViewChange("speed")}
          >
            <IconPlaceholder
              lucide="GaugeIcon"
              tabler="IconGauge"
              hugeicons="DashboardSpeed01Icon"
              phosphor="GaugeIcon"
              remixicon="RiDashboard3Line"
            />
            <span className="flex-1">Speed</span>
            <span
              data-slot="video-player-menu-value"
              className="cn-video-player-menu-value"
            >
              {formatVideoRate(rate)}
            </span>
            <IconPlaceholder
              lucide="ChevronRightIcon"
              tabler="IconChevronRight"
              hugeicons="ArrowRight01Icon"
              phosphor="CaretRightIcon"
              remixicon="RiArrowRightSLine"
            />
          </VideoPlayerMenuItem>
          {tracks.length > 0 && (
            <VideoPlayerMenuItem
              data-page="captions"
              aria-haspopup="menu"
              onClick={() => onViewChange("captions")}
            >
              <IconPlaceholder
                lucide="CaptionsIcon"
                tabler="IconBadgeCc"
                hugeicons="ClosedCaptionIcon"
                phosphor="ClosedCaptioningIcon"
                remixicon="RiClosedCaptioningLine"
              />
              <span className="flex-1">Captions</span>
              <span
                data-slot="video-player-menu-value"
                className="cn-video-player-menu-value"
              >
                {captionLabel}
              </span>
              <IconPlaceholder
                lucide="ChevronRightIcon"
                tabler="IconChevronRight"
                hugeicons="ArrowRight01Icon"
                phosphor="CaretRightIcon"
                remixicon="RiArrowRightSLine"
              />
            </VideoPlayerMenuItem>
          )}
        </>
      )}
      {view !== "main" && (
        <>
          <VideoPlayerMenuItem data-back="" onClick={back}>
            <IconPlaceholder
              lucide="ChevronLeftIcon"
              tabler="IconChevronLeft"
              hugeicons="ArrowLeft01Icon"
              phosphor="CaretLeftIcon"
              remixicon="RiArrowLeftSLine"
            />
            <span className="flex-1">
              {view === "speed" ? "Speed" : "Captions"}
            </span>
          </VideoPlayerMenuItem>
          <div
            role="separator"
            data-slot="video-player-menu-separator"
            className="cn-video-player-menu-separator"
          />
        </>
      )}
      {view === "speed" &&
        rates.map((option) => (
          <VideoPlayerMenuItem
            key={option}
            role="menuitemradio"
            aria-checked={option === rate}
            onClick={() => {
              onRateChange(option)
              back()
            }}
          >
            <VideoPlayerMenuCheck isChecked={option === rate} />
            {formatVideoRate(option)}
          </VideoPlayerMenuItem>
        ))}
      {view === "captions" &&
        [{ label: "Off" }, ...tracks].map((track, index) => (
          <VideoPlayerMenuItem
            key={track.label}
            role="menuitemradio"
            aria-checked={index - 1 === captionIndex}
            onClick={() => {
              onCaptionsChange(index - 1)
              back()
            }}
          >
            <VideoPlayerMenuCheck isChecked={index - 1 === captionIndex} />
            {track.label}
          </VideoPlayerMenuItem>
        ))}
    </div>
  )
}

function VideoPlayerMenuItem({
  role = "menuitem",
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      role={role}
      tabIndex={-1}
      data-slot="video-player-menu-item"
      className={cn(
        "cn-video-player-menu-item flex w-full items-center text-start outline-none",
        className
      )}
      {...props}
    />
  )
}

function VideoPlayerMenuCheck({ isChecked }: { isChecked: boolean }) {
  return (
    <span
      data-slot="video-player-menu-check"
      data-checked={isChecked ? "" : undefined}
      className="cn-video-player-menu-check flex items-center justify-center"
    >
      {isChecked && (
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
      )}
    </span>
  )
}

export {
  VideoPlayer,
  type VideoPlayerChapter,
  type VideoPlayerProps,
  type VideoPlayerTrack,
  type VideoPlayerVariant,
}
