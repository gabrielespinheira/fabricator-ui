import * as React from "react"
import { cn } from "cn"

import {
  getSpinnerAnimationName,
  getSpinnerDots,
  getSpinnerDuration,
  getSpinnerPolygonPoints,
  SPINNER_STYLES,
  SPINNER_VALUES,
  type SpinnerDot,
  type SpinnerVariant,
} from "@/registry/bases/__base__/lib/spinner-model"

type SpinnerDotStyle = React.CSSProperties & {
  "--spinner-travel-x": string
  "--spinner-travel-y": string
}

function getDotStyle(
  pattern: SpinnerVariant,
  dot: SpinnerDot,
  duration: number,
  isExplicit: boolean
): SpinnerDotStyle {
  const name = getSpinnerAnimationName(pattern)
  return {
    "--spinner-travel-x": `${dot.travelX}px`,
    "--spinner-travel-y": `${dot.travelY}px`,
    animation: `${isExplicit ? name : `var(--spinner-${pattern}-animation, ${pattern === "orbit" ? name : "none"})`} ${duration}ms linear ${-dot.phase * duration}ms infinite`,
  }
}

type SpinnerProps = React.ComponentProps<"svg"> & {
  variant?: SpinnerVariant
  speed?: number
  animated?: boolean
}

function Spinner({
  className,
  variant,
  speed = 1,
  animated = true,
  children,
  ...props
}: SpinnerProps) {
  const duration = getSpinnerDuration(speed)
  return (
    <>
      <style href="fabricator-spinner" precedence="components">
        {SPINNER_STYLES}
      </style>
      <svg
        data-slot="spinner"
        data-animated={animated}
        role="status"
        aria-label="Loading"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("cn-spinner inline-block shrink-0", className)}
        {...props}
      >
        {(variant ? [variant] : SPINNER_VALUES).map((pattern) => (
          <g
            key={pattern}
            data-slot="spinner-pattern"
            data-variant={pattern}
            aria-hidden="true"
            style={{
              display: variant
                ? "inline"
                : `var(--spinner-${pattern}, ${pattern === "orbit" ? "inline" : "none"})`,
            }}
          >
            {pattern === "ring" ? (
              <g
                data-spinner-motion=""
                style={{
                  transformOrigin: "12px 12px",
                  animation: `${variant ? "fabricator-spinner-ring" : "var(--spinner-ring-animation, none)"} ${duration}ms linear infinite`,
                }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity=".16"
                />
                <path
                  d="M12 3a9 9 0 0 1 9 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              getSpinnerDots(pattern).map((dot, index) => (
                <g
                  key={index}
                  opacity={dot.opacity}
                  transform={
                    dot.shape === "triangle" || dot.shape === "hexagon"
                      ? `translate(${dot.x - dot.width / 2}, ${dot.y - dot.height / 2})`
                      : undefined
                  }
                >
                  {dot.shape === "triangle" || dot.shape === "hexagon" ? (
                    <polygon
                      data-slot="spinner-dot"
                      data-spinner-motion=""
                      points={getSpinnerPolygonPoints(
                        dot.shape,
                        dot.width,
                        dot.height
                      )}
                      opacity={0.3 + dot.phase * 0.6}
                      style={getDotStyle(
                        pattern,
                        dot,
                        duration,
                        variant !== undefined
                      )}
                    />
                  ) : (
                    <rect
                      data-slot="spinner-dot"
                      data-spinner-motion=""
                      x={dot.x - dot.width / 2}
                      y={dot.y - dot.height / 2}
                      width={dot.width}
                      height={dot.height}
                      rx={dot.shape === "circle" ? dot.width / 2 : 0.6}
                      opacity={0.3 + dot.phase * 0.6}
                      style={getDotStyle(
                        pattern,
                        dot,
                        duration,
                        variant !== undefined
                      )}
                    />
                  )}
                </g>
              ))
            )}
          </g>
        ))}
        {children}
      </svg>
    </>
  )
}

export { Spinner, type SpinnerProps, type SpinnerVariant }
