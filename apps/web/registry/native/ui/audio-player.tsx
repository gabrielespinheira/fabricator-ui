import * as React from "react"
import {
  AlertCircleIcon,
  IconProvider,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import {
  Image,
  Pressable,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  AUDIO_PLAYER_RATES,
  formatAudioRate,
  getAudioTimeLabels,
  getAudioWaveformBarCount,
  getAudioWaveformBars,
  getNextAudioRate,
  type AudioPlayerVariant,
} from "@/registry/fabricator/shared/lib/audio-player-model"
import {
  clampVideoTime,
  formatVideoTime,
  getVideoPlayerStatus,
  getVideoSeekKeyTime,
  getVideoSeekText,
  getVideoVolumeLevel,
  VIDEO_PLAYER_SKIP,
} from "@/registry/fabricator/shared/lib/video-player-model"
import { getTouchSlop } from "@/registry/native/lib/density-scale"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  useMotion,
  usePressScale,
  useSurfaceAnimation,
} from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { Spinner } from "@/registry/native/ui/spinner"
import { Text, TextClassContext, TextStyle } from "@/registry/native/ui/text"

// The website's Audio Player on React Native, over expo-audio: the artwork
// and what's playing, a seek bar drawn as the file's waveform when `peaks`
// are given, the time played and left, skip back and forward, a speed button
// and mute. `variant="cover"` stacks a large artwork above the controls and
// `variant="compact"` keeps play, the seek bar, the time and the speed on one
// row. The device's buttons set the volume, so there's no volume slider, as
// in the Video Player.

type AudioPlayerProps = Omit<React.ComponentProps<typeof View>, "children"> & {
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
  className?: string
}

/** How often the player reports the time; the played bar glides between. */
const TIME_UPDATE_MS = 250

/** The waveform's bar and gap, in pt; the bars stretch to fill the track. */
const WAVEFORM_BAR_WIDTH = 3
const WAVEFORM_GAP = 2

const SEEK_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

const EQUALIZER_BARS = [0, 1, 2] as const

function toKnownDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0 ? duration : Number.NaN
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
  ...props
}: AudioPlayerProps) {
  const isCompact = variant === "compact"
  const feedback = useFeedback()
  const player = useAudioPlayer(src, { updateInterval: TIME_UPDATE_MS })
  const playback = useAudioPlayerStatus(player)
  const [hasStarted, setHasStarted] = React.useState(false)
  const [isEnded, setIsEnded] = React.useState(false)
  const [seekTime, setSeekTime] = React.useState<number | null>(null)

  // Set once for each player the source makes, as the website's attributes.
  const initial = React.useRef({ loop, muted, autoPlay })
  React.useEffect(() => {
    player.loop = initial.current.loop
    player.muted = initial.current.muted
    if (initial.current.autoPlay) player.play()
  }, [player])

  const latest = React.useRef({ onPlayingChange, onEnded })
  React.useEffect(() => {
    latest.current = { onPlayingChange, onEnded }
  })

  const isPlaying = playback.playing
  React.useEffect(() => {
    if (isPlaying) {
      setHasStarted(true)
      setIsEnded(false)
    }
    latest.current.onPlayingChange?.(isPlaying)
  }, [isPlaying])

  React.useEffect(() => {
    // A looping file passes its end without stopping.
    if (!playback.didJustFinish || player.loop) return
    setIsEnded(true)
    latest.current.onEnded?.()
  }, [playback.didJustFinish, player])

  const duration = playback.isLoaded
    ? toKnownDuration(playback.duration)
    : Number.NaN
  const time = seekTime ?? playback.currentTime
  const hasError = playback.error != null || playback.playbackState === "failed"
  const status = getVideoPlayerStatus({
    isPaused: !isPlaying,
    isWaiting: playback.isBuffering,
    isEnded,
    hasError,
    hasStarted,
  })
  const rate = playback.playbackRate > 0 ? playback.playbackRate : 1
  const times = getAudioTimeLabels({ status, time, duration })
  const volumeLevel = getVideoVolumeLevel(player.volume, playback.mute)

  const seekTo = React.useCallback(
    (next: number) => {
      void player.seekTo(clampVideoTime(next, duration))
      setIsEnded(false)
    },
    [duration, player]
  )

  const togglePlay = () => {
    feedback("tap")
    if (player.playing) {
      player.pause()
      return
    }
    // Seeking a finished player and playing in the same tick drops the play.
    if (status === "ended") {
      void player.seekTo(0).then(() => player.play())
      return
    }
    player.play()
  }

  const skipBy = (seconds: number) => {
    feedback("tick")
    seekTo(player.currentTime + seconds)
  }

  const toggleMute = () => {
    feedback(playback.mute ? "toggle-on" : "toggle-off")
    player.muted = !player.muted
  }

  const changeRate = () => {
    feedback("tick")
    player.setPlaybackRate(getNextAudioRate(playbackRates, rate))
  }

  const seek = hasError ? (
    <View
      data-slot="audio-player-error"
      data-variant={variant}
      role="alert"
      accessible
      className="cn-audio-player-error min-w-0 flex-1 flex-row items-center"
    >
      <TextStyle className="cn-audio-player-error-icon">
        <AlertCircleIcon />
      </TextStyle>
      <Text numberOfLines={1} className="cn-audio-player-error-text shrink">
        This audio can&apos;t be played.
      </Text>
    </View>
  ) : (
    <AudioPlayerSeek
      time={time}
      duration={duration}
      isPlaying={isPlaying}
      peaks={peaks}
      variant={variant}
      onSeekStart={() => {
        feedback("grab")
        const wasPlaying = player.playing
        player.pause()
        return wasPlaying
      }}
      onSeekMove={setSeekTime}
      onSeekEnd={(next, wasPlaying) => {
        feedback("drop")
        setSeekTime(null)
        // The seek lands before playing resumes, so it starts from there.
        void player.seekTo(clampVideoTime(next, duration)).then(() => {
          if (wasPlaying) player.play()
        })
        setIsEnded(false)
      }}
      onStep={seekTo}
    />
  )

  const play = (
    <AudioPlayerPlay
      variant={variant}
      isPlaying={isPlaying}
      isBuffering={status === "buffering"}
      isEnded={status === "ended"}
      disabled={hasError}
      onPress={togglePlay}
    />
  )

  const speed = (
    <AudioPlayerControl
      label={`Speed ${formatAudioRate(rate)}`}
      control="speed"
      variant={variant}
      disabled={hasError}
      onPress={changeRate}
    >
      <AudioPlayerSpeed rate={rate} />
    </AudioPlayerControl>
  )

  return (
    <View
      data-slot="audio-player"
      data-variant={variant}
      data-status={status}
      accessibilityLabel={title ?? "Audio player"}
      className={cn("cn-audio-player relative", className)}
      {...props}
    >
      {isCompact ? (
        <>
          {play}
          {seek}
          <View
            data-slot="audio-player-time"
            data-variant={variant}
            data-status={status}
            className="cn-audio-player-time flex-row"
          >
            <Text
              numberOfLines={1}
              className="cn-audio-player-time-text tabular-nums"
            >
              {times.compact}
            </Text>
          </View>
          {speed}
        </>
      ) : (
        <>
          <View
            data-slot="audio-player-header"
            data-variant={variant}
            className="cn-audio-player-header min-w-0"
          >
            <AudioPlayerArtwork
              artwork={artwork}
              variant={variant}
              isPlaying={isPlaying}
            />
            <View
              data-slot="audio-player-meta"
              data-variant={variant}
              className="cn-audio-player-meta min-w-0 flex-1"
            >
              {title && (
                <Text
                  data-slot="audio-player-title"
                  data-variant={variant}
                  numberOfLines={1}
                  className="cn-audio-player-title"
                >
                  {title}
                </Text>
              )}
              {artist && (
                <Text
                  data-slot="audio-player-artist"
                  data-variant={variant}
                  numberOfLines={1}
                  className="cn-audio-player-artist"
                >
                  {artist}
                </Text>
              )}
            </View>
            <AudioPlayerEqualizer variant={variant} isPlaying={isPlaying} />
          </View>
          <View
            data-slot="audio-player-timeline"
            className="cn-audio-player-timeline"
          >
            {seek}
            <View
              data-slot="audio-player-time"
              data-variant={variant}
              data-status={status}
              className="cn-audio-player-time flex-row justify-between"
            >
              <Text
                data-slot="audio-player-time-current"
                className="cn-audio-player-time-text tabular-nums"
              >
                {times.current}
              </Text>
              <Text
                data-slot="audio-player-time-remaining"
                accessibilityLabel={`Remaining ${times.remaining}`}
                className="cn-audio-player-time-text tabular-nums"
              >
                {times.remaining}
              </Text>
            </View>
          </View>
          <View
            data-slot="audio-player-bar"
            className="cn-audio-player-bar flex-row items-center"
          >
            <View className="flex-1 flex-row justify-start">{speed}</View>
            <View
              data-slot="audio-player-transport"
              data-variant={variant}
              className="cn-audio-player-transport flex-row items-center"
            >
              <AudioPlayerSkip
                direction={-1}
                variant={variant}
                disabled={hasError}
                onPress={() => skipBy(-VIDEO_PLAYER_SKIP)}
              />
              {play}
              <AudioPlayerSkip
                direction={1}
                variant={variant}
                disabled={hasError}
                onPress={() => skipBy(VIDEO_PLAYER_SKIP)}
              />
            </View>
            <View
              data-slot="audio-player-volume"
              className="cn-audio-player-volume flex-1 flex-row items-center justify-end"
            >
              <AudioPlayerControl
                label={volumeLevel === "muted" ? "Unmute" : "Mute"}
                control="mute"
                variant={variant}
                disabled={hasError}
                onPress={toggleMute}
              >
                {volumeLevel === "muted" && <VolumeXIcon />}
                {volumeLevel === "low" && <Volume1Icon />}
                {volumeLevel === "high" && <Volume2Icon />}
              </AudioPlayerControl>
            </View>
          </View>
        </>
      )}
    </View>
  )
}

/**
 * The artwork rests a little smaller while paused and grows to full size as
 * it plays, on the sheet timing and iOS's drawer curve. Without an image
 * it's a muted tile with a note.
 */
function AudioPlayerArtwork({
  artwork,
  variant,
  isPlaying,
}: {
  artwork?: string
  variant: AudioPlayerVariant
  isPlaying: boolean
}) {
  const motion = useMotion("sheet")
  const rest = variant === "cover" ? 0.92 : 0.94
  const target = isPlaying || motion.isReduced ? 1 : rest
  const scale = useSharedValue(target)
  React.useEffect(() => {
    scale.value = withTiming(target, {
      duration: isPlaying ? motion.enterMs : motion.exitMs,
      easing: motion.drawerEasing,
    })
  }, [isPlaying, motion, scale, target])
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const iconSize = parseNumber(
    useCSSVariable(variant === "cover" ? "--density-48" : "--density-20"),
    20
  )
  return (
    <Animated.View
      data-slot="audio-player-artwork"
      data-variant={variant}
      data-playing={isPlaying}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="cn-audio-player-artwork relative items-center justify-center"
      style={style}
    >
      {artwork ? (
        <Image
          data-slot="audio-player-artwork-image"
          data-variant={variant}
          source={{ uri: artwork }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          className="cn-audio-player-artwork-image absolute inset-0"
        />
      ) : (
        <TextStyle className="cn-audio-player-artwork-text">
          <MusicIcon
            size={iconSize}
            strokeWidth={variant === "cover" ? 1 : 1.5}
          />
        </TextStyle>
      )}
    </Animated.View>
  )
}

/**
 * Three bars that bounce out of step while the audio plays, fading in on the
 * move timing and out when it stops. Reduce Motion keeps them still.
 */
function AudioPlayerEqualizer({
  variant,
  isPlaying,
}: {
  variant: AudioPlayerVariant
  isPlaying: boolean
}) {
  const move = useMotion("move")
  const shown = useSharedValue(isPlaying ? 1 : 0)
  React.useEffect(() => {
    shown.value = withTiming(isPlaying ? 1 : 0, {
      duration: isPlaying ? move.enterMs : move.exitMs,
      easing: move.moveEasing,
    })
  }, [isPlaying, move, shown])
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: 0.9 + shown.value * 0.1 }],
  }))
  return (
    <Animated.View
      data-slot="audio-player-equalizer"
      data-variant={variant}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="cn-audio-player-equalizer shrink-0 flex-row items-end"
      style={style}
    >
      {EQUALIZER_BARS.map((index) => (
        <AudioPlayerEqualizerBar
          key={index}
          index={index}
          variant={variant}
          isPlaying={isPlaying}
        />
      ))}
    </Animated.View>
  )
}

// Where each bar rests while the others bounce, so a still equalizer reads as
// one too.
const EQUALIZER_REST = [0.55, 1, 0.75] as const

function AudioPlayerEqualizerBar({
  index,
  variant,
  isPlaying,
}: {
  index: (typeof EQUALIZER_BARS)[number]
  variant: AudioPlayerVariant
  isPlaying: boolean
}) {
  const sheet = useMotion("sheet")
  const level = useSharedValue<number>(EQUALIZER_REST[index])
  React.useEffect(() => {
    cancelAnimation(level)
    if (!isPlaying || sheet.isOff || sheet.isReduced) {
      level.value = EQUALIZER_REST[index]
      return
    }
    const timing = {
      duration: sheet.enterMs,
      easing: Easing.inOut(Easing.quad),
    }
    level.value = withDelay(
      index * sheet.enterMs * 0.4,
      withRepeat(
        withSequence(withTiming(1, timing), withTiming(0.3, timing)),
        -1,
        true
      )
    )
  }, [index, isPlaying, level, sheet])
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: level.value }],
  }))
  return (
    <Animated.View
      data-slot="audio-player-equalizer-bar"
      data-variant={variant}
      className="cn-audio-player-equalizer-bar h-full"
      style={[style, { transformOrigin: "bottom" }]}
    />
  )
}

/**
 * Play, pause and replay trade places by fading and scaling through each
 * other on the move timing; a spinner takes over while the audio waits.
 */
function AudioPlayerPlay({
  variant,
  isPlaying,
  isBuffering,
  isEnded,
  disabled,
  onPress,
}: {
  variant: AudioPlayerVariant
  isPlaying: boolean
  isBuffering: boolean
  isEnded: boolean
  disabled: boolean
  onPress: () => void
}) {
  const press = usePressScale()
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  const icon = isBuffering
    ? "buffering"
    : isEnded
      ? "replay"
      : isPlaying
        ? "pause"
        : "play"
  const height = parseNumber(useCSSVariable("--density-48"), 48)
  const iconSize = parseNumber(
    useCSSVariable(
      variant === "compact"
        ? "--density-icon-14"
        : variant === "cover"
          ? "--density-24"
          : "--density-20"
    ),
    20
  )
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        data-slot="audio-player-play"
        data-variant={variant}
        data-icon={icon}
        role="button"
        accessibilityLabel={isEnded ? "Replay" : isPlaying ? "Pause" : "Play"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={getTouchSlop(height)}
        className="cn-audio-player-play relative items-center justify-center"
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={onPress}
      >
        <TextStyle className="cn-audio-player-play-text">
          <IconProvider size={iconSize}>
            <AudioPlayerPlayIcon icon="play" isVisible={icon === "play"}>
              <AudioPlayerFilledIcon icon={PlayIcon} />
            </AudioPlayerPlayIcon>
            <AudioPlayerPlayIcon icon="pause" isVisible={icon === "pause"}>
              <AudioPlayerFilledIcon icon={PauseIcon} />
            </AudioPlayerPlayIcon>
            <AudioPlayerPlayIcon icon="replay" isVisible={icon === "replay"}>
              <RotateCcwIcon strokeWidth={2} />
            </AudioPlayerPlayIcon>
            {isBuffering && (
              <Spinner
                data-slot="audio-player-spinner"
                size={iconSize}
                className="cn-audio-player-spinner"
              />
            )}
          </IconProvider>
        </TextStyle>
      </Pressable>
    </Animated.View>
  )
}

/** Play and pause are filled with the button's text colour. */
function AudioPlayerFilledIcon({ icon: Icon }: { icon: typeof PlayIcon }) {
  const inherited = React.use(TextClassContext)
  const { color } = useResolveClassNames(inherited ?? "")
  return <Icon fill={typeof color === "string" ? color : undefined} />
}

function AudioPlayerPlayIcon({
  icon,
  isVisible,
  children,
}: {
  icon: "play" | "pause" | "replay"
  isVisible: boolean
  children: React.ReactNode
}) {
  const move = useMotion("move")
  const shown = useSharedValue(isVisible ? 1 : 0)
  React.useEffect(() => {
    shown.value = withTiming(isVisible ? 1 : 0, {
      duration: isVisible ? move.enterMs : move.exitMs,
      easing: move.moveEasing,
    })
  }, [isVisible, move, shown])
  const isReduced = move.isReduced
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: isReduced ? 1 : 0.5 + shown.value * 0.5 }],
  }))
  return (
    <Animated.View
      data-slot="audio-player-play-icon"
      data-icon={icon}
      data-visible={isVisible}
      pointerEvents="none"
      className="cn-audio-player-play-icon absolute items-center justify-center"
      style={style}
    >
      {children}
    </Animated.View>
  )
}

function AudioPlayerControl({
  label,
  control,
  variant,
  onPressIn,
  onPressOut,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  label: string
  control: string
  variant: AudioPlayerVariant
  className?: string
  children?: React.ReactNode
}) {
  const press = usePressScale()
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  const height = parseNumber(
    useCSSVariable(variant === "compact" ? "--density-28" : "--density-36"),
    36
  )
  const iconSize = parseNumber(useCSSVariable("--density-20"), 20)
  return (
    <Animated.View style={pressStyle}>
      <Pressable
        data-slot="audio-player-control"
        data-control={control}
        data-variant={variant}
        data-pill={variant === "compact" && control === "speed"}
        role="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: props.disabled ?? false }}
        hitSlop={getTouchSlop(height)}
        className={cn(
          "cn-audio-player-control relative items-center justify-center",
          className
        )}
        onPressIn={(event) => {
          press.onPressIn()
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          press.onPressOut()
          onPressOut?.(event)
        }}
        {...props}
      >
        <TextStyle className="cn-audio-player-control-text">
          <IconProvider size={iconSize} strokeWidth={1.75}>
            {children}
          </IconProvider>
        </TextStyle>
      </Pressable>
    </Animated.View>
  )
}

/** The skip arrows wind back or forward a little while pressed. */
function AudioPlayerSkip({
  direction,
  variant,
  disabled,
  onPress,
}: {
  direction: 1 | -1
  variant: AudioPlayerVariant
  disabled: boolean
  onPress: () => void
}) {
  const move = useMotion("move")
  const turn = useSharedValue(0)
  const wind = (isHeld: boolean) => {
    turn.value = withTiming(isHeld && !move.isReduced ? direction * 30 : 0, {
      duration: isHeld ? move.enterMs : move.exitMs,
      easing: move.moveEasing,
    })
  }
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }))
  return (
    <AudioPlayerControl
      label={`${direction < 0 ? "Back" : "Forward"} ${VIDEO_PLAYER_SKIP} seconds`}
      control={direction < 0 ? "skip-back" : "skip-forward"}
      variant={variant}
      disabled={disabled}
      onPressIn={() => wind(true)}
      onPressOut={() => wind(false)}
      onPress={onPress}
    >
      <Animated.View style={style}>
        {direction < 0 ? <RotateCcwIcon /> : <RotateCwIcon />}
      </Animated.View>
      <Text
        data-slot="audio-player-skip-label"
        importantForAccessibility="no"
        accessibilityElementsHidden
        className="cn-audio-player-skip-label absolute tabular-nums"
      >
        {VIDEO_PLAYER_SKIP}
      </Text>
    </AudioPlayerControl>
  )
}

/** The speed as a number whose new value rises in on the popup timing. */
function AudioPlayerSpeed({ rate }: { rate: number }) {
  const { entering } = useSurfaceAnimation("popup", { translateY: 4, scale: 1 })
  return (
    <Animated.View key={rate} entering={entering}>
      <Text
        data-slot="audio-player-speed"
        className="cn-audio-player-speed tabular-nums"
      >
        {formatAudioRate(rate)}
      </Text>
    </Animated.View>
  )
}

/**
 * One bar of the waveform's track, rising from the middle when it first
 * draws, a little after the one before it, on the sheet timing.
 */
function AudioPlayerWaveformBar({
  index,
  level,
  delayMs,
  durationMs,
  easing,
}: {
  index: number
  level: number
  delayMs: number
  durationMs: number
  easing: ReturnType<typeof useMotion>["drawerEasing"]
}) {
  const rise = useSharedValue(durationMs > 0 ? 0 : 1)
  React.useEffect(() => {
    rise.value = withDelay(
      index * delayMs,
      withTiming(1, { duration: durationMs, easing })
    )
  }, [delayMs, durationMs, easing, index, rise])
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: rise.value }],
  }))
  return (
    <Animated.View
      data-slot="audio-player-waveform-bar"
      data-layer="track"
      className="cn-audio-player-waveform-bar min-w-0 flex-1"
      style={[{ height: `${level * 100}%` }, style]}
    />
  )
}

function AudioPlayerSeek({
  time,
  duration,
  isPlaying,
  peaks,
  variant,
  onSeekStart,
  onSeekMove,
  onSeekEnd,
  onStep,
}: {
  time: number
  duration: number
  isPlaying: boolean
  peaks?: ReadonlyArray<number>
  variant: AudioPlayerVariant
  /** Returns whether the audio was playing, to resume after the drag. */
  onSeekStart: () => boolean
  onSeekMove: (time: number) => void
  onSeekEnd: (time: number, wasPlaying: boolean) => void
  onStep: (time: number) => void
}) {
  const isKnown = Number.isFinite(duration) && duration > 0
  const hasWaveform = peaks !== undefined && peaks.length > 0
  const [width, setWidth] = React.useState(0)
  const [drag, setDrag] = React.useState<number | null>(null)
  const wasPlaying = React.useRef(false)
  const progress = useSharedValue(isKnown ? time / duration : 0)
  const thumbSize = parseNumber(useCSSVariable("--density-12"), 12)
  const sheet = useMotion("sheet")
  const feedbackMotion = useMotion("feedback")

  const barCount = getAudioWaveformBarCount({
    width,
    barWidth: WAVEFORM_BAR_WIDTH,
    gap: WAVEFORM_GAP,
  })
  const bars = React.useMemo(
    () => (peaks ? getAudioWaveformBars(peaks, barCount) : []),
    [peaks, barCount]
  )

  // Between time updates the played part runs on to the next one, so playing
  // audio moves smoothly; a seek or a pause lands at once.
  const fraction = drag ?? (isKnown ? time / duration : 0)
  React.useEffect(() => {
    progress.value =
      isPlaying && drag === null
        ? withTiming(fraction, {
            duration: TIME_UPDATE_MS,
            easing: Easing.linear,
          })
        : fraction
  }, [drag, fraction, isPlaying, progress])

  const playedStyle = useAnimatedStyle(() => ({
    width: progress.value * width,
  }))
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * width - thumbSize / 2 }],
  }))

  const latest = React.useRef({ onSeekStart, onSeekMove, onSeekEnd, duration })
  React.useEffect(() => {
    latest.current = { onSeekStart, onSeekMove, onSeekEnd, duration }
  })

  const gesture = React.useMemo(() => {
    const read = (x: number) =>
      width > 0 ? Math.min(1, Math.max(0, x / width)) : 0
    const begin = (x: number) => {
      wasPlaying.current = latest.current.onSeekStart()
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

  const riseMs = sheet.isOff || sheet.isReduced ? 0 : sheet.enterMs
  const previewWidth = 64

  return (
    <GestureDetector gesture={gesture}>
      <View
        data-slot="audio-player-seek"
        data-variant={variant}
        data-waveform={hasWaveform}
        data-shape={
          variant === "compact" ? "compact" : hasWaveform ? "waveform" : "bar"
        }
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
        className="cn-audio-player-seek relative min-w-0 flex-1 justify-center"
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
      >
        {hasWaveform ? (
          <View
            data-slot="audio-player-waveform"
            pointerEvents="none"
            className="h-full w-full"
          >
            <View
              data-slot="audio-player-waveform-bars"
              data-layer="track"
              className="cn-audio-player-waveform-bars absolute inset-0 flex-row items-center"
            >
              {bars.map((level, index) => (
                <AudioPlayerWaveformBar
                  key={index}
                  index={index}
                  level={level}
                  delayMs={riseMs > 0 ? feedbackMotion.enterMs / 12 : 0}
                  durationMs={riseMs}
                  easing={sheet.drawerEasing}
                />
              ))}
            </View>
            {/* What has played: the same bars in primary, cut at the
                playhead so a bar fills partway as it passes. */}
            <Animated.View
              className="absolute inset-y-0 start-0 overflow-hidden"
              style={playedStyle}
            >
              <View
                data-slot="audio-player-waveform-bars"
                data-layer="played"
                className="cn-audio-player-waveform-bars h-full flex-row items-center"
                style={{ width }}
              >
                {bars.map((level, index) => (
                  <View
                    key={index}
                    data-slot="audio-player-waveform-bar"
                    data-layer="played"
                    className="cn-audio-player-waveform-bar min-w-0 flex-1"
                    style={{ height: `${level * 100}%` }}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        ) : (
          <>
            <View
              data-slot="audio-player-seek-track"
              data-dragging={drag !== null}
              className="cn-audio-player-seek-track w-full overflow-hidden"
            >
              <Animated.View
                data-slot="audio-player-seek-played"
                className="cn-audio-player-seek-played absolute inset-y-0 start-0"
                style={playedStyle}
              />
            </View>
            <Animated.View
              data-slot="audio-player-seek-thumb"
              data-dragging={drag !== null}
              pointerEvents="none"
              className="cn-audio-player-seek-thumb absolute start-0"
              style={thumbStyle}
            />
          </>
        )}
        {drag !== null && isKnown && (
          <View
            data-slot="audio-player-seek-preview"
            pointerEvents="none"
            className="cn-audio-player-seek-preview absolute bottom-full items-center"
            style={{
              left: Math.min(
                Math.max(drag * width - previewWidth / 2, 0),
                Math.max(0, width - previewWidth)
              ),
              width: previewWidth,
            }}
          >
            <Text className="cn-audio-player-seek-preview-text tabular-nums">
              {formatVideoTime(drag * duration, duration)}
            </Text>
          </View>
        )}
      </View>
    </GestureDetector>
  )
}

export { AudioPlayer, type AudioPlayerProps, type AudioPlayerVariant }
