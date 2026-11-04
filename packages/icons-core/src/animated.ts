import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

import { getBounds } from "./geometry"
import { getExportNames } from "./names"
import { loadOutlineIcons } from "./outline"
import { withGeneratedHeader } from "./output"
import { ANIMATED_MAP, ANIMATED_SOURCES } from "./paths"
import { animatedMapSchema, readJson } from "./schemas"
import { ICON_TAGS, type IconElement, type IconTag } from "./types"

export class AnimatedTransformError extends Error {
  override name = "AnimatedTransformError"
}

type Edit = { start: number; end: number; text: string }

/** The root attributes every Fabricator icon already gets from `AnimatedSvg`. */
const ROOT_ATTRIBUTES = new Map([
  ["fill", ['"none"']],
  ["height", ["{size}", '"24"', '"28"']],
  ["stroke", ['"currentColor"']],
  ["strokeLinecap", ['"round"']],
  ["strokeLinejoin", ['"round"']],
  ["strokeWidth", ['"2"', "{2}"]],
  ["viewBox", ['"0 0 24 24"']],
  ["width", ["{size}", '"24"', '"28"']],
  ["xmlns", ['"http://www.w3.org/2000/svg"']],
])

const ALLOWED_MODULES = new Set(["motion/react", "react", "@/lib/utils"])
const SHARED_PROPS = new Set([
  "onMouseEnter",
  "onMouseLeave",
  "className",
  "size",
  "props",
])

function find<Found extends ts.Node>(
  root: ts.Node,
  isMatch: (node: ts.Node) => node is Found
): Found | undefined {
  if (isMatch(root)) return root
  return ts.forEachChild(root, (child) => find(child, isMatch))
}

function isTag(element: ts.JsxElement, ...names: string[]) {
  return names.includes(element.openingElement.tagName.getText())
}

function isForwardRef(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && node.expression.getText() === "forwardRef"
}

function isWrapperDiv(node: ts.Node): node is ts.JsxElement {
  return ts.isJsxElement(node) && isTag(node, "div")
}

/** Throws when anything but the wrapper and the root reads a prop the shell now owns. */
function refuseReads(body: ts.Node, skip: ts.Node[]) {
  const visit = (node: ts.Node) => {
    if (skip.includes(node)) return
    if (
      ts.isIdentifier(node) &&
      (node.text === "size" || node.text === "className")
    ) {
      const { parent } = node
      const isName =
        (ts.isJsxAttribute(parent) && parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isPropertyAccessExpression(parent) && parent.name === node)
      if (!isName)
        throw new AnimatedTransformError(`its shapes read the ${node.text}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(body)
}

function importEdit(
  statement: ts.ImportDeclaration,
  source: ts.SourceFile,
  uses: { animation: boolean; state: boolean }
): Edit {
  const module = ts.isStringLiteral(statement.moduleSpecifier)
    ? statement.moduleSpecifier.text
    : ""
  if (!ALLOWED_MODULES.has(module))
    throw new AnimatedTransformError(`it imports ${module}`)
  const range = { start: statement.getStart(source), end: statement.getEnd() }
  const named = statement.importClause?.namedBindings
  if (module === "@/lib/utils" || !named || !ts.isNamedImports(named))
    return { ...range, text: "" }
  const kept = named.elements.filter(({ name }) => {
    if (name.text === "HTMLAttributes") return false
    if (module === "motion/react" && name.text === "useAnimation") {
      uses.animation = true
      return false
    }
    if (module === "react" && name.text === "useState") {
      uses.state = true
      return false
    }
    return true
  })
  if (kept.length === 0) return { ...range, text: "" }
  const keyword = statement.importClause?.isTypeOnly ? "import type" : "import"
  const specifiers = kept.map((element) => element.getText(source)).join(", ")
  return { ...range, text: `${keyword} { ${specifiers} } from "${module}";` }
}

function attributeName(attribute: ts.JsxAttribute) {
  return attribute.name.getText()
}

function initializerText(attribute: ts.JsxAttribute) {
  return attribute.initializer?.getText() ?? ""
}

/** The three ways a source asks for shapes to overflow the icon's box. */
const OVERFLOW_VISIBLE = new Set([
  'className="overflow-visible"',
  'overflow="visible"',
  'style={{ overflow: "visible" }}',
])

/** The JSX of the new shell: a real `<svg>`, with hover on the box that never moves. */
function renderShell(wrapper: ts.JsxElement, name: string) {
  const root = wrapper.children.find(
    (child): child is ts.JsxElement =>
      ts.isJsxElement(child) && isTag(child, "svg", "motion.svg")
  )
  if (!root) throw new AnimatedTransformError("its div doesn't wrap an svg")

  const handlers = new Map<string, string>()
  const passed: string[] = []
  for (const property of wrapper.openingElement.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue
    const attribute = attributeName(property)
    if (attribute === "className") continue
    if (attribute === "onMouseEnter" || attribute === "onMouseLeave") {
      const expression = property.initializer
      if (expression && ts.isJsxExpression(expression) && expression.expression)
        handlers.set(attribute, expression.expression.getText())
      continue
    }
    passed.push(property.getText())
  }

  const groupAttributes: string[] = []
  let groupStyle: string | undefined
  let isOverflowVisible = false
  for (const property of root.openingElement.attributes.properties) {
    if (!ts.isJsxAttribute(property))
      throw new AnimatedTransformError("its svg spreads props")
    const attribute = attributeName(property)
    if (OVERFLOW_VISIBLE.has(property.getText())) {
      isOverflowVisible = true
      continue
    }
    const allowed = ROOT_ATTRIBUTES.get(attribute)
    if (allowed) {
      if (!allowed.includes(initializerText(property)))
        throw new AnimatedTransformError(
          `its svg sets ${attribute}=${initializerText(property)}`
        )
      continue
    }
    if (!isTag(root, "motion.svg"))
      throw new AnimatedTransformError(`its svg sets ${attribute}`)
    const expression = property.initializer
    if (
      attribute === "style" &&
      expression &&
      ts.isJsxExpression(expression) &&
      expression.expression
    ) {
      groupStyle = expression.expression.getText()
      continue
    }
    groupAttributes.push(property.getText())
  }

  const source = wrapper.getSourceFile().text
  const shapes = source.slice(root.openingElement.end, root.closingElement.pos)
  const handler = (attribute: string, prop: string) => {
    const own = handlers.get(attribute)
    return own
      ? `${attribute}={composeHandlers(${own}, ${prop})}`
      : `${attribute}={${prop}}`
  }
  const shell = [
    `name="${name}"`,
    "{...props}",
    ...passed,
    handler("onMouseEnter", "onMouseEnterProp"),
    handler("onMouseLeave", "onMouseLeaveProp"),
  ]
  if (!isTag(root, "motion.svg")) {
    const overflow = isOverflowVisible ? ' overflow="visible"' : ""
    return `<AnimatedSvg ${shell.join(" ")}${overflow}>${shapes}</AnimatedSvg>`
  }

  // The whole icon animates: a group moves inside a box that stays still, so
  // a turning icon can't slip out from under the pointer and end the hover.
  const style = groupStyle
    ? `{{ ...(${groupStyle}), transformBox: "view-box" }}`
    : `{{ transformBox: "view-box" }}`
  return `<AnimatedSvg ${shell.join(" ")} overflow="visible"><motion.g ${groupAttributes.join(" ")} style=${style}>${shapes}</motion.g></AnimatedSvg>`
}

const GEOMETRY_ATTRIBUTES = new Set([
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "width",
  "height",
  "points",
])

/** How far apart, on average, two shapes' edges may sit and still be the same part. */
const SAME_PART_DISTANCE = 3

function isIconTag(name: string): name is IconTag {
  return (ICON_TAGS as readonly string[]).includes(name)
}

type Part = {
  element: ts.JsxOpeningLikeElement
  closing?: ts.JsxClosingElement
  shape: IconElement
}

/** Geometry keys in a variant: `x` and `y` aren't here, Motion moves those with a transform. */
const ANIMATED_GEOMETRY = /\b(d|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height|points):/

/** Whether a part's animation writes its geometry, so it needs the shape it was made for. */
function animatesGeometry(part: Part, source: ts.SourceFile) {
  return part.element.attributes.properties.some((property) => {
    if (!ts.isJsxAttribute(property)) return false
    const name = attributeName(property)
    if (name !== "variants" && name !== "animate" && name !== "initial")
      return false
    const value = property.initializer
    if (!value || !ts.isJsxExpression(value) || !value.expression) return false
    const expression = value.expression
    if (!ts.isIdentifier(expression))
      return ANIMATED_GEOMETRY.test(expression.getText(source))
    const declared = find(
      source,
      (node): node is ts.VariableDeclaration =>
        ts.isVariableDeclaration(node) &&
        node.name.getText(source) === expression.text
    )
    return ANIMATED_GEOMETRY.test(declared?.getText(source) ?? "")
  })
}

/** Every shape in the icon, or nothing when any is built at runtime. */
function readParts(root: ts.JsxElement) {
  const parts: Part[] = []
  let isStatic = true
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) isStatic = false
    const element = ts.isJsxElement(node) ? node.openingElement : node
    if (
      ts.isJsxOpeningElement(element) ||
      ts.isJsxSelfClosingElement(element)
    ) {
      const tag = element.tagName.getText().replace("motion.", "")
      if (isIconTag(tag)) {
        const attributes: Record<string, string> = {}
        for (const property of element.attributes.properties) {
          if (!ts.isJsxAttribute(property)) continue
          const name = attributeName(property)
          if (!GEOMETRY_ATTRIBUTES.has(name)) continue
          const value = property.initializer
          if (value && ts.isStringLiteral(value)) attributes[name] = value.text
          else if (
            value &&
            ts.isJsxExpression(value) &&
            value.expression &&
            ts.isNumericLiteral(value.expression)
          )
            attributes[name] = value.expression.text
          else isStatic = false
        }
        parts.push({
          element,
          ...(ts.isJsxElement(node) && { closing: node.closingElement }),
          shape: [tag, attributes],
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  for (const child of root.children) visit(child)
  return isStatic ? parts : []
}

function distanceBetween(a: IconElement, b: IconElement) {
  const first = getBounds([a])
  const second = getBounds([b])
  return (
    (Math.abs(first.minX - second.minX) +
      Math.abs(first.minY - second.minY) +
      Math.abs(first.maxX - second.maxX) +
      Math.abs(first.maxY - second.maxY)) /
    4
  )
}

/** Pairs each part with the Lucide shape closest to it, nearest pairs first. */
function matchParts(parts: Part[], lucide: IconElement[]) {
  const pairs = parts
    .flatMap((part) =>
      lucide.map((shape) => ({
        part,
        shape,
        distance: distanceBetween(part.shape, shape),
      }))
    )
    .sort((a, b) => a.distance - b.distance)
  const matched = new Map<Part, IconElement>()
  const taken = new Set<IconElement>()
  for (const { part, shape, distance } of pairs) {
    if (matched.has(part) || taken.has(shape)) continue
    if (distance > SAME_PART_DISTANCE) return undefined
    matched.set(part, shape)
    taken.add(shape)
  }
  return matched
}

/** The one motion element holding every shape, when the icon animates as a whole. */
function findWholeIconGroup(root: ts.JsxElement) {
  const elements = root.children.filter(
    (child) => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)
  )
  const [only] = elements
  const group = isTag(root, "motion.svg")
    ? root
    : elements.length === 1 &&
        only &&
        ts.isJsxElement(only) &&
        isTag(only, "motion.g")
      ? only
      : undefined
  if (!group) return undefined
  const hasMotionInside = group.children.some((child) =>
    child.getText().includes("<motion.")
  )
  return hasMotionInside ? undefined : group
}

function toJsxName(name: string) {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/**
 * Upstream draws on whichever Lucide version each icon was made from. When an
 * icon has the same parts as the Lucide icon we ship, each part takes our
 * current shape and keeps its animation, and an icon that animates as one
 * group takes the whole drawing, so an animated icon at rest draws what the
 * outline icon draws. Other icons, and parts whose animation writes their
 * geometry, stay as upstream drew them.
 */
function syncGeometry(input: string, lucide: IconElement[]) {
  const source = ts.createSourceFile(
    "icon.tsx",
    input,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const wrapper = find(source, isWrapperDiv)
  const root = wrapper?.children.find(
    (child): child is ts.JsxElement =>
      ts.isJsxElement(child) && isTag(child, "svg", "motion.svg")
  )
  if (!root) return input
  const parts = readParts(root)
  if (parts.length === 0) return input
  const group = findWholeIconGroup(root)
  if (group) {
    const drawing = lucide
      .map(([tag, attributes]) => {
        const printed = Object.entries(attributes)
          .map(([name, value]) => `${toJsxName(name)}="${value}"`)
          .join(" ")
        return `<${tag} ${printed} />`
      })
      .join("")
    return (
      input.slice(0, group.openingElement.end) +
      drawing +
      input.slice(group.closingElement.pos)
    )
  }
  if (parts.length !== lucide.length) return input
  const matched = matchParts(parts, lucide)
  if (!matched) return input

  const edits: Edit[] = []
  for (const [part, [tag, attributes]] of matched) {
    const [ownTag, own] = part.shape
    const isSame =
      ownTag === tag &&
      [...GEOMETRY_ATTRIBUTES].every((name) => own[name] === attributes[name])
    if (isSame || animatesGeometry(part, source)) continue
    const replaced = new Set(Object.keys(attributes).map(toJsxName))
    for (const property of part.element.attributes.properties) {
      if (!ts.isJsxAttribute(property)) continue
      const name = attributeName(property)
      if (GEOMETRY_ATTRIBUTES.has(name) || replaced.has(name)) {
        edits.push({
          start: property.getFullStart(),
          end: property.getEnd(),
          text: "",
        })
      }
    }
    const isMotion = part.element.tagName.getText().startsWith("motion.")
    const tagName = `${isMotion ? "motion." : ""}${tag}`
    const printed = Object.entries(attributes)
      .map(([name, value]) => `${toJsxName(name)}="${value}"`)
      .join(" ")
    edits.push({
      start: part.element.tagName.getStart(source),
      end: part.element.tagName.getEnd(),
      text: `${tagName} ${printed}`,
    })
    if (part.closing) {
      edits.push({
        start: part.closing.tagName.getStart(source),
        end: part.closing.tagName.getEnd(),
        text: tagName,
      })
    }
  }
  let output = input
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, start) + text + output.slice(end)
  }
  return output
}

/**
 * Rewrites one vendored lucide-animated icon for this package, leaving its
 * animation logic alone: the wrapper `<div>` becomes a real `<svg>` with
 * Lucide's attributes, props and handle types become the shared ones, and
 * `useAnimation` comes from `animated-icon`, where reduced motion is honoured.
 */
export function transformAnimatedIcon(
  upstream: string,
  {
    name,
    upstreamName,
    lucide,
  }: { name: string; upstreamName: string; lucide?: IconElement[] }
) {
  const input = lucide ? syncGeometry(upstream, lucide) : upstream
  const source = ts.createSourceFile(
    `${upstreamName}.tsx`,
    input,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const call = find(source, isForwardRef)
  const component = call?.arguments[0]
  if (
    !call ||
    !component ||
    !(ts.isArrowFunction(component) || ts.isFunctionExpression(component)) ||
    !ts.isBlock(component.body) ||
    !call.typeArguments?.length
  )
    throw new AnimatedTransformError("it isn't a forwardRef component")
  const declaration = call.parent
  if (!ts.isVariableDeclaration(declaration))
    throw new AnimatedTransformError("its forwardRef isn't assigned")
  const upstreamComponent = declaration.name.getText()

  const props = component.parameters[0]?.name
  if (!props || !ts.isObjectBindingPattern(props))
    throw new AnimatedTransformError("its props aren't destructured")
  for (const element of props.elements) {
    if (!SHARED_PROPS.has(element.name.getText()))
      throw new AnimatedTransformError(
        `it reads the ${element.name.getText()} prop`
      )
  }

  const wrapper = find(component.body, isWrapperDiv)
  if (!wrapper) throw new AnimatedTransformError("it has no wrapper div")
  const root = wrapper.children.find(
    (child): child is ts.JsxElement =>
      ts.isJsxElement(child) && isTag(child, "svg", "motion.svg")
  )
  refuseReads(component.body, [
    wrapper.openingElement,
    ...(root ? [root.openingElement] : []),
  ])

  const uses = { animation: false, state: false }
  const edits: Edit[] = []
  let lastImportEnd = 0
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      edits.push(importEdit(statement, source, uses))
      lastImportEnd = statement.getEnd()
    }
    if (
      ts.isInterfaceDeclaration(statement) &&
      /HTMLAttributes|startAnimation/.test(statement.getText(source))
    ) {
      edits.push({
        start: statement.getStart(source),
        end: statement.getEnd(),
        text: "",
      })
    }
  }
  const shared = [
    "AnimatedSvg",
    "composeHandlers",
    "NO_HANDLERS",
    "type AnimatedIconHandle",
    "type AnimatedIconProps",
    ...(uses.animation ? ["useAnimation"] : []),
    ...(uses.state ? ["useHoverState as useState"] : []),
  ]
  edits.push({
    start: lastImportEnd,
    end: lastImportEnd,
    text: `\nimport { ${shared.join(", ")} } from "../../animated-icon.js";`,
  })

  const typeArguments = call.typeArguments
  edits.push({
    start: typeArguments.pos,
    end: typeArguments.end,
    text: "AnimatedIconHandle, AnimatedIconProps",
  })
  edits.push({
    start: props.getStart(source),
    end: props.getEnd(),
    text: "{ onMouseEnter: onMouseEnterProp, onMouseLeave: onMouseLeaveProp, ...props }",
  })
  const bodyStart = component.body.getStart(source) + 1
  edits.push({
    start: bodyStart,
    end: bodyStart,
    text: "\n    const { onMouseEnter, onMouseLeave } = NO_HANDLERS;",
  })
  edits.push({
    start: wrapper.getStart(source),
    end: wrapper.getEnd(),
    text: renderShell(wrapper, name),
  })

  let output = input
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, start) + text + output.slice(end)
  }
  const [componentName] = getExportNames(name)
  return withGeneratedHeader(
    output
      .replaceAll("HTMLDivElement", "SVGSVGElement")
      .replace(
        new RegExp(`\\b${upstreamComponent}\\b`, "g"),
        componentName ?? upstreamComponent
      )
  )
}

export type AnimatedIcon = {
  /** Lucide's current name, which the export and the file take. */
  name: string
  upstreamName: string
  source: string
  /** It animates an older Lucide drawing, so at rest it differs from the outline icon. */
  isOlderDrawing: boolean
}

/** The upstream icons that ship, resolved to Lucide's names and rewritten. */
export function loadAnimatedIcons(outline = loadOutlineIcons()) {
  const { renames, excluded, olderDrawings } = readJson(
    ANIMATED_MAP,
    animatedMapSchema
  )
  const nodes = new Map(outline.map((icon) => [icon.name, icon.node]))
  const aliases = new Map(
    outline.flatMap((icon) =>
      icon.aliases.map((alias) => [alias.name, icon.name] as const)
    )
  )
  const icons = new Map<string, AnimatedIcon>()
  for (const file of fs.readdirSync(ANIMATED_SOURCES).sort()) {
    if (!file.endsWith(".tsx")) continue
    const upstreamName = file.slice(0, -".tsx".length)
    if (excluded[upstreamName]) continue
    const name =
      renames[upstreamName] ??
      (nodes.has(upstreamName) ? upstreamName : aliases.get(upstreamName))
    const lucide = name ? nodes.get(name) : undefined
    if (!name || !lucide) {
      throw new AnimatedTransformError(
        `${upstreamName} isn't a Lucide icon: rename or exclude it in sources/animated.json`
      )
    }
    const existing = icons.get(name)
    if (existing) {
      throw new AnimatedTransformError(
        `${upstreamName} and ${existing.upstreamName} are both ${name}: exclude one in sources/animated.json`
      )
    }
    icons.set(name, {
      name,
      upstreamName,
      source: transformAnimatedIcon(
        fs.readFileSync(path.join(ANIMATED_SOURCES, file), "utf8"),
        { name, upstreamName, lucide }
      ),
      isOlderDrawing: olderDrawings.includes(name),
    })
  }
  const stale = olderDrawings.filter((name) => !icons.has(name))
  if (stale.length > 0) {
    throw new AnimatedTransformError(
      `olderDrawings lists icons that don't ship: ${stale.join(", ")}`
    )
  }
  return [...icons.values()].sort((a, b) => a.name.localeCompare(b.name))
}
