import * as React from "react"
import {
  AlertCircleIcon,
  CaptionsIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GaugeIcon,
  IconProvider,
  MaximizeIcon,
  PauseIcon,
  PictureInPicture2Icon,
  PlayIcon,
  RotateCcwIcon,
  SettingsIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { useEvent } from "expo"
import { LinearGradient } from "expo-linear-gradient"
import {
  isPictureInPictureSupported,
  useVideoPlayer,
  VideoView,
} from "expo-video"
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  clampVideoTime,
  formatVideoRate,
  formatVideoTime,
  getVideoChapterIndex,
  getVideoChapterSegments,
  getVideoPlayerStatus,
  getVideoSeekKeyTime,
  getVideoSeekText,
  getVideoVolumeLevel,
  isVideoControlsVisible,
  toggleVideoCaptions,
  VIDEO_PLAYER_IDLE_DELAY,
  VIDEO_PLAYER_RATES,
  type VideoPlayerChapter,
  type VideoPlayerChapterSegment,
  type VideoPlayerVariant,
} from "@/registry/fabricator/shared/lib/video-player-model"
import { getTouchSlop } from "@/registry/native/lib/density-scale"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  getVideoCaptionText,
  parseVideoCaptions,
  type VideoCaptionCue,
} from "@/registry/native/lib/video-captions-model"
import { DensityScope, useControlSize } from "@/registry/native/ui/density"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/registry/native/ui/sheet"
import { Spinner } from "@/registry/native/ui/spinner"
import { Text, TextStyle } from "@/registry/native/ui/text"

// The website's Video Player on React Native, over expo-video's VideoView with
// its own controls drawn on the picture: a seek bar with what has loaded and
// chapters, play, mute, the time, captions read from WebVTT files (the
// website hands them to the browser; expo-video only plays captions inside the
// stream), speed and captions in a sheet, picture in picture and the system's
// full screen. A tap shows or hides the controls and a double tap plays or
// pauses; the controls fade while a video plays untouched. The device's
// buttons set the volume, so there's no volume slider, as on the website's
// touch screens.

type VideoPlayerTrack = {
  src: string
  /** The language's BCP 47 tag, such as "en" or "pt-BR". */
  srcLang: string
  label: string
  kind?: "captions" | "subtitles"
  /** Show this track from the start. */
  default?: boolean
}

type VideoPlayerProps = Omit<React.ComponentProps<typeof View>, "children"> & {
  src: string
  poster?: string
  /** Names the player for screen readers, and shows over the default one. */
  title?: string
  variant?: VideoPlayerVariant
  /** Captions or subtitles as WebVTT files. */
  tracks?: VideoPlayerTrack[]
  /** Marks on the seek bar, from where each chapter starts. Default only. */
  chapters?: VideoPlayerChapter[]
  /** The speeds the settings sheet offers. */
  playbackRates?: ReadonlyArray<number>
  autoPlay?: boolean
  /** Start muted. */
  muted?: boolean
  loop?: boolean
  onPlayingChange?: (isPlaying: boolean) => void
  onEnded?: () => void
  className?: string
}

type VideoPlayerMenuView = "main" | "speed" | "captions"

// Where the white chrome sits on footage: the same scrims as the website's.
const BOTTOM_SCRIM = [
  "rgba(0,0,0,0)",
  "rgba(0,0,0,0.3)",
  "rgba(0,0,0,0.7)",
] as const
const TOP_SCRIM = ["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"] as const

/** How often the player reports the time; the played bar glides between. */
const TIME_UPDATE_SECONDS = 0.25

const NARROW_WIDTH = 480

/** How soon a second press on the picture counts as a double press. */
const DOUBLE_PRESS_MS = 300

const SEEK_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

function toKnownDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0 ? duration : Number.NaN
}

/** A VideoPlayerTrack's cues, fetched once it's chosen. */
function useCaptionCues(track: VideoPlayerTrack | undefined) {
  const [loaded, setLoaded] = React.useState<{
    src: string
    cues: VideoCaptionCue[]
  } | null>(null)
  const src = track?.src
  React.useEffect(() => {
    if (!src) return
    let isCurrent = true
    fetch(src)
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (isCurrent) setLoaded({ src, cues: parseVideoCaptions(text) })
      })
      .catch((error: unknown) => {
        // A captions file that can't load leaves the video without captions.
        console.warn(`Video Player: couldn't load captions from ${src}`, error)
      })
    return () => {
      isCurrent = false
    }
  }, [src])
  return src && loaded?.src === src ? loaded.cues : []
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
  onLayout,
  ...props
}: VideoPlayerProps) {
  const isCompact = variant === "compact"
  const viewRef = React.useRef<VideoView>(null)
  const idleTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const previousCaptions = React.useRef(-1)
  const feedback = useFeedback()
  // The bar holds up to eight controls, so it takes the smaller step; each
  // keeps a 44pt target through its hitSlop.
  const control = useControlSize("sm")
  const [width, setWidth] = React.useState(0)
  // Under 480pt picture in picture makes room for the rest of the bar.
  const isNarrow = width > 0 && width < NARROW_WIDTH
  const moveMotion = useMotion("move")

  const player = useVideoPlayer(src, (created) => {
    created.loop = loop
    created.muted = muted
    created.timeUpdateEventInterval = TIME_UPDATE_SECONDS
    if (autoPlay) created.play()
  })

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  })
  const { status: loadStatus } = useEvent(player, "statusChange", {
    status: player.status,
  })
  const { currentTime: time, bufferedPosition } = useEvent(
    player,
    "timeUpdate",
    {
      currentTime: player.currentTime,
      currentLiveTimestamp: null,
      currentOffsetFromLive: null,
      bufferedPosition: player.bufferedPosition,
    }
  )
  const { muted: isMuted } = useEvent(player, "mutedChange", {
    muted: player.muted,
  })
  const { playbackRate: rate } = useEvent(player, "playbackRateChange", {
    playbackRate: player.playbackRate,
  })
  const [duration, setDuration] = React.useState(Number.NaN)
  const [hasStarted, setHasStarted] = React.useState(false)
  const [isEnded, setIsEnded] = React.useState(false)
  const [isIdle, setIsIdle] = React.useState(true)
  const [isSeeking, setIsSeeking] = React.useState(false)
  const [seekTime, setSeekTime] = React.useState<number | null>(null)
  const [menuView, setMenuView] = React.useState<VideoPlayerMenuView | null>(
    null
  )
  const [captionIndex, setCaptionIndex] = React.useState(() =>
    tracks.findIndex((track) => track.default)
  )
  const [canPictureInPicture] = React.useState(isPictureInPictureSupported)
  const [isPictureInPicture, setIsPictureInPicture] = React.useState(false)

  const latest = React.useRef({ onPlayingChange, onEnded })
  React.useEffect(() => {
    latest.current = { onPlayingChange, onEnded }
  })

  React.useEffect(() => {
    if (isPlaying) {
      setHasStarted(true)
      setIsEnded(false)
    }
    latest.current.onPlayingChange?.(isPlaying)
  }, [isPlaying])

  React.useEffect(() => {
    const subscriptions = [
      player.addListener("sourceLoad", (event) =>
        setDuration(toKnownDuration(event.duration))
      ),
      player.addListener("statusChange", (event) => {
        if (event.status === "readyToPlay")
          setDuration(toKnownDuration(player.duration))
      }),
      player.addListener("playToEnd", () => {
        // A looping video passes its end without stopping.
        if (player.loop) return
        setIsEnded(true)
        latest.current.onEnded?.()
      }),
    ]
    setDuration(toKnownDuration(player.duration))
    return () => {
      for (const subscription of subscriptions) subscription.remove()
    }
  }, [player])

  React.useEffect(() => () => clearTimeout(idleTimer.current), [])

  const shownTime = seekTime ?? time
  const status = getVideoPlayerStatus({
    isPaused: !isPlaying,
    isWaiting: loadStatus === "loading",
    isEnded,
    hasError: loadStatus === "error",
    hasStarted,
  })
  const isMenuOpen = menuView !== null
  const isControlsVisible = isVideoControlsVisible({
    isPlaying: isPlaying && !isEnded,
    isIdle,
    isMenuOpen,
    isSeeking,
  })

  const wake = React.useCallback(() => {
    setIsIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(
      () => setIsIdle(true),
      VIDEO_PLAYER_IDLE_DELAY
    )
  }, [])

  const controlsOpacity = useSharedValue(1)
  React.useEffect(() => {
    controlsOpacity.value = withTiming(isControlsVisible ? 1 : 0, {
      duration: isControlsVisible ? moveMotion.enterMs : moveMotion.exitMs,
      easing: moveMotion.moveEasing,
    })
  }, [controlsOpacity, isControlsVisible, moveMotion])
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }))

  const flash = useSharedValue(0)
  const [flashIcon, setFlashIcon] = React.useState<"play" | "pause">("play")
  const sheetMotion = useMotion("sheet")
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }))

  const togglePlay = React.useCallback(
    (showFlash: boolean) => {
      const willPlay = !player.playing
      feedback("tap")
      if (showFlash && !sheetMotion.isReduced) {
        setFlashIcon(willPlay ? "play" : "pause")
        flash.value = 1
        flash.value = withTiming(0, {
          duration: sheetMotion.enterMs,
          easing: sheetMotion.exitEasing,
        })
      }
      if (!willPlay) {
        player.pause()
        return
      }
      if (isEnded) player.replay()
      player.play()
    },
    [feedback, flash, isEnded, player, sheetMotion]
  )

  const seekTo = React.useCallback(
    (next: number) => {
      player.currentTime = clampVideoTime(next, duration)
      setIsEnded(false)
    },
    [duration, player]
  )

  const toggleMute = () => {
    feedback(isMuted ? "toggle-on" : "toggle-off")
    player.muted = !player.muted
    wake()
  }

  const selectCaptions = (index: number) => {
    if (captionIndex >= 0) previousCaptions.current = captionIndex
    setCaptionIndex(index)
  }

  const cues = useCaptionCues(tracks[captionIndex])
  const cueText = getVideoCaptionText(cues, shownTime)

  // A press on the picture waits out a second one: one shows or hides the
  // controls, two play or pause.
  const lastSurfacePress = React.useRef(0)
  const surfaceTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const surface = React.useRef({ isControlsVisible, isPlaying })
  React.useEffect(() => {
    surface.current = { isControlsVisible, isPlaying }
  })
  React.useEffect(() => () => clearTimeout(surfaceTimer.current), [])
  const handleSurfacePress = () => {
    const now = Date.now()
    clearTimeout(surfaceTimer.current)
    if (now - lastSurfacePress.current < DOUBLE_PRESS_MS) {
      lastSurfacePress.current = 0
      if (status !== "error") togglePlay(isCompact)
      return
    }
    lastSurfacePress.current = now
    surfaceTimer.current = setTimeout(() => {
      if (surface.current.isControlsVisible && surface.current.isPlaying) {
        clearTimeout(idleTimer.current)
        setIsIdle(true)
        return
      }
      wake()
    }, DOUBLE_PRESS_MS)
  }

  const segments = isCompact ? [] : getVideoChapterSegments(chapters, duration)
  const chapterIndex = getVideoChapterIndex(chapters, shownTime)
  const chapterTitle = chapterIndex >= 0 ? chapters[chapterIndex].title : ""
  const volumeLevel = getVideoVolumeLevel(player.volume, isMuted)
  const iconSize = parseNumber(
    useCSSVariable(isCompact ? "--density-icon-16" : "--density-20"),
    20
  )
  const centerIconSize = parseNumber(
    useCSSVariable(isCompact ? "--density-20" : "--density-28"),
    28
  )

  const seek = (
    <VideoPlayerSeek
      time={shownTime}
      duration={duration}
      buffered={bufferedPosition}
      isPlaying={isPlaying}
      segments={segments}
      chapters={isCompact ? [] : chapters}
      variant={variant}
      onSeekStart={() => {
        setIsSeeking(true)
        feedback("grab")
        return player.playing
      }}
      onSeekMove={(next) => {
        setSeekTime(next)
        player.currentTime = next
      }}
      onSeekEnd={(next, wasPlaying) => {
        seekTo(next)
        setSeekTime(null)
        setIsSeeking(false)
        feedback("drop")
        wake()
        if (wasPlaying) player.play()
      }}
      onStep={(next) => {
        seekTo(next)
        wake()
      }}
      onPausePlayback={() => player.pause()}
    />
  )

  return (
    <DensityScope density={control.density}>
      <View
        data-slot="video-player"
        data-variant={variant}
        data-status={status}
        data-controls={isControlsVisible ? "visible" : "hidden"}
        accessibilityLabel={title ?? "Video player"}
        className={cn("cn-video-player relative overflow-hidden", className)}
        onLayout={(event: LayoutChangeEvent) => {
          setWidth(event.nativeEvent.layout.width)
          onLayout?.(event)
        }}
        {...props}
      >
        <View
          data-slot="video-player-video"
          className="cn-video-player-video absolute inset-0"
        >
          {/* iOS draws its own broken-play glyph over a source that fails;
              the player's message takes its place. */}
          {status !== "error" && (
            <VideoView
              ref={viewRef}
              player={player}
              nativeControls={false}
              contentFit="contain"
              allowsPictureInPicture={canPictureInPicture}
              onPictureInPictureStart={() => setIsPictureInPicture(true)}
              onPictureInPictureStop={() => setIsPictureInPicture(false)}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
        {poster && status === "idle" && (
          <Image
            data-slot="video-player-poster"
            source={{ uri: poster }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            className="cn-video-player-poster absolute inset-0"
          />
        )}

        <Pressable
          data-slot="video-player-surface"
          onPress={handleSurfacePress}
          accessible={false}
          importantForAccessibility="no"
          className="cn-video-player-surface absolute inset-0"
        />

        {title && !isCompact && (
          <Animated.View
            data-slot="video-player-header"
            pointerEvents="none"
            className="cn-video-player-header absolute inset-x-0 top-0 flex-row items-center"
            style={controlsStyle}
          >
            <LinearGradient
              colors={TOP_SCRIM}
              pointerEvents="none"
              style={{ position: "absolute", inset: 0 }}
            />
            <Text
              data-slot="video-player-title"
              numberOfLines={1}
              className="cn-video-player-title flex-1"
            >
              {title}
            </Text>
          </Animated.View>
        )}

        <View
          data-slot="video-player-center"
          pointerEvents="box-none"
          className="cn-video-player-center absolute inset-0 items-center justify-center"
        >
          {isCompact && (status === "idle" || status === "ended") && (
            <Pressable
              data-slot="video-player-play"
              data-action={status === "ended" ? "replay" : "play"}
              role="button"
              accessibilityLabel={status === "ended" ? "Replay" : "Play"}
              className="cn-video-player-play items-center justify-center"
              onPress={() => {
                togglePlay(false)
                wake()
              }}
            >
              <IconProvider color="white" size={centerIconSize}>
                {status === "ended" ? (
                  <RotateCcwIcon strokeWidth={1.5} />
                ) : (
                  <PlayIcon fill="white" strokeWidth={1.5} />
                )}
              </IconProvider>
            </Pressable>
          )}
          {!isCompact && status !== "error" && (
            <Animated.View
              data-slot="video-player-transport"
              pointerEvents={isControlsVisible ? "box-none" : "none"}
              className="cn-video-player-transport flex-row items-center"
              style={controlsStyle}
            >
              {status !== "buffering" && (
                <Pressable
                  data-slot="video-player-play"
                  data-action={
                    status === "ended" ? "replay" : isPlaying ? "pause" : "play"
                  }
                  role="button"
                  accessibilityLabel={
                    status === "ended"
                      ? "Replay"
                      : isPlaying
                        ? "Pause video"
                        : "Play video"
                  }
                  className="cn-video-player-play items-center justify-center"
                  onPress={() => {
                    togglePlay(false)
                    wake()
                  }}
                >
                  <IconProvider color="white" size={centerIconSize}>
                    {status === "ended" && <RotateCcwIcon strokeWidth={1.5} />}
                    {status !== "ended" && isPlaying && (
                      <PauseIcon fill="white" strokeWidth={1.5} />
                    )}
                    {status !== "ended" && !isPlaying && (
                      <PlayIcon fill="white" strokeWidth={1.5} />
                    )}
                  </IconProvider>
                </Pressable>
              )}
            </Animated.View>
          )}
          {status === "buffering" && (
            <Spinner
              data-slot="video-player-spinner"
              className="cn-video-player-spinner absolute"
            />
          )}
          {status === "error" && (
            <View
              data-slot="video-player-error"
              role="alert"
              accessible
              className="cn-video-player-error items-center"
            >
              <AlertCircleIcon
                color="white"
                size={iconSize}
                strokeWidth={1.5}
              />
              <Text className="cn-video-player-error-text text-center">
                This video can&apos;t be played.
              </Text>
            </View>
          )}
          {isCompact && (
            <Animated.View
              data-slot="video-player-flash"
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              className="cn-video-player-flash absolute items-center justify-center"
              style={flashStyle}
            >
              <IconProvider color="white" size={centerIconSize}>
                {flashIcon === "play" ? (
                  <PlayIcon fill="white" />
                ) : (
                  <PauseIcon fill="white" />
                )}
              </IconProvider>
            </Animated.View>
          )}
        </View>

        {cueText !== "" && (
          <View
            data-slot="video-player-captions"
            data-controls={isControlsVisible ? "visible" : "hidden"}
            data-variant={variant}
            pointerEvents="none"
            className="cn-video-player-captions absolute inset-x-0 items-center"
          >
            <Text
              accessibilityLiveRegion="polite"
              className="cn-video-player-cue text-center"
            >
              {cueText}
            </Text>
          </View>
        )}

        <Animated.View
          data-slot="video-player-controls"
          data-variant={variant}
          pointerEvents={isControlsVisible ? "box-none" : "none"}
          className="cn-video-player-controls absolute inset-x-0 bottom-0"
          style={controlsStyle}
        >
          <LinearGradient
            colors={BOTTOM_SCRIM}
            pointerEvents="none"
            style={{ position: "absolute", inset: 0 }}
          />
          {!isCompact && seek}
          <TextStyle className="cn-video-player-bar-text">
            <IconProvider color="white" size={iconSize} strokeWidth={1.75}>
              <View
                data-slot="video-player-bar"
                className="cn-video-player-bar flex-row items-center"
              >
                <VideoPlayerControl
                  label={isPlaying ? "Pause" : "Play"}
                  control="play"
                  height={control.height}
                  onPress={() => {
                    togglePlay(false)
                    wake()
                  }}
                >
                  {isPlaying ? (
                    <PauseIcon fill="white" />
                  ) : (
                    <PlayIcon fill="white" />
                  )}
                </VideoPlayerControl>
                {isCompact && seek}
                <View
                  data-slot="video-player-volume"
                  className="cn-video-player-volume flex-row items-center"
                >
                  <VideoPlayerControl
                    label={volumeLevel === "muted" ? "Unmute" : "Mute"}
                    control="mute"
                    height={control.height}
                    onPress={toggleMute}
                  >
                    {volumeLevel === "muted" && <VolumeXIcon />}
                    {volumeLevel === "low" && <Volume1Icon />}
                    {volumeLevel === "high" && <Volume2Icon />}
                  </VideoPlayerControl>
                </View>
                <Text
                  data-slot="video-player-time"
                  data-variant={variant}
                  numberOfLines={1}
                  className="cn-video-player-time tabular-nums"
                >
                  {isCompact ? (
                    status === "idle" ? (
                      formatVideoTime(duration)
                    ) : (
                      `-${formatVideoTime(
                        Math.max(0, duration - shownTime),
                        duration
                      )}`
                    )
                  ) : (
                    <>
                      {formatVideoTime(shownTime, duration)}
                      <Text className="cn-video-player-time-separator">
                        {" / "}
                      </Text>
                      {formatVideoTime(duration)}
                    </>
                  )}
                </Text>
                {!isCompact && chapterTitle !== "" && (
                  <Text
                    data-slot="video-player-chapter"
                    numberOfLines={1}
                    className="cn-video-player-chapter min-w-0 shrink"
                  >
                    {chapterTitle}
                  </Text>
                )}
                {!isCompact && <View className="flex-1" />}
                {!isCompact && tracks.length > 0 && (
                  <VideoPlayerControl
                    label="Captions"
                    control="captions"
                    height={control.height}
                    isPressed={captionIndex >= 0}
                    onPress={() => {
                      feedback(captionIndex >= 0 ? "toggle-off" : "toggle-on")
                      selectCaptions(
                        toggleVideoCaptions({
                          current: captionIndex,
                          previous: previousCaptions.current,
                          count: tracks.length,
                        })
                      )
                      wake()
                    }}
                  >
                    <CaptionsIcon />
                  </VideoPlayerControl>
                )}
                {!isCompact && (
                  <VideoPlayerControl
                    label="Settings"
                    control="settings"
                    height={control.height}
                    accessibilityState={{ expanded: isMenuOpen }}
                    onPress={() => {
                      feedback("tap")
                      setMenuView("main")
                    }}
                  >
                    <SettingsIcon />
                  </VideoPlayerControl>
                )}
                {!isCompact && !isNarrow && canPictureInPicture && (
                  <VideoPlayerControl
                    label={
                      isPictureInPicture
                        ? "Exit picture in picture"
                        : "Picture in picture"
                    }
                    control="picture-in-picture"
                    height={control.height}
                    onPress={() => {
                      feedback("tap")
                      if (isPictureInPicture) {
                        void viewRef.current?.stopPictureInPicture()
                        return
                      }
                      void viewRef.current?.startPictureInPicture()
                    }}
                  >
                    <PictureInPicture2Icon />
                  </VideoPlayerControl>
                )}
                <VideoPlayerControl
                  label="Full screen"
                  control="fullscreen"
                  height={control.height}
                  onPress={() => {
                    feedback("tap")
                    void viewRef.current?.enterFullscreen()
                  }}
                >
                  <MaximizeIcon />
                </VideoPlayerControl>
              </View>
            </IconProvider>
          </TextStyle>
        </Animated.View>

        {!isCompact && (
          <VideoPlayerMenu
            view={menuView}
            onViewChange={(view) => {
              setMenuView(view)
              if (view === null) wake()
            }}
            rate={rate}
            rates={playbackRates}
            onRateChange={(next) => {
              feedback("pick")
              player.playbackRate = next
            }}
            tracks={tracks}
            captionIndex={captionIndex}
            onCaptionsChange={(index) => {
              feedback("pick")
              selectCaptions(index)
            }}
          />
        )}
      </View>
    </DensityScope>
  )
}

function VideoPlayerControl({
  label,
  control,
  height,
  isPressed,
  onPress,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  label: string
  control: string
  height: number
  isPressed?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const press = usePressScale()
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        data-slot="video-player-control"
        data-control={control}
        role="button"
        accessibilityLabel={label}
        accessibilityState={
          isPressed === undefined ? undefined : { selected: isPressed }
        }
        hitSlop={getTouchSlop(height)}
        className={cn(
          "cn-video-player-control items-center justify-center",
          className
        )}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={onPress}
        {...props}
      >
        {children}
        {isPressed && (
          <View
            data-slot="video-player-control-indicator"
            pointerEvents="none"
            className="cn-video-player-control-indicator absolute"
          />
        )}
      </Pressable>
    </Animated.View>
  )
}

/** A chapter of the track, filled up to the playhead and what has loaded. */
function VideoPlayerSeekSegment({
  segment,
  progress,
  bufferedFraction,
}: {
  segment: Pick<VideoPlayerChapterSegment, "offset" | "width">
  progress: SharedValue<number>
  bufferedFraction: number
}) {
  const fill = (fraction: number) => {
    "worklet"
    if (segment.width <= 0) return 0
    return Math.min(1, Math.max(0, (fraction - segment.offset) / segment.width))
  }
  const playedStyle = useAnimatedStyle(() => ({
    width: `${fill(progress.value) * 100}%`,
  }))
  return (
    <View
      data-slot="video-player-seek-chapter"
      className="cn-video-player-seek-chapter h-full overflow-hidden"
      style={{ flexGrow: segment.width, flexBasis: 0 }}
    >
      <View
        data-slot="video-player-seek-buffered"
        className="cn-video-player-seek-buffered absolute inset-y-0 start-0"
        style={{ width: `${fill(bufferedFraction) * 100}%` }}
      />
      <Animated.View
        data-slot="video-player-seek-played"
        className="cn-video-player-seek-played absolute inset-y-0 start-0"
        style={playedStyle}
      />
    </View>
  )
}

const WHOLE_TRACK = [{ offset: 0, width: 1 }]

function VideoPlayerSeek({
  time,
  duration,
  buffered,
  isPlaying,
  segments,
  chapters,
  variant,
  onSeekStart,
  onSeekMove,
  onSeekEnd,
  onStep,
  onPausePlayback,
}: {
  time: number
  duration: number
  buffered: number
  isPlaying: boolean
  segments: ReadonlyArray<VideoPlayerChapterSegment>
  chapters: ReadonlyArray<VideoPlayerChapter>
  variant: VideoPlayerVariant
  /** Returns whether the video was playing, to resume after the drag. */
  onSeekStart: () => boolean
  onSeekMove: (time: number) => void
  onSeekEnd: (time: number, wasPlaying: boolean) => void
  onStep: (time: number) => void
  onPausePlayback: () => void
}) {
  const isKnown = Number.isFinite(duration) && duration > 0
  const [width, setWidth] = React.useState(0)
  const [drag, setDrag] = React.useState<number | null>(null)
  const wasPlaying = React.useRef(false)
  const progress = useSharedValue(isKnown ? time / duration : 0)
  const thumbSize = parseNumber(useCSSVariable("--density-12"), 12)

  // Between time updates the played bar runs on to the next one, so a playing
  // video moves smoothly; a seek or a pause lands at once.
  const fraction = drag ?? (isKnown ? time / duration : 0)
  React.useEffect(() => {
    progress.value =
      isPlaying && drag === null
        ? withTiming(fraction, {
            duration: TIME_UPDATE_SECONDS * 1000,
            easing: Easing.linear,
          })
        : fraction
  }, [drag, fraction, isPlaying, progress])

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * width - thumbSize / 2 }],
  }))

  const latest = React.useRef({
    onSeekStart,
    onSeekMove,
    onSeekEnd,
    onPausePlayback,
    duration,
  })
  React.useEffect(() => {
    latest.current = {
      onSeekStart,
      onSeekMove,
      onSeekEnd,
      onPausePlayback,
      duration,
    }
  })

  const gesture = React.useMemo(() => {
    const read = (x: number) =>
      width > 0 ? Math.min(1, Math.max(0, x / width)) : 0
    const begin = (x: number) => {
      wasPlaying.current = latest.current.onSeekStart()
      latest.current.onPausePlayback()
      const next = read(x)
      setDrag(next)
      latest.current.onSeekMove(next * latest.current.duration)
    }
    const end = (x: number) => {
      const next = read(x)
      setDrag(null)
      latest.current.onSeekEnd(
        next * latest.current.duration,
        wasPlaying.current
      )
    }
    const pan = Gesture.Pan()
      .enabled(isKnown)
      .runOnJS(true)
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onStart((event) => begin(event.x))
      .onUpdate((event) => {
        const next = read(event.x)
        setDrag(next)
        latest.current.onSeekMove(next * latest.current.duration)
      })
      .onEnd((event) => end(event.x))
    const tap = Gesture.Tap()
      .enabled(isKnown)
      .maxDuration(1000)
      .runOnJS(true)
      .onEnd((event, isSuccess) => {
        if (!isSuccess) return
        begin(event.x)
        end(event.x)
      })
    return Gesture.Race(pan, tap)
  }, [isKnown, width])

  const handleAction = (event: AccessibilityActionEvent) => {
    const key =
      event.nativeEvent.actionName === "increment" ? "ArrowRight" : "ArrowLeft"
    const next = getVideoSeekKeyTime(key, { time, duration })
    if (next !== null && isKnown) onStep(next)
  }

  const previewTime = drag === null ? 0 : drag * duration
  const previewChapter = getVideoChapterIndex(chapters, previewTime)
  const bufferedFraction = isKnown ? buffered / duration : 0
  const shownSegments = segments.length > 0 ? segments : WHOLE_TRACK

  return (
    <GestureDetector gesture={gesture}>
      <View
        data-slot="video-player-seek"
        data-variant={variant}
        data-dragging={drag !== null}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
        accessibilityValue={{
          min: 0,
          max: isKnown ? Math.round(duration) : 0,
          now: Math.round(time),
          text: getVideoSeekText(time, duration),
        }}
        accessibilityActions={SEEK_ACTIONS}
        accessibilityState={{ disabled: !isKnown }}
        onAccessibilityAction={handleAction}
        className="cn-video-player-seek relative min-w-0 flex-1 justify-center"
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
      >
        <View
          data-slot="video-player-seek-track"
          data-dragging={drag !== null}
          className="cn-video-player-seek-track w-full flex-row"
        >
          {shownSegments.map((segment) => (
            <VideoPlayerSeekSegment
              key={segment.offset}
              segment={segment}
              progress={progress}
              bufferedFraction={bufferedFraction}
            />
          ))}
        </View>
        <Animated.View
          data-slot="video-player-seek-thumb"
          data-dragging={drag !== null}
          pointerEvents="none"
          className="cn-video-player-seek-thumb absolute start-0"
          style={thumbStyle}
        />
        {drag !== null && isKnown && (
          <View
            data-slot="video-player-seek-preview"
            pointerEvents="none"
            className="cn-video-player-seek-preview absolute bottom-full items-center"
            style={{
              left: Math.min(Math.max(drag * width - 48, 0), width - 96),
              width: 96,
            }}
          >
            {previewChapter >= 0 && (
              <Text
                numberOfLines={1}
                className="cn-video-player-seek-preview-chapter"
              >
                {chapters[previewChapter].title}
              </Text>
            )}
            <Text className="cn-video-player-seek-preview-text tabular-nums">
              {formatVideoTime(previewTime, duration)}
            </Text>
          </View>
        )}
      </View>
    </GestureDetector>
  )
}

/**
 * Settings as a bottom sheet, the platform's way to offer choices over a
 * video: speed and captions, each a page of choices behind a row that shows
 * the current one.
 */
function VideoPlayerMenu({
  view,
  onViewChange,
  rate,
  rates,
  onRateChange,
  tracks,
  captionIndex,
  onCaptionsChange,
}: {
  view: VideoPlayerMenuView | null
  onViewChange: (view: VideoPlayerMenuView | null) => void
  rate: number
  rates: ReadonlyArray<number>
  onRateChange: (rate: number) => void
  tracks: ReadonlyArray<VideoPlayerTrack>
  captionIndex: number
  onCaptionsChange: (index: number) => void
}) {
  const title =
    view === "speed" ? "Speed" : view === "captions" ? "Captions" : "Settings"
  const captionLabel = captionIndex >= 0 ? tracks[captionIndex]?.label : "Off"
  return (
    <Sheet
      open={view !== null}
      onOpenChange={(open) => {
        if (!open) onViewChange(null)
      }}
    >
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <View
          data-slot="video-player-menu"
          role="menu"
          accessibilityLabel={title}
          className="cn-video-player-menu"
        >
          {view === "main" && (
            <>
              <VideoPlayerMenuItem onPress={() => onViewChange("speed")}>
                <GaugeIcon />
                <Text className="cn-video-player-menu-item-text flex-1">
                  Speed
                </Text>
                <Text
                  data-slot="video-player-menu-value"
                  className="cn-video-player-menu-value"
                >
                  {formatVideoRate(rate)}
                </Text>
                <ChevronRightIcon />
              </VideoPlayerMenuItem>
              {tracks.length > 0 && (
                <VideoPlayerMenuItem onPress={() => onViewChange("captions")}>
                  <CaptionsIcon />
                  <Text className="cn-video-player-menu-item-text flex-1">
                    Captions
                  </Text>
                  <Text
                    data-slot="video-player-menu-value"
                    className="cn-video-player-menu-value"
                  >
                    {captionLabel}
                  </Text>
                  <ChevronRightIcon />
                </VideoPlayerMenuItem>
              )}
            </>
          )}
          {view !== null && view !== "main" && (
            <>
              <VideoPlayerMenuItem
                accessibilityLabel="Back"
                onPress={() => onViewChange("main")}
              >
                <ChevronLeftIcon />
                <Text className="cn-video-player-menu-item-text flex-1">
                  Settings
                </Text>
              </VideoPlayerMenuItem>
              <View
                data-slot="video-player-menu-separator"
                role="separator"
                className="cn-video-player-menu-separator"
              />
            </>
          )}
          {view === "speed" &&
            rates.map((option) => (
              <VideoPlayerMenuItem
                key={option}
                role="radio"
                isChecked={option === rate}
                onPress={() => {
                  onRateChange(option)
                  onViewChange("main")
                }}
              >
                <VideoPlayerMenuCheck isChecked={option === rate} />
                <Text className="cn-video-player-menu-item-text flex-1">
                  {formatVideoRate(option)}
                </Text>
              </VideoPlayerMenuItem>
            ))}
          {view === "captions" &&
            [{ label: "Off" }, ...tracks].map((track, index) => (
              <VideoPlayerMenuItem
                key={track.label}
                role="radio"
                isChecked={index - 1 === captionIndex}
                onPress={() => {
                  onCaptionsChange(index - 1)
                  onViewChange("main")
                }}
              >
                <VideoPlayerMenuCheck isChecked={index - 1 === captionIndex} />
                <Text className="cn-video-player-menu-item-text flex-1">
                  {track.label}
                </Text>
              </VideoPlayerMenuItem>
            ))}
        </View>
      </SheetContent>
    </Sheet>
  )
}

function VideoPlayerMenuItem({
  role = "menuitem",
  isChecked,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "role"> & {
  role?: "menuitem" | "radio"
  isChecked?: boolean
  children?: React.ReactNode
}) {
  const control = useControlSize()
  return (
    <Pressable
      data-slot="video-player-menu-item"
      role={role}
      aria-checked={isChecked}
      hitSlop={getTouchSlop(control.height)}
      className="cn-video-player-menu-item flex-row items-center"
      {...props}
    >
      <TextStyle className="cn-video-player-menu-item-text">
        {children}
      </TextStyle>
    </Pressable>
  )
}

function VideoPlayerMenuCheck({ isChecked }: { isChecked: boolean }) {
  return (
    <View
      data-slot="video-player-menu-check"
      className="cn-video-player-menu-check items-center justify-center"
    >
      {isChecked && <CheckIcon />}
    </View>
  )
}

export {
  VideoPlayer,
  type VideoPlayerChapter,
  type VideoPlayerProps,
  type VideoPlayerTrack,
  type VideoPlayerVariant,
}
