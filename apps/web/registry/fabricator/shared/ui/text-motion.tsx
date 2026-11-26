"use client"

// Text Motion: a string split into characters, words or lines that play in
// one after another. Effects are layers (fade, blur, rise, mask, scramble,
// …), each on its own property, so any set combines. Every time is a
// multiple of the reveal motion role: a project's speed, `data-motion` and
// `--motion-scale` retime it, and Reduce Motion keeps only the fades.
//
// The moving pieces are hidden from assistive technology; a visually hidden
// copy carries the text, so a screen reader reads it once, whole.
import * as React from "react"
import { cn } from "cn"

import {
  getTextMotionDuration,
  getTextMotionEffects,
  getTextMotionOrder,
  getTextMotionProgress,
  getTextMotionScramble,
  getTextMotionSpan,
  getTextMotionStagger,
  getTextMotionStarts,
  splitTextMotion,
  type TextMotionBy,
  type TextMotionEffect,
  type TextMotionFrom,
  type TextMotionLayer,
  type TextMotionLoop,
} from "@/registry/bases/__base__/lib/text-motion-model"

type TextMotionTrigger = "mount" | "view"

type TextMotionState = "idle" | "playing" | "done" | "exit"

const PIECE = '[data-slot="text-motion-piece"]'

// Pieces rest at their first keyframe while idle, run when playing, and drop
// the entrance once done so loops can take over. Layers write the
// `--text-motion-from-*` and `--text-motion-exit-*` values the two
// keyframes read; the look (distance, blur, scale, colours) is the style map.
const TEXT_MOTION_STYLES = `
@keyframes fabricator-text-motion-enter {
  from {
    opacity: var(--text-motion-from-opacity, 1);
    filter: var(--text-motion-from-filter, blur(0));
    translate: var(--text-motion-from-x, 0) var(--text-motion-from-y, 0);
    scale: var(--text-motion-from-scale, 1);
    transform: perspective(var(--text-motion-perspective)) rotateX(var(--text-motion-from-rotate, 0deg));
    clip-path: var(--text-motion-from-clip, none);
  }
  to {
    transform: perspective(var(--text-motion-perspective)) rotateX(0deg);
    clip-path: var(--text-motion-rest-clip, none);
  }
}
@keyframes fabricator-text-motion-exit {
  from {
    transform: perspective(var(--text-motion-perspective)) rotateX(0deg);
    clip-path: var(--text-motion-rest-clip, none);
  }
  to {
    opacity: var(--text-motion-exit-opacity, 1);
    filter: var(--text-motion-exit-filter, blur(0));
    translate: var(--text-motion-exit-x, 0) var(--text-motion-exit-y, 0);
    scale: var(--text-motion-exit-scale, 1);
    transform: perspective(var(--text-motion-perspective)) rotateX(var(--text-motion-exit-rotate, 0deg));
    clip-path: var(--text-motion-exit-clip, none);
    visibility: hidden;
  }
}
@keyframes fabricator-text-motion-fade-in {
  from { opacity: var(--text-motion-from-opacity, 1); }
}
@keyframes fabricator-text-motion-fade-out {
  to { opacity: var(--text-motion-exit-opacity, 1); visibility: hidden; }
}
@keyframes fabricator-text-motion-type {
  from { color: transparent; }
}
@keyframes fabricator-text-motion-caret {
  from, to { opacity: 1; }
}
@keyframes fabricator-text-motion-blink {
  50% { opacity: 0; }
}
@keyframes fabricator-text-motion-shimmer {
  0%, 40%, 100% { color: currentColor; }
  20% { color: var(--text-motion-highlight); }
}
@keyframes fabricator-text-motion-wave {
  0%, 40%, 100% { translate: 0 0; }
  20% { translate: 0 calc(var(--text-motion-distance) * -0.6); }
}
[data-slot="text-motion"] {
  --text-motion-duration: calc(var(--motion-reveal) * var(--motion-scale, 1));
  --text-motion-exit-duration: calc(var(--motion-reveal-exit) * var(--motion-scale, 1));
  --text-motion-loop-duration: calc(var(--motion-reveal) * 3 * var(--motion-scale, 1));
}
[data-slot="text-motion"] [data-slot="text-motion-word"],
${PIECE} {
  display: inline-block;
  white-space: nowrap;
}
[data-by="line"] > ${PIECE},
[data-by="text"] > ${PIECE} {
  white-space: pre-line;
}
${PIECE} {
  animation: fabricator-text-motion-enter var(--text-motion-duration) var(--motion-ease-enter) both paused;
  animation-delay: calc(var(--text-motion-duration) * (var(--text-motion-start, 0) + var(--text-motion-step) * var(--text-motion-stagger)));
}
[data-state="playing"] > ${PIECE},
[data-state="playing"] > [data-slot="text-motion-word"] > ${PIECE} {
  animation-play-state: running;
}
[data-state="done"] > ${PIECE},
[data-state="done"] > [data-slot="text-motion-word"] > ${PIECE} {
  animation: var(--text-motion-loops, none) var(--text-motion-loop-duration) var(--motion-ease-move) infinite;
  animation-delay: calc(var(--text-motion-loop-duration) * 0.4 * var(--text-motion-step) / var(--text-motion-steps));
}
[data-state="exit"] > ${PIECE},
[data-state="exit"] > [data-slot="text-motion-word"] > ${PIECE} {
  animation: fabricator-text-motion-exit var(--text-motion-exit-duration) var(--motion-ease-exit) both;
  animation-delay: calc(var(--text-motion-exit-duration) * var(--text-motion-step) * var(--text-motion-stagger));
}
[data-effect~="fade"] { --text-motion-from-opacity: 0; --text-motion-exit-opacity: 0; }
[data-effect~="blur"] {
  --text-motion-from-filter: blur(var(--text-motion-blur));
  --text-motion-exit-filter: blur(var(--text-motion-blur));
}
[data-effect~="rise"] {
  --text-motion-from-y: var(--text-motion-distance);
  --text-motion-exit-y: calc(var(--text-motion-distance) * -1);
}
[data-effect~="fall"] {
  --text-motion-from-y: calc(var(--text-motion-distance) * -1);
  --text-motion-exit-y: var(--text-motion-distance);
}
[data-effect~="slide"] {
  --text-motion-from-x: var(--text-motion-distance);
  --text-motion-exit-x: calc(var(--text-motion-distance) * -1);
}
[data-effect~="scale"] {
  --text-motion-from-scale: var(--text-motion-scale);
  --text-motion-exit-scale: var(--text-motion-scale);
}
[data-effect~="flip"] {
  --text-motion-from-rotate: -90deg;
  --text-motion-exit-rotate: 90deg;
}
[data-effect~="flip"] ${PIECE} { transform-origin: 50% 50% -0.5em; }
[data-effect~="mask"] {
  --text-motion-from-y: 100%;
  --text-motion-exit-y: -100%;
  --text-motion-from-clip: inset(-1em -1em 100% -1em);
  --text-motion-rest-clip: inset(-1em -1em 0 -1em);
  --text-motion-exit-clip: inset(100% -1em -1em -1em);
}
[data-effect="type"]:is([data-state="idle"], [data-state="playing"]) ${PIECE} {
  position: relative;
  animation-name: fabricator-text-motion-type;
  animation-timing-function: step-end;
  animation-duration: calc(var(--text-motion-duration) * var(--text-motion-stagger));
}
[data-effect="type"] ${PIECE} { position: relative; }
[data-effect="type"] ${PIECE}::before {
  content: "";
  position: absolute;
  inset-block: 0.1em;
  inset-inline-start: 0;
  width: var(--text-motion-caret-width);
  background: var(--text-motion-caret);
  opacity: 0;
  animation: fabricator-text-motion-caret calc(var(--text-motion-duration) * var(--text-motion-stagger)) step-end paused;
  animation-delay: calc(var(--text-motion-duration) * (var(--text-motion-start, 0) + var(--text-motion-step) * var(--text-motion-stagger)));
}
[data-effect="type"][data-state="playing"] ${PIECE}::before { animation-play-state: running; }
[data-effect="type"][data-state="done"] ${PIECE}[data-last]::after {
  content: "";
  position: absolute;
  inset-block: 0.1em;
  inset-inline-end: calc(var(--text-motion-caret-width) * -1.5);
  width: var(--text-motion-caret-width);
  background: var(--text-motion-caret);
  animation: fabricator-text-motion-blink calc(var(--motion-reveal) * 1.5 * var(--motion-scale, 1)) step-end infinite;
}
[data-slot="text-motion-rotate"] > [data-slot="text-motion-rotate-items"] > * {
  grid-area: 1 / 1;
}
/* Reduce Motion keeps the fades and the typing, and drops every move,
   blur, mask and loop. */
@media (prefers-reduced-motion: reduce) {
  [data-slot="text-motion-pieces"]:is([data-state="idle"], [data-state="playing"]):not([data-effect="type"]) ${PIECE} {
    animation-name: fabricator-text-motion-fade-in;
  }
  [data-slot="text-motion-pieces"][data-state="exit"] ${PIECE} {
    animation-name: fabricator-text-motion-fade-out;
  }
  [data-state="done"] > ${PIECE},
  [data-state="done"] > [data-slot="text-motion-word"] > ${PIECE} {
    animation: none;
  }
}
@media (scripting: none) {
  ${PIECE}, ${PIECE}::before { animation: none; }
}
`

const LOOP_ANIMATIONS: Record<TextMotionLoop, string> = {
  shimmer: "fabricator-text-motion-shimmer",
  wave: "fabricator-text-motion-wave",
}

function isMotionReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

type TextMotionGroupContextValue = { isPlaying: boolean }

const TextMotionGroupContext =
  React.createContext<TextMotionGroupContextValue | null>(null)

/** Plays when it scrolls into view: once its top is well inside the screen. */
function useInViewOnce(
  ref: React.RefObject<Element | null>,
  isWatching: boolean,
  onEnter: () => void
) {
  React.useEffect(() => {
    const element = ref.current
    if (!element || !isWatching) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        onEnter()
      },
      { rootMargin: "0px 0px -10% 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, isWatching, onEnter])
}

/**
 * Swaps each piece's text for scrambled glyphs until its own entrance ends,
 * on the same timing as the CSS: the reveal duration, the piece's step and
 * the group's start.
 */
function useScramble(
  ref: React.RefObject<HTMLElement | null>,
  isActive: boolean
) {
  React.useLayoutEffect(() => {
    const root = ref.current
    if (!root || !isActive || isMotionReduced()) return
    const style = getComputedStyle(root)
    const duration = getTextMotionDuration(
      style.getPropertyValue("--motion-reveal"),
      style.getPropertyValue("--motion-scale")
    )
    const stagger = Number(style.getPropertyValue("--text-motion-stagger"))
    const start = Number(style.getPropertyValue("--text-motion-start") || 0)
    const pieces = Array.from(root.querySelectorAll<HTMLElement>(PIECE)).map(
      (element) => ({
        element,
        text: element.textContent ?? "",
        start: (start + Number(element.dataset.step) * stagger) * duration,
      })
    )
    // New glyphs about every 50ms at the default speed, scaled with it.
    const frameLength = Math.max(16, duration / 14)
    const began = performance.now()
    let frame = 0
    const draw = (now: number) => {
      const elapsed = now - began
      const step = Math.floor(elapsed / frameLength)
      const progresses = pieces.map((piece) => {
        const progress = getTextMotionProgress(elapsed, piece.start, duration)
        piece.element.textContent = getTextMotionScramble(
          piece.text,
          progress,
          step
        )
        return progress
      })
      if (progresses.some((progress) => progress < 1)) {
        frame = requestAnimationFrame(draw)
      }
    }
    draw(began)
    return () => {
      cancelAnimationFrame(frame)
      for (const piece of pieces) piece.element.textContent = piece.text
    }
  }, [ref, isActive])
}

type TextMotionBaseProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** The text. Line breaks (`\n`) are kept. */
  children: string
  /** Entrance layers, combined; or `type`, which plays alone. */
  effect?: TextMotionEffect
  /** Loops that run after the entrance: `shimmer`, `wave`, or both. */
  loop?: TextMotionLoop | TextMotionLoop[]
  /** What plays as one piece. Characters when typing, words otherwise. */
  by?: TextMotionBy
  /** Where the stagger starts. */
  from?: TextMotionFrom
}

type TextMotionPiecesProps = TextMotionBaseProps & {
  state: TextMotionState
  /** Plays as one step of a TextMotionGroup's sequence. */
  isGrouped?: boolean
}

function TextMotionPieces({
  children,
  effect,
  loop,
  by,
  from = "start",
  state,
  isGrouped = false,
  className,
  style,
  ref,
  ...props
}: TextMotionPiecesProps) {
  const isTyping = effect === "type"
  const layers: TextMotionLayer[] = isTyping ? [] : getTextMotionEffects(effect)
  const unit = by ?? (isTyping ? "character" : "word")
  const loops = loop === undefined ? [] : [loop].flat()
  const split = React.useMemo(
    () => splitTextMotion(children, unit),
    [children, unit]
  )
  const order = React.useMemo(
    () => getTextMotionOrder(split.count, from, children),
    [split.count, from, children]
  )
  const steps = split.count === 0 ? 0 : Math.max(...order) + 1
  const stagger = getTextMotionStagger(unit, isTyping)
  const lastIndex = order.lastIndexOf(steps - 1)
  const innerRef = React.useRef<HTMLSpanElement>(null)

  useScramble(innerRef, state === "playing" && layers.includes("scramble"))

  const renderPiece = (text: string, index: number) => (
    <span
      key={index}
      data-slot="text-motion-piece"
      data-step={order[index]}
      data-last={index === lastIndex ? "" : undefined}
      style={{ "--text-motion-step": order[index] } as React.CSSProperties}
    >
      {text}
    </span>
  )

  const lines = split.lines.map((line) => {
    if (unit === "line") {
      if (line.words.length === 0) return null
      const pieceIndex = split.lines
        .slice(0, line.index)
        .filter((previous) => previous.words.length > 0).length
      return renderPiece(line.text, pieceIndex)
    }
    return line.words.map((word, position) => (
      <React.Fragment key={word.index}>
        {position > 0 && " "}
        {unit === "word" && renderPiece(word.text, word.index)}
        {unit === "character" && (
          <span data-slot="text-motion-word">
            {word.characters.map((character) =>
              renderPiece(character.text, character.index)
            )}
          </span>
        )}
      </React.Fragment>
    ))
  })

  return (
    <span
      ref={ref}
      data-slot="text-motion"
      className={cn("cn-text-motion", className)}
      style={style}
      {...props}
    >
      <style href="fabricator-text-motion" precedence="components">
        {TEXT_MOTION_STYLES}
      </style>
      <span className="sr-only">{children}</span>
      <span
        ref={innerRef}
        aria-hidden
        data-slot="text-motion-pieces"
        data-state={state}
        data-grouped={isGrouped ? "" : undefined}
        data-by={unit}
        data-effect={isTyping ? "type" : layers.join(" ")}
        data-loop={loops.length > 0 ? loops.join(" ") : undefined}
        data-span={getTextMotionSpan(steps, stagger, isTyping)}
        style={
          {
            "--text-motion-stagger": stagger,
            "--text-motion-steps": Math.max(steps, 1),
            "--text-motion-loops":
              loops.length > 0
                ? loops.map((name) => LOOP_ANIMATIONS[name]).join(", ")
                : undefined,
          } as React.CSSProperties
        }
      >
        {unit === "text"
          ? split.count > 0 && renderPiece(children, 0)
          : lines.map((line, index) => (
              <React.Fragment key={index}>
                {index > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
      </span>
    </span>
  )
}

type TextMotionProps = TextMotionBaseProps & {
  /** When it plays: once in view, or as soon as it's on the page. */
  trigger?: TextMotionTrigger
  /** Called once the last piece has landed. */
  onComplete?: () => void
}

function TextMotion({
  trigger = "view",
  onComplete,
  ...props
}: TextMotionProps) {
  const group = React.useContext(TextMotionGroupContext)
  const ref = React.useRef<HTMLSpanElement>(null)
  const [state, setState] = React.useState<TextMotionState>(
    trigger === "mount" && !group ? "playing" : "idle"
  )
  const play = React.useCallback(() => setState("playing"), [])
  const onCompleteRef = React.useRef(onComplete)
  React.useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useInViewOnce(ref, !group && trigger === "view" && state === "idle", play)

  React.useEffect(() => {
    if (group?.isPlaying) play()
  }, [group?.isPlaying, play])

  // Done once the last piece's entrance finishes, even when it finished
  // before the page hydrated.
  React.useEffect(() => {
    if (state !== "playing") return
    const last = ref.current?.querySelector(`${PIECE}[data-last]`)
    const animations = last?.getAnimations() ?? []
    let isCurrent = true
    Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        if (!isCurrent) return
        setState("done")
        onCompleteRef.current?.()
      },
      (error: unknown) => {
        if (!isCancelled(error)) throw error
      }
    )
    return () => {
      isCurrent = false
    }
  }, [state])

  return (
    <TextMotionPieces
      ref={ref}
      state={state}
      isGrouped={group !== null}
      {...props}
    />
  )
}

type TextMotionGroupProps = React.ComponentProps<"div"> & {
  /** When the sequence plays: once in view, or as soon as it's on the page. */
  trigger?: TextMotionTrigger
}

/**
 * Plays the Text Motions inside it in order, each starting as the one before
 * it lands, on one trigger.
 */
function TextMotionGroup({
  trigger = "view",
  className,
  children,
  ref,
  ...props
}: TextMotionGroupProps) {
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isTimed, setIsTimed] = React.useState(false)
  const play = React.useCallback(() => setIsPlaying(true), [])

  React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement)

  React.useLayoutEffect(() => {
    const element = innerRef.current
    if (!element) return
    const sequence = Array.from(
      element.querySelectorAll<HTMLElement>(
        '[data-slot="text-motion-pieces"][data-grouped]'
      )
    ).filter(
      (pieces) => pieces.closest('[data-slot="text-motion-group"]') === element
    )
    const starts = getTextMotionStarts(
      sequence.map((pieces) => Number(pieces.dataset.span))
    )
    sequence.forEach((pieces, index) =>
      pieces.style.setProperty("--text-motion-start", String(starts[index]))
    )
    setIsTimed(true)
  }, [children])

  React.useEffect(() => {
    if (isTimed && trigger === "mount") play()
  }, [isTimed, trigger, play])

  useInViewOnce(innerRef, isTimed && trigger === "view" && !isPlaying, play)

  const context = React.useMemo(() => ({ isPlaying }), [isPlaying])

  return (
    <TextMotionGroupContext.Provider value={context}>
      <div
        ref={innerRef}
        data-slot="text-motion-group"
        data-state={isPlaying ? "playing" : "idle"}
        className={className}
        {...props}
      >
        {children}
      </div>
    </TextMotionGroupContext.Provider>
  )
}

type TextMotionRotateProps = Omit<TextMotionBaseProps, "children" | "loop"> & {
  /** The texts, shown in turn from the first. */
  texts: string[]
  /** How long each text stays, in milliseconds: reading time, not motion. */
  interval?: number
  /** When the first text plays: once in view, or as soon as it's on the page. */
  trigger?: TextMotionTrigger
}

/**
 * Cycles through `texts` in place. The leaving text plays its effects out
 * while the next plays in; the box keeps the widest text's width, and it
 * holds still while the pointer or focus is on it.
 */
function TextMotionRotate({
  texts,
  interval = 2500,
  trigger = "view",
  effect,
  by = "character",
  from,
  className,
  onPointerEnter,
  onPointerLeave,
  ...props
}: TextMotionRotateProps) {
  const [turn, setTurn] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)
  // The first text has to land, in view or in its group's turn, before the
  // texts start to cycle.
  const [hasLanded, setHasLanded] = React.useState(false)
  const land = React.useCallback(() => setHasLanded(true), [])

  React.useEffect(() => {
    if (!hasLanded || isPaused || texts.length < 2) return
    const timer = window.setTimeout(
      () => setTurn((value) => value + 1),
      interval
    )
    return () => window.clearTimeout(timer)
  }, [turn, hasLanded, isPaused, interval, texts.length])

  const textAt = (index: number) => texts[index % texts.length]
  const shared = { effect, by, from }

  return (
    <span
      data-slot="text-motion-rotate"
      className={cn("cn-text-motion-rotate", className)}
      onPointerEnter={(event) => {
        setIsPaused(true)
        onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        setIsPaused(false)
        onPointerLeave?.(event)
      }}
      {...props}
    >
      <span className="sr-only">{texts.join(", ")}</span>
      <span
        aria-hidden
        data-slot="text-motion-rotate-items"
        className="inline-grid"
      >
        {texts.map((text) => (
          <span
            key={text}
            data-slot="text-motion-rotate-size"
            className="invisible"
          >
            {text}
          </span>
        ))}
        {turn > 0 && (
          <TextMotionPieces key={`exit-${turn - 1}`} state="exit" {...shared}>
            {textAt(turn - 1)}
          </TextMotionPieces>
        )}
        {turn === 0 ? (
          <TextMotion
            key="turn-0"
            trigger={trigger}
            onComplete={land}
            {...shared}
          >
            {textAt(0)}
          </TextMotion>
        ) : (
          // Later texts play as they arrive, outside any group's sequence.
          <TextMotionGroupContext.Provider value={null}>
            <TextMotion key={`turn-${turn}`} trigger="mount" {...shared}>
              {textAt(turn)}
            </TextMotion>
          </TextMotionGroupContext.Provider>
        )}
      </span>
    </span>
  )
}

export { TextMotion, TextMotionGroup, TextMotionRotate }
export type {
  TextMotionBy,
  TextMotionEffect,
  TextMotionFrom,
  TextMotionLoop,
  TextMotionProps,
  TextMotionGroupProps,
  TextMotionRotateProps,
}
