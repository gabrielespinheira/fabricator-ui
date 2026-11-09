// Original Fabricator geometry and motion, shared by CSS and Reanimated.
// Append variants: native themes persist their index, so existing indices stay put.
export const SPINNER_VALUES = [
  "orbit",
  "ripple",
  "cascade",
  "wave",
  "pulse",
  "braid",
  "ring",
  "comet",
  "bounce",
  "equalizer",
  "flip",
  "scan",
  "quad-swap",
  "quad-fold",
  "tic-tac",
  "bloom",
  "checker",
  "diagonal",
  "triangle",
  "square",
  "rings",
  "hex",
] as const
export type SpinnerVariant = (typeof SPINNER_VALUES)[number]
type ParticleVariant = Exclude<SpinnerVariant, "ring">

export const SPINNERS = [
  {
    value: "orbit",
    label: "Orbit",
    description: "A bright trail circles twelve dots.",
  },
  {
    value: "ripple",
    label: "Ripple",
    description: "An expanding wave pushes the matrix outward.",
  },
  {
    value: "cascade",
    label: "Cascade",
    description: "Short columns rain down in staggered bursts.",
  },
  {
    value: "wave",
    label: "Wave",
    description: "Five dots ride a travelling sine wave.",
  },
  {
    value: "pulse",
    label: "Pulse",
    description: "A diamond of tiles expands and contracts as one.",
  },
  {
    value: "braid",
    label: "Braid",
    description: "Two strands cross over and under each other.",
  },
  {
    value: "comet",
    label: "Comet",
    description: "A sharp tail chases the square perimeter.",
  },
  {
    value: "bounce",
    label: "Bounce",
    description: "Three dots jump and squash on landing.",
  },
  {
    value: "equalizer",
    label: "Equalizer",
    description: "Five bars stretch in syncopated beats.",
  },
  {
    value: "flip",
    label: "Flip",
    description: "Four tiles turn edge-on, then open again.",
  },
  {
    value: "scan",
    label: "Scan",
    description: "A three-dot beam sweeps from side to side.",
  },
  {
    value: "quad-swap",
    label: "Quad swap",
    description: "Four tiles trade corners around a 2×2 grid.",
  },
  {
    value: "quad-fold",
    label: "Quad fold",
    description: "A 2×2 grid folds into the centre and opens.",
  },
  {
    value: "tic-tac",
    label: "Tic tac",
    description: "A 3×3 grid lights up one row at a time.",
  },
  {
    value: "bloom",
    label: "Bloom",
    description: "Nine dots burst outward from a 3×3 grid.",
  },
  {
    value: "checker",
    label: "Checker",
    description: "Alternating tiles turn across a 4×4 checkerboard.",
  },
  {
    value: "diagonal",
    label: "Diagonal",
    description: "A wave zips diagonally through a 4×4 grid.",
  },
  {
    value: "triangle",
    label: "Triangle",
    description: "A trail climbs and descends ten triangular tiles.",
  },
  {
    value: "square",
    label: "Square",
    description: "A hollow square of twelve tiles expands and contracts.",
  },
  {
    value: "rings",
    label: "Rings",
    description: "Two concentric dotted circles run in opposite directions.",
  },
  {
    value: "hex",
    label: "Hex",
    description: "Nineteen hexagonal cells swell in a honeycomb wave.",
  },
  { value: "ring", label: "Ring", description: "The classic rotating arc." },
] as const satisfies readonly {
  value: SpinnerVariant
  label: string
  description: string
}[]

export function isSpinnerVariant(value: unknown): value is SpinnerVariant {
  return SPINNER_VALUES.some((variant) => variant === value)
}

export function getSpinnerDuration(speed = 1) {
  return 1100 / (Number.isFinite(speed) && speed > 0 ? speed : 1)
}

export function getSpinnerAnimationName(variant: SpinnerVariant) {
  return `fabricator-spinner-${variant}`
}

export function getSpinnerVariables(
  variant: SpinnerVariant
): Record<string, string> {
  return {
    "--spinner-variant": String(SPINNER_VALUES.indexOf(variant)),
    ...Object.fromEntries(
      SPINNER_VALUES.map((value) => [
        `--spinner-${value}`,
        value === variant ? "inline" : "none",
      ])
    ),
    ...Object.fromEntries(
      SPINNER_VALUES.map((value) => [
        `--spinner-${value}-animation`,
        value === variant ? getSpinnerAnimationName(value) : "none",
      ])
    ),
  }
}

export type SpinnerDot = {
  x: number
  y: number
  phase: number
  opacity: number
  width: number
  height: number
  shape: "circle" | "square" | "triangle" | "hexagon"
  travelX: number
  travelY: number
}

function createDot(
  x: number,
  y: number,
  phase: number,
  options: Partial<SpinnerDot> = {}
): SpinnerDot {
  const dot: SpinnerDot = {
    x,
    y,
    phase: ((phase % 1) + 1) % 1,
    opacity: 1,
    width: 2.7,
    height: 2.7,
    shape: "circle",
    travelX: 0,
    travelY: 0,
    ...options,
  }
  // Math functions can differ in their final bits between server and browser engines.
  const round = (value: number) => Number(value.toFixed(6)) + 0
  return {
    ...dot,
    x: round(dot.x),
    y: round(dot.y),
    phase: round(dot.phase),
    travelX: round(dot.travelX),
    travelY: round(dot.travelY),
  }
}

export function getSpinnerPolygonPoints(
  shape: "triangle" | "hexagon",
  width: number,
  height: number
) {
  const points: readonly (readonly [number, number])[] =
    shape === "triangle"
      ? [
          [0.5, 0],
          [1, 1],
          [0, 1],
        ]
      : [
          [0.5, 0],
          [1, 0.25],
          [1, 0.75],
          [0.5, 1],
          [0, 0.75],
          [0, 0.25],
        ]
  return points.map(([x, y]) => `${x * width},${y * height}`).join(" ")
}

export function getSpinnerDots(variant: ParticleVariant): SpinnerDot[] {
  if (
    variant === "quad-swap" ||
    variant === "quad-fold" ||
    variant === "tic-tac" ||
    variant === "bloom" ||
    variant === "checker" ||
    variant === "diagonal"
  ) {
    const size = variant.startsWith("quad-")
      ? 2
      : variant === "tic-tac" || variant === "bloom"
        ? 3
        : 4
    const spacing =
      variant === "quad-swap"
        ? 12
        : size === 2
          ? 8
          : variant === "bloom"
            ? 5
            : size === 3
              ? 6
              : 4
    return Array.from({ length: size * size }, (_, index) => {
      const column = index % size
      const row = Math.floor(index / size)
      const x = 12 + (column - (size - 1) / 2) * spacing
      const y = 12 + (row - (size - 1) / 2) * spacing
      if (variant === "quad-swap")
        return createDot(x, y, index * 0.06, {
          shape: "square",
          width: 4,
          height: 4,
          travelX: 24 - 2 * x,
          travelY: 24 - 2 * y,
        })
      if (variant === "quad-fold")
        return createDot(x, y, 0, {
          shape: "square",
          width: 5,
          height: 5,
          travelX: 12 - x,
          travelY: 12 - y,
        })
      if (variant === "tic-tac")
        return createDot(x, y, -row / 3 - column * 0.035, {
          shape: "square",
          width: 3.8,
          height: 3.8,
          travelY: 1,
        })
      if (variant === "bloom")
        return createDot(x, y, -Math.hypot(x - 12, y - 12) * 0.045, {
          width: 3.2,
          height: 3.2,
          travelX: (x - 12) * 0.4,
          travelY: (y - 12) * 0.4,
        })
      if (variant === "checker")
        return createDot(x, y, ((row + column) % 2) * 0.5, {
          shape: "square",
          width: 3,
          height: 3,
        })
      return createDot(x, y, -(row + column) * 0.12, {
        shape: "square",
        width: 2.5,
        height: 2.5,
        travelX: 1.5,
        travelY: -1.5,
      })
    })
  }
  if (variant === "triangle") {
    return Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: row + 1 }, (_, column) => {
        const x = 12 + (column - row / 2) * 4.5
        const y = 5.1 + row * 4.5
        const order =
          column === row
            ? row
            : row === 3
              ? 6 - column
              : column === 0
                ? 9 - row
                : 4.5
        return createDot(x, y, -order / 9, {
          shape: "triangle",
          width: 3.4,
          height: 3.1,
          travelX: (12 - x) * 0.1,
          travelY: (12 - y) * 0.1,
        })
      })
    ).flat()
  }
  if (variant === "square") {
    return Array.from({ length: 16 }, (_, index) => {
      const x = 4.5 + (index % 4) * 5
      const y = 4.5 + Math.floor(index / 4) * 5
      return createDot(x, y, 0, {
        shape: "square",
        width: 2.8,
        height: 2.8,
        travelX: Math.sign(x - 12),
        travelY: Math.sign(y - 12),
      })
    }).filter(({ x, y }) => x === 4.5 || x === 19.5 || y === 4.5 || y === 19.5)
  }
  if (variant === "rings") {
    return Array.from({ length: 18 }, (_, index) => {
      const isInner = index < 6
      const angle = (isInner ? index / 6 : (index - 6) / 12) * 2 * Math.PI
      const radius = isInner ? 4 : 8
      return createDot(
        12 + Math.cos(angle) * radius,
        12 + Math.sin(angle) * radius,
        (angle / (2 * Math.PI)) * (isInner ? 1 : -1),
        {
          width: isInner ? 2.4 : 2.2,
          height: isInner ? 2.4 : 2.2,
          travelX: Math.cos(angle) * 1.1,
          travelY: Math.sin(angle) * 1.1,
        }
      )
    })
  }
  if (variant === "hex") {
    return Array.from({ length: 5 }, (_, row) => {
      const r = row - 2
      const minimum = Math.max(-2, -r - 2)
      const maximum = Math.min(2, -r + 2)
      return Array.from({ length: maximum - minimum + 1 }, (_, column) => {
        const q = minimum + column
        const x = 12 + (q + r / 2) * 3.6
        const y = 12 + (r * 3.6 * Math.sqrt(3)) / 2
        const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
        return createDot(
          x,
          y,
          Math.atan2(y - 12, x - 12) / (2 * Math.PI) + distance * 0.15,
          {
            shape: "hexagon",
            width: 3.1,
            height: 3.4,
            travelX: (x - 12) * 0.14,
            travelY: (y - 12) * 0.14,
          }
        )
      })
    }).flat()
  }

  if (variant === "wave") {
    return Array.from({ length: 5 }, (_, column) =>
      createDot(4 + column * 4, 12, column * 0.16, { travelY: 4 })
    )
  }
  if (variant === "braid") {
    return Array.from({ length: 10 }, (_, index) =>
      createDot(4 + (index % 5) * 4, index < 5 ? 8 : 16, (index % 5) * 0.14, {
        travelY: index < 5 ? 4 : -4,
        opacity: index < 5 ? 1 : 0.55,
      })
    )
  }
  if (variant === "bounce") {
    return Array.from({ length: 3 }, (_, index) =>
      createDot(6 + index * 6, 16, index * 0.16, {
        travelY: -8,
        width: 3.5,
        height: 3.5,
      })
    )
  }
  if (variant === "equalizer") {
    return Array.from({ length: 5 }, (_, index) =>
      createDot(4 + index * 4, 12, index * 0.17, {
        shape: "square",
        width: 2.5,
        height: 14,
      })
    )
  }
  if (variant === "flip") {
    return Array.from({ length: 4 }, (_, index) =>
      createDot(
        8 + (index % 2) * 8,
        8 + Math.floor(index / 2) * 8,
        index * 0.13,
        { shape: "square", width: 4.5, height: 4.5 }
      )
    )
  }
  if (variant === "scan") {
    return Array.from({ length: 3 }, (_, index) =>
      createDot(12, 8 + index * 4, index * 0.09, {
        shape: "square",
        width: 2.8,
        height: 2.8,
        travelX: 7,
      })
    )
  }
  if (variant === "cascade") {
    return Array.from({ length: 15 }, (_, index) =>
      createDot(
        4 + (index % 5) * 4,
        6 + Math.floor(index / 5) * 6,
        (index % 5) * 0.17 + Math.floor(index / 5) * 0.14,
        { shape: "square", width: 2.3, height: 3.2, travelY: 3 }
      )
    )
  }
  const grid = Array.from({ length: 25 }, (_, index) => {
    const x = (index % 5) - 2
    const y = Math.floor(index / 5) - 2
    const radius = Math.hypot(x, y)
    if (variant === "orbit")
      return createDot(12 + x * 4, 12 + y * 4, Math.atan2(y, x) / (2 * Math.PI))
    if (variant === "ripple")
      return createDot(12 + x * 4, 12 + y * 4, -radius * 0.2, {
        travelX: x * 0.65,
        travelY: y * 0.65,
      })
    if (variant === "pulse")
      return createDot(12 + x * 4, 12 + y * 4, 0, {
        shape: "square",
        travelX: x,
        travelY: y,
      })
    // A clockwise perimeter order, independent of the grid's row-major order.
    const order = y === -2 ? x + 2 : x === 2 ? y + 6 : y === 2 ? 10 - x : 14 - y
    return createDot(12 + x * 4, 12 + y * 4, -order / 16, { shape: "square" })
  })
  if (variant === "orbit")
    return grid.filter(({ x, y }) => {
      const radius = Math.hypot(x - 12, y - 12)
      return radius >= 6 && radius <= 9
    })
  if (variant === "pulse")
    return grid.filter(({ x, y }) => Math.abs(x - 12) + Math.abs(y - 12) <= 8)
  if (variant === "comet")
    return grid.filter(({ x, y }) => x === 4 || x === 20 || y === 4 || y === 20)
  return grid
}

export type SpinnerFrame = {
  at: number
  opacity: number
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
  rotation: number
}
export type SpinnerMotion = readonly [
  SpinnerFrame,
  SpinnerFrame,
  ...SpinnerFrame[],
]

function frame(
  at: number,
  values: Partial<Omit<SpinnerFrame, "at">> = {}
): SpinnerFrame {
  return {
    at,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    ...values,
  }
}

const MOTIONS = {
  "quad-swap": [
    frame(0, { scaleX: 0.85, scaleY: 0.85 }),
    frame(0.25, { translateX: 1, scaleX: 1, scaleY: 0.7 }),
    frame(0.5, { translateX: 1, translateY: 1, scaleX: 0.85, scaleY: 0.85 }),
    frame(0.75, { translateY: 1, scaleX: 0.7, scaleY: 1 }),
    frame(1, { scaleX: 0.85, scaleY: 0.85 }),
  ],
  "quad-fold": [
    frame(0, { opacity: 0.9 }),
    frame(0.3, {
      translateX: 0.5,
      translateY: 0.5,
      scaleX: 0.15,
      opacity: 0.65,
    }),
    frame(0.5, { translateX: 1, translateY: 1, scaleY: 0.15, opacity: 1 }),
    frame(0.75, { translateX: 0.4, translateY: 0.4, scaleX: 0.7, scaleY: 0.7 }),
    frame(1, { opacity: 0.9 }),
  ],
  "tic-tac": [
    frame(0, { opacity: 0.1, scaleX: 0.15, translateY: -1 }),
    frame(0.16, { opacity: 1, scaleX: 1.1, translateY: 0 }),
    frame(0.42, { opacity: 0.65, scaleX: 0.85, translateY: 0.5 }),
    frame(0.72, { opacity: 0.1, scaleX: 0.15, translateY: 1 }),
    frame(1, { opacity: 0.1, scaleX: 0.15, translateY: -1 }),
  ],
  bloom: [
    frame(0, { opacity: 0.05, scaleX: 0.25, scaleY: 0.25 }),
    frame(0.25, { opacity: 1, scaleX: 1.15, scaleY: 1.15 }),
    frame(0.65, {
      opacity: 0.05,
      translateX: 1,
      translateY: 1,
      scaleX: 0.3,
      scaleY: 0.3,
    }),
    frame(1, { opacity: 0.05, scaleX: 0.25, scaleY: 0.25 }),
  ],
  checker: [
    frame(0),
    frame(0.25, { opacity: 0.8, scaleX: 0.65, scaleY: 0.65, rotation: 90 }),
    frame(0.5, { opacity: 0.15, scaleX: 0.12, scaleY: 0.12, rotation: 180 }),
    frame(0.75, { opacity: 0.8, scaleX: 0.65, scaleY: 0.65, rotation: 270 }),
    frame(1, { rotation: 360 }),
  ],
  diagonal: [
    frame(0, {
      opacity: 0.05,
      scaleX: 0.3,
      scaleY: 0.3,
      translateX: -1,
      translateY: -1,
    }),
    frame(0.18, {
      scaleX: 1.15,
      scaleY: 0.6,
      translateX: -0.2,
      translateY: -0.2,
    }),
    frame(0.5, {
      opacity: 0.5,
      scaleX: 0.8,
      scaleY: 1.2,
      translateX: 0.5,
      translateY: 0.5,
    }),
    frame(0.75, { opacity: 0.05, translateX: 1, translateY: 1 }),
    frame(1, {
      opacity: 0.05,
      scaleX: 0.3,
      scaleY: 0.3,
      translateX: -1,
      translateY: -1,
    }),
  ],
  triangle: [
    frame(0, { opacity: 0.12, scaleX: 0.8, scaleY: 0.8 }),
    frame(0.07, { scaleX: 1.2, scaleY: 1.2 }),
    frame(0.3, { opacity: 0.7, translateX: 1, translateY: 1 }),
    frame(0.65, { opacity: 0.12, scaleX: 0.8, scaleY: 0.8 }),
    frame(1, { opacity: 0.12, scaleX: 0.8, scaleY: 0.8 }),
  ],
  square: [
    frame(0, {
      opacity: 0.5,
      scaleX: 0.8,
      scaleY: 0.8,
      translateX: -1,
      translateY: -1,
    }),
    frame(0.25, {
      scaleX: 1.05,
      scaleY: 1.05,
      translateX: 0.3,
      translateY: 0.3,
    }),
    frame(0.5, { translateX: 1, translateY: 1 }),
    frame(0.75, {
      scaleX: 1.05,
      scaleY: 1.05,
      translateX: 0.3,
      translateY: 0.3,
    }),
    frame(1, {
      opacity: 0.5,
      scaleX: 0.8,
      scaleY: 0.8,
      translateX: -1,
      translateY: -1,
    }),
  ],
  rings: [
    frame(0, { opacity: 0.2, scaleX: 0.6, scaleY: 0.6 }),
    frame(0.18, { translateX: 0.6, translateY: 0.6, scaleX: 1.1, scaleY: 1.1 }),
    frame(0.5, {
      opacity: 0.4,
      translateX: 1,
      translateY: 1,
      scaleX: 0.7,
      scaleY: 0.7,
    }),
    frame(0.8, {
      opacity: 0.2,
      translateX: 0.3,
      translateY: 0.3,
      scaleX: 0.6,
      scaleY: 0.6,
    }),
    frame(1, { opacity: 0.2, scaleX: 0.6, scaleY: 0.6 }),
  ],
  hex: [
    frame(0, { opacity: 0.18, scaleX: 0.9, scaleY: 0.9 }),
    frame(0.2, { translateX: 1, translateY: 1 }),
    frame(0.4, { opacity: 0.6, rotation: 60, scaleX: 0.75, scaleY: 1.15 }),
    frame(0.7, { opacity: 0.18, scaleX: 0.9, scaleY: 0.9 }),
    frame(1, { opacity: 0.18, scaleX: 0.9, scaleY: 0.9 }),
  ],

  orbit: [
    frame(0, { opacity: 0.12, scaleX: 0.8, scaleY: 0.8 }),
    frame(0.1, { opacity: 1, scaleX: 1.18, scaleY: 1.18 }),
    frame(0.4, { opacity: 0.22 }),
    frame(1, { opacity: 0.12, scaleX: 0.8, scaleY: 0.8 }),
  ],
  ripple: [
    frame(0, { opacity: 0.08, scaleX: 0.45, scaleY: 0.45 }),
    frame(0.22, { opacity: 1, translateX: 0.2, translateY: 0.2 }),
    frame(0.65, {
      opacity: 0.08,
      translateX: 1,
      translateY: 1,
      scaleX: 0.6,
      scaleY: 0.6,
    }),
    frame(1, { opacity: 0.08, scaleX: 0.45, scaleY: 0.45 }),
  ],
  cascade: [
    frame(0, { opacity: 0, translateY: -1, scaleY: 0.5 }),
    frame(0.2, { opacity: 1, translateY: -0.5 }),
    frame(0.55, { opacity: 0.7, translateY: 0.6, scaleY: 1.2 }),
    frame(0.8, { opacity: 0, translateY: 1 }),
    frame(1, { opacity: 0, translateY: -1, scaleY: 0.5 }),
  ],
  wave: [
    frame(0, { opacity: 0.8 }),
    frame(0.125, { opacity: 0.9, translateY: -0.707 }),
    frame(0.25, { translateY: -1 }),
    frame(0.375, { opacity: 0.9, translateY: -0.707 }),
    frame(0.5, { opacity: 0.8 }),
    frame(0.625, { opacity: 0.7, translateY: 0.707 }),
    frame(0.75, { opacity: 0.6, translateY: 1 }),
    frame(0.875, { opacity: 0.7, translateY: 0.707 }),
    frame(1, { opacity: 0.8 }),
  ],
  pulse: [
    frame(0, { opacity: 0.35, scaleX: 0.55, scaleY: 0.55 }),
    frame(0.28, { opacity: 1, translateX: 0.8, translateY: 0.8 }),
    frame(0.45, {
      opacity: 0.85,
      translateX: 1,
      translateY: 1,
      scaleX: 1.1,
      scaleY: 1.1,
    }),
    frame(0.8, { opacity: 0.35, scaleX: 0.55, scaleY: 0.55 }),
    frame(1, { opacity: 0.35, scaleX: 0.55, scaleY: 0.55 }),
  ],
  braid: [
    frame(0, { translateY: -1, opacity: 0.55, scaleX: 0.8, scaleY: 0.8 }),
    frame(0.25, { translateY: 0 }),
    frame(0.5, { translateY: 1, opacity: 0.55, scaleX: 0.8, scaleY: 0.8 }),
    frame(0.75, { translateY: 0 }),
    frame(1, { translateY: -1, opacity: 0.55, scaleX: 0.8, scaleY: 0.8 }),
  ],
  comet: [
    frame(0, { opacity: 0.04, scaleX: 0.5, scaleY: 0.5 }),
    frame(0.05, { opacity: 1, scaleX: 1.25, scaleY: 1.25 }),
    frame(0.2, { opacity: 0.6 }),
    frame(0.45, { opacity: 0.04, scaleX: 0.5, scaleY: 0.5 }),
    frame(1, { opacity: 0.04, scaleX: 0.5, scaleY: 0.5 }),
  ],
  bounce: [
    frame(0, { scaleX: 1.15, scaleY: 0.75 }),
    frame(0.12, { translateY: 0.64, scaleX: 0.9, scaleY: 1.1 }),
    frame(0.3, { translateY: 1 }),
    frame(0.48, { translateY: 0.64, scaleX: 0.9, scaleY: 1.1 }),
    frame(0.6, { scaleX: 1.2, scaleY: 0.7 }),
    frame(0.75),
    frame(1, { scaleX: 1.15, scaleY: 0.75 }),
  ],
  equalizer: [
    frame(0, { scaleY: 0.2, opacity: 0.6 }),
    frame(0.2, { scaleY: 1 }),
    frame(0.45, { scaleY: 0.35, opacity: 0.75 }),
    frame(0.7, { scaleY: 0.8 }),
    frame(1, { scaleY: 0.2, opacity: 0.6 }),
  ],
  flip: [
    frame(0, { opacity: 0.9 }),
    frame(0.25, { rotation: 90, scaleX: 0.12, opacity: 0.5 }),
    frame(0.5, { rotation: 180, opacity: 0.9 }),
    frame(0.75, { rotation: 270, scaleX: 0.12, opacity: 0.5 }),
    frame(1, { rotation: 360, opacity: 0.9 }),
  ],
  scan: [
    frame(0, { translateX: -1, opacity: 0.35 }),
    frame(0.2, { translateX: -0.6, opacity: 1 }),
    frame(0.5, { translateX: 1, opacity: 0.35 }),
    frame(0.7, { translateX: 0.6, opacity: 1 }),
    frame(1, { translateX: -1, opacity: 0.35 }),
  ],
} satisfies Record<ParticleVariant, SpinnerMotion>

export function getSpinnerMotion(variant: ParticleVariant): SpinnerMotion {
  return MOTIONS[variant]
}

/** Linear sampling of the exact CSS keyframes; runs on native's UI thread. */
export function getSpinnerFrame(
  motion: SpinnerMotion,
  phase: number
): SpinnerFrame {
  "worklet"
  let previous = motion[0]
  for (const next of motion.slice(1)) {
    if (phase > next.at) {
      previous = next
      continue
    }
    const progress = (phase - previous.at) / (next.at - previous.at)
    return {
      at: phase,
      opacity: previous.opacity + (next.opacity - previous.opacity) * progress,
      scaleX: previous.scaleX + (next.scaleX - previous.scaleX) * progress,
      scaleY: previous.scaleY + (next.scaleY - previous.scaleY) * progress,
      translateX:
        previous.translateX +
        (next.translateX - previous.translateX) * progress,
      translateY:
        previous.translateY +
        (next.translateY - previous.translateY) * progress,
      rotation:
        previous.rotation + (next.rotation - previous.rotation) * progress,
    }
  }
  return previous
}

// Loading cycles stay independent of UI transition speeds.
export const SPINNER_STYLES =
  Object.entries(MOTIONS)
    .map(
      ([variant, motion]) => `
@keyframes fabricator-spinner-${variant} {
${motion.map((state) => `${state.at * 100}% { opacity: ${state.opacity}; transform: translate(calc(var(--spinner-travel-x, 0px) * ${state.translateX}), calc(var(--spinner-travel-y, 0px) * ${state.translateY})) rotate(${state.rotation}deg) scale(${state.scaleX}, ${state.scaleY}); }`).join("\n")}
}`
    )
    .join("\n") +
  `
@keyframes fabricator-spinner-ring { to { transform: rotate(360deg); } }
[data-slot="spinner-dot"] { transform-box: fill-box; transform-origin: center; }
[data-slot="spinner"][data-animated="false"] [data-spinner-motion],
[data-motion="off"] [data-slot="spinner"] [data-spinner-motion] { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  [data-slot="spinner"] [data-spinner-motion] { animation: none !important; }
}
`
