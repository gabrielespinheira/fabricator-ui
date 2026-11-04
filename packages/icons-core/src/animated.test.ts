import { describe, expect, it } from "vitest"

import {
  AnimatedTransformError,
  loadAnimatedIcons,
  transformAnimatedIcon,
} from "./animated"
import { licenseText } from "./notices"
import { loadOutlineIcons } from "./outline"
import type { IconElement } from "./types"

function iconSource({
  root = `<svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >`,
  close = "</svg>",
  shapes = `<motion.path animate={controls} d="M1 1h2" initial="normal" variants={VARIANTS} />`,
} = {}) {
  return `"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface HomeIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HomeIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const VARIANTS: Variants = { normal: { opacity: 1 }, animate: { opacity: 0 } };

const HomeIcon = forwardRef<HomeIconHandle, HomeIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        ${root}
          ${shapes}
        ${close}
      </div>
    );
  }
);

HomeIcon.displayName = "HomeIcon";

export { HomeIcon };
`
}

const OPTIONS = { name: "house", upstreamName: "home" }

describe("transformAnimatedIcon geometry", () => {
  const withLucide = (lucide: IconElement[]) => ({ ...OPTIONS, lucide })

  it("draws Lucide's current geometry when the parts match", () => {
    const output = transformAnimatedIcon(
      iconSource({
        shapes: `<motion.path animate={controls} d="M2 2h10v10" variants={VARIANTS} /><path d="M20 20h2" />`,
      }),
      withLucide([
        ["path", { d: "M20.5 20h1.5" }],
        ["path", { d: "M2 2.5h10v9.5" }],
      ])
    )
    expect(output).toContain('d="M2 2.5h10v9.5"')
    expect(output).toContain('d="M20.5 20h1.5"')
    expect(output).not.toContain('d="M2 2h10v10"')
    expect(output.indexOf("M2 2.5")).toBeLessThan(output.indexOf("M20.5"))
  })

  it("leaves a part alone when its animation writes its geometry", () => {
    for (const shapes of [
      `<motion.path animate={controls} d="M2 2h10" variants={{ normal: { d: "M2 2h10" }, animate: { d: "M2 4h10" } }} />`,
      `<motion.line animate={controls} variants={LINE} x1="2" x2="8" y1="2" y2="2" />`,
    ]) {
      const output = transformAnimatedIcon(
        iconSource({ shapes }).replace(
          "const VARIANTS",
          "const LINE = { animate: { x2: [8, 4] } };\n\nconst VARIANTS"
        ),
        withLucide([["path", { d: "M2 2.5h6" }]])
      )
      expect(output).not.toContain("M2 2.5h6")
    }
  })

  it("can change a part's element, keeping its animation", () => {
    const output = transformAnimatedIcon(
      iconSource({
        shapes: `<motion.line animate={controls} variants={VARIANTS} x1="2" x2="8" y1="2" y2="2" />`,
      }),
      withLucide([["path", { d: "M2 2h6" }]])
    )
    expect(output).toContain('<motion.path d="M2 2h6" animate={controls}')
    expect(output).not.toContain("x1=")
  })

  it("leaves an icon alone when its parts don't line up with Lucide's", () => {
    const shapes = `<motion.path animate={controls} d="M2 2h10" variants={VARIANTS} />`
    for (const lucide of [
      [
        ["path", { d: "M2 2h4" }],
        ["path", { d: "M6 2h6" }],
      ],
      [["path", { d: "M12 12h10v10" }]],
    ] satisfies IconElement[][]) {
      expect(
        transformAnimatedIcon(iconSource({ shapes }), withLucide(lucide))
      ).toContain('d="M2 2h10"')
    }
  })

  it("swaps the whole drawing when the icon animates as one group", () => {
    const group = transformAnimatedIcon(
      iconSource({
        shapes: `<motion.g animate={controls} variants={VARIANTS}><path d="M2 2h10" /></motion.g>`,
      }),
      withLucide([
        ["path", { d: "M2 2.5h10" }],
        ["circle", { cx: "8", cy: "21", r: "1" }],
      ])
    )
    expect(group).toContain('<path d="M2 2.5h10" />')
    expect(group).toContain('<circle cx="8" cy="21" r="1" />')
    expect(group).not.toContain('"M2 2h10"')
    expect(group).toContain("<motion.g animate={controls}")

    const root = transformAnimatedIcon(
      iconSource({
        root: `<motion.svg animate={controls} fill="none" height={size} variants={VARIANTS} viewBox="0 0 24 24" width={size}>`,
        close: "</motion.svg>",
        shapes: `<path d="M2 2h10" /><path d="M4 4h1" />`,
      }),
      withLucide([["path", { d: "M2 2.5h10" }]])
    )
    expect(root).toContain('<path d="M2 2.5h10" />')
    expect(root).not.toContain('"M4 4h1"')
  })

  it("keeps a group that animates inside the one that holds everything", () => {
    const output = transformAnimatedIcon(
      iconSource({
        root: `<motion.svg fill="none" height={size} viewBox="0 0 24 24" width={size}>`,
        close: "</motion.svg>",
        shapes: `<path d="M2 2h10" /><motion.g animate={controls}><path d="M4 4h1" /></motion.g>`,
      }),
      withLucide([["path", { d: "M2 2.5h10" }]])
    )
    expect(output).toContain("<motion.g animate={controls}")
    expect(output).toContain('"M4 4h1"')
  })

  it("leaves shapes built at runtime alone", () => {
    const output = transformAnimatedIcon(
      iconSource({
        shapes: `{PATHS.map((d) => <motion.path animate={controls} d={d} key={d} />)}`,
      }),
      withLucide([["path", { d: "M2 2.5h10" }]])
    )
    expect(output).toContain("d={d}")
  })
})

describe("transformAnimatedIcon", () => {
  it("renders a real svg root in place of the wrapper div", () => {
    const output = transformAnimatedIcon(iconSource(), OPTIONS)
    expect(output).not.toContain("<div")
    expect(output).not.toContain("</svg>")
    expect(output).toContain('<AnimatedSvg name="house" {...props}')
    expect(output).toContain(
      "onMouseEnter={composeHandlers(handleMouseEnter, onMouseEnterProp)}"
    )
    expect(output).toContain('d="M1 1h2"')
  })

  it("stays a client module, with the directive first", () => {
    expect(transformAnimatedIcon(iconSource(), OPTIONS)).toMatch(
      /^(\/\/[^\n]*\n)*"use client"/
    )
  })

  it("takes the shared props and handle, not its own", () => {
    const output = transformAnimatedIcon(iconSource(), OPTIONS)
    expect(output).toContain(
      "forwardRef<AnimatedIconHandle, AnimatedIconProps>"
    )
    expect(output).not.toContain("HTMLAttributes")
    expect(output).not.toContain("HomeIconHandle")
    expect(output).not.toContain("size = 28")
    expect(output).not.toContain("@/lib/utils")
  })

  it("routes every animation through the shared hook", () => {
    const output = transformAnimatedIcon(iconSource(), OPTIONS)
    expect(output).toMatch(/import \{ motion \} from "motion\/react"/)
    expect(output).toMatch(
      /import \{[^}]*useAnimation[^}]*\} from "\.\.\/\.\.\/animated-icon\.js"/
    )
  })

  it("calls the consumer's hover handlers whether or not a ref controls it", () => {
    const output = transformAnimatedIcon(iconSource(), OPTIONS)
    expect(output).toContain("onMouseEnter: onMouseEnterProp")
    expect(output).toContain(
      "const { onMouseEnter, onMouseLeave } = NO_HANDLERS"
    )
  })

  it("types the hover events for an svg", () => {
    const output = transformAnimatedIcon(iconSource(), OPTIONS)
    expect(output).toContain("React.MouseEvent<SVGSVGElement>")
    expect(output).not.toContain("HTMLDivElement")
  })

  it("names the component after Lucide's current name", () => {
    const output = transformAnimatedIcon(iconSource(), OPTIONS)
    expect(output).toContain("const HouseIcon = forwardRef")
    expect(output).toContain('HouseIcon.displayName = "HouseIcon"')
    expect(output).toContain("export { HouseIcon }")
    expect(output).not.toContain("HomeIcon")
  })

  it("moves a whole-icon animation onto a group, so the hover box stays still", () => {
    const output = transformAnimatedIcon(
      iconSource({
        root: `<motion.svg
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          style={{ originX: "50%" }}
          transition={{ duration: 1 }}
          variants={VARIANTS}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >`,
        close: "</motion.svg>",
        shapes: `<path d="M1 1h2" />`,
      }),
      OPTIONS
    )
    expect(output).toContain('overflow="visible"')
    expect(output).toContain("<motion.g")
    expect(output).toContain("animate={controls}")
    expect(output).toContain("variants={VARIANTS}")
    expect(output).toContain('transformBox: "view-box"')
    expect(output).toContain('...({ originX: "50%" })')
    expect(output.indexOf("originX")).toBeLessThan(
      output.indexOf('transformBox: "view-box"')
    )
    expect(output).not.toContain("motion.svg")
    expect(output).not.toContain("viewBox=")
  })

  it("keeps shapes that overflow visible, however the icon asks for it", () => {
    for (const attribute of [
      'className="overflow-visible"',
      'style={{ overflow: "visible" }}',
      'overflow="visible"',
    ]) {
      const output = transformAnimatedIcon(
        iconSource({
          root: `<svg fill="none" height={size} ${attribute} viewBox="0 0 24 24" width={size}>`,
        }),
        OPTIONS
      )
      expect(output).toContain(' overflow="visible">')
    }
  })

  it("lets the size prop win over a size fixed in the source", () => {
    const output = transformAnimatedIcon(
      iconSource({
        root: `<svg fill="none" height="24" viewBox="0 0 24 24" width="28">`,
      }),
      OPTIONS
    )
    expect(output).not.toContain('height="24"')
    expect(output).not.toContain('width="28"')
  })

  it("swaps hover state for one that respects reduced motion", () => {
    const source = iconSource().replace(
      "forwardRef, useCallback, useImperativeHandle, useRef",
      "forwardRef, useCallback, useImperativeHandle, useRef, useState"
    )
    const output = transformAnimatedIcon(source, OPTIONS)
    expect(output).toContain("useHoverState as useState")
    expect(output).not.toMatch(/useRef, useState \} from "react"/)
  })

  it("refuses an icon drawn on another grid", () => {
    expect(() =>
      transformAnimatedIcon(
        iconSource({
          root: `<svg fill="none" height={size} stroke="currentColor" viewBox="0 0 512 512" width={size} xmlns="http://www.w3.org/2000/svg">`,
        }),
        OPTIONS
      )
    ).toThrow(AnimatedTransformError)
  })

  it("refuses an icon whose shapes read the size", () => {
    expect(() =>
      transformAnimatedIcon(
        iconSource({ shapes: `<motion.path d="M1 1h2" width={size} />` }),
        OPTIONS
      )
    ).toThrow(/size/)
  })
})

describe("the shipped set", () => {
  const icons = loadAnimatedIcons()

  it("takes Lucide's names, once each", () => {
    const outline = new Set(loadOutlineIcons().map((icon) => icon.name))
    expect(icons.filter(({ name }) => !outline.has(name))).toEqual([])
    expect(new Set(icons.map(({ name }) => name)).size).toBe(icons.length)
  })

  it("leaves out stroked redraws of brand logos", () => {
    const upstream = new Set(icons.map(({ upstreamName }) => upstreamName))
    for (const brand of ["github", "instagram", "youtube", "twitter"]) {
      expect(upstream.has(brand), brand).toBe(false)
    }
  })

  it("draws Lucide's geometry unless it's listed as an older drawing", () => {
    const house = icons.find(({ name }) => name === "house")
    expect(house?.isOlderDrawing).toBe(false)
    expect(icons.some(({ isOlderDrawing }) => isOlderDrawing)).toBe(true)
  })

  it("never ships a wrapper div or a fixed root size", () => {
    expect(
      icons
        .filter(({ source }) => /<div\b|<motion\.svg|size = 28/.test(source))
        .map(({ name }) => name)
    ).toEqual([])
  })
})

describe("the licence", () => {
  it("credits lucide-animated only where its code ships", () => {
    expect(licenseText({ animated: true })).toContain("pqoqubbw")
    expect(licenseText()).not.toContain("pqoqubbw")
  })
})
