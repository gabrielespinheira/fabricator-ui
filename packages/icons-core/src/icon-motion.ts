import type { IconDirection, IconMotion } from "./runtime/types"

const categoryMotion: Record<string, IconMotion> = {
  text: "rows",
  transportation: "right",
  travel: "right",
}

const directions: readonly IconDirection[] = [
  "up-left",
  "up-right",
  "down-left",
  "down-right",
  "left",
  "right",
  "up",
  "down",
]

function getArrowMotion(name: string): IconMotion | undefined {
  if (name === "chevron-first") return "left"
  if (name === "chevron-last") return "right"
  if (/^(arrow|chevrons)-(left-right|right-left)(-|$)/.test(name))
    return "exchange-horizontal"
  if (/^(arrow|chevrons)-(up-down|down-up)(-|$)/.test(name))
    return "exchange-vertical"

  if (name.startsWith("corner-")) {
    return directions.find((direction) => direction === name.split("-").at(-1))
  }

  const suffix =
    /(?:^|-)(?:arrows?|chevrons?|move|shift|gesture-swipe)-(.+)$/.exec(
      name
    )?.[1]
  if (suffix) {
    if (/^(left|right)-(up|down)$/.test(suffix)) {
      return directions.find((direction) => suffix.endsWith(`-${direction}`))
    }
    const direction = suffix.replace(/^big-/, "")
    return directions.find(
      (candidate) =>
        direction === candidate || direction.startsWith(`${candidate}-`)
    )
  }
}

export function getIconMotion(
  name: string,
  categories: string[] = []
): IconMotion {
  const arrow = getArrowMotion(name)
  if (arrow) return arrow
  if (name === "panel-left" || name === "panel-right") return name
  if (/^(maximize|expand|move)(-|$)/.test(name)) return "expand"
  if (/^(minimize|shrink)(-|$)/.test(name)) return "contract"
  if (/^(?:cloud-)?download$|^(?:file|folder)-down$/.test(name))
    return "receive"
  if (/^(?:cloud-)?upload$|^(?:file|folder)-up$/.test(name)) return "dispatch"
  if (/^(external-link|square-up-right)(-|$)/.test(name)) return "exit-diagonal"
  if (
    /^(log-in|log-out|play|send-horizontal|skip-forward|fast-forward)$/.test(
      name
    )
  )
    return "right"
  if (/^(rewind|skip-back)$/.test(name)) return "left"
  if (/^navigation-2(-off)?$/.test(name)) return "up"
  if (name === "plane-landing") return "down-right"
  if (/^(send|rocket|navigation|plane-takeoff)(-|$)/.test(name)) return "send"
  if (/^(rotate|refresh)-ccw(-|$)/.test(name)) return "rotate-back"
  if (/^(rotate-cw|refresh-cw|loader|orbit|fan)(-|$)/.test(name))
    return "rotate-forward"
  if (/^(clock|timer)(-|$)/.test(name)) return "clock"
  if (/^(eye|eye-closed|eye-dashed)$/.test(name)) return "blink"
  if (/^(mail|mailbox|mails)(-|$)/.test(name)) return "envelope"
  if (/^(camera|aperture)(-|$)/.test(name)) return "shutter"
  if (/^(heart|activity)(-|$)/.test(name)) return "heartbeat"
  if (/^(wifi|radio|rss|antenna|radar|cast)(-|$)/.test(name)) return "radiate"
  if (/^(volume|audio-lines|audio-waveform|waves|equalizer)(-|$)/.test(name))
    return "sound"
  if (/^(lock|unlock)(-|$)/.test(name)) return "shackle"
  if (/(^|-)check(-|$)/.test(name)) return "check"
  if (/^(grip|grip-vertical|grip-horizontal|hand-grab)(-|$)/.test(name))
    return "drag"
  if (/^(chart-(no-axes-)?(bar|column)|signal)(-|$)/.test(name)) return "bars"
  if (/^(align|indent|text-align|list|text-wrap|menu)(-|$)/.test(name))
    return "rows"
  if (/^(layers|files|copy|folders|rectangles|squares)(-|$)/.test(name))
    return "stack"
  if (/^(dot|circle-small|ellipsis-vertical)$/.test(name)) return "hop"
  if (/^(circle|disc|disc-2)$/.test(name)) return "pulse"
  if (/^(circle|octagon|triangle)-exclamation-point$/.test(name)) return "pulse"
  if (/^(bookmark|book-marked)(-|$)/.test(name)) return "bookmark"
  if (/^(pen|pencil|highlighter|edit|square-pen)(-|$)/.test(name))
    return "pencil"
  if (/^(bell|alarm-clock)(-|$)/.test(name)) return "bell"
  if (/^(toggle|switch)(-|$)/.test(name)) return "toggle"
  if (/^(repeat|spin|circle-dashed|disc|settings|cog|sun)(-|$)/.test(name))
    return "turn"
  if (/^(folder|door|book|archive|box|package|clipboard|file)(-|$)/.test(name))
    return "open"
  if (/^(bluetooth|audio|mic)(-|$)/.test(name)) return "pulse"
  if (/^(search|scan|focus|eye|locate|inspect|view|magnifying)(-|$)/.test(name))
    return "scan"
  if (/^(sparkle|sparkles|star|zap|flash|lightbulb|flame)(-|$)/.test(name))
    return "spark"
  if (
    /^(list|table|grid|panel|column|columns|rows|sidebar|layout|align|dock)(-|$)/.test(
      name
    )
  )
    return "widen"
  if (/^(hand|pointer|mouse|cursor|keyboard|fingerprint|plug)(-|$)/.test(name))
    return "press"
  if (/^(chart|trending|battery|database|server|gauge|meter)(-|$)/.test(name))
    return "rise"
  if (
    /^(map-pin|map-pinned|pin|flag|signpost|footprints|step|person-standing)(-|$)/.test(
      name
    )
  )
    return "hop"
  if (
    /^(hammer|wrench|scissors|paintbrush|brush|paint|axe|pipette|sword)(-|$)/.test(
      name
    )
  )
    return "swing"
  if (/^(wind|cloud|umbrella|leaf|leaves|sailboat)(-|$)/.test(name))
    return "sweep"
  if (/^(user|users|contact|person|smile|laugh|frown|annoyed)(-|$)/.test(name))
    return "nod"
  if (/^(save|import)(-|$)/.test(name)) return "down"
  if (/^(share|message)(-|$)/.test(name)) return "lift"
  if (/(^|-)(plus|minus|x|tick|dot)(-|$)/.test(name)) return "mark"
  const primary = categories.find((category) => category in categoryMotion)
  return (primary && categoryMotion[primary]) || "settle"
}
