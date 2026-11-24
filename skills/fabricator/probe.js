// Run in the page being judged (see refine.md). Reads layout, changes nothing,
// and returns the facts a screenshot hides as JSON.
;(() => {
  const box = (element) => element.getBoundingClientRect()
  const seen = (element) =>
    box(element).width > 2 &&
    box(element).height > 2 &&
    getComputedStyle(element).visibility !== "hidden" &&
    !element.closest("[inert], [aria-hidden=true], .sr-only")
  const name = (element) =>
    (
      element.getAttribute("aria-label") ||
      element.textContent ||
      element.placeholder ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 48)
  const all = (selector) =>
    [...document.querySelectorAll(selector)].filter(seen)
  const centre = (element) => [
    box(element).left + box(element).width / 2,
    box(element).top + box(element).height / 2,
  ]
  const scroller = (element) => {
    for (let node = element.parentElement; node; node = node.parentElement)
      if (/auto|scroll/.test(getComputedStyle(node).overflowY)) return node
    return document.documentElement
  }
  const inView = (element) => {
    const [x, y] = centre(element)
    const { left, top, right, bottom } = box(scroller(element))
    return (
      x > Math.max(left, 0) &&
      x < Math.min(right, innerWidth) &&
      y > Math.max(top, 0) &&
      y < Math.min(bottom, innerHeight)
    )
  }
  const hits = (element, x, y) => {
    const top = document.elementFromPoint(x, y)
    return (
      !top ||
      element.contains(top) ||
      top.contains(element) ||
      (!!element.labels?.length &&
        [...element.labels].some((label) => label.contains(top)))
    )
  }
  const controls = all(
    "button, a[href], input, textarea, [role=switch], [role=checkbox], [role=tab]"
  ).filter(inView)
  const leaves = all("main *").filter(
    (element) =>
      element.children.length === 0 &&
      element.scrollWidth > element.clientWidth + 1 &&
      getComputedStyle(element).overflowX !== "visible"
  )
  const isShortened = (element) =>
    getComputedStyle(element).textOverflow === "ellipsis"
  const covered = controls.filter(
    (element) => !hits(element, ...centre(element))
  )
  // Text contrast against the composited background. Gradients, pictures and
  // anything disabled are skipped, so a listed value is real.
  const canvas = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true })
  const rgba = (color) => {
    canvas.clearRect(0, 0, 1, 1)
    canvas.fillStyle = color
    canvas.fillRect(0, 0, 1, 1)
    const [r, g, b, alpha] = canvas.getImageData(0, 0, 1, 1).data
    return [r, g, b, alpha / 255]
  }
  const over = ([r, g, b, alpha], [R, G, B]) => [
    r * alpha + R * (1 - alpha),
    g * alpha + G * (1 - alpha),
    b * alpha + B * (1 - alpha),
    1,
  ]
  const ancestors = (element) =>
    element ? [...ancestors(element.parentElement), element] : []
  const backdrop = (element) =>
    ancestors(element).reduce(
      (under, node) => {
        const { backgroundColor, backgroundImage } = getComputedStyle(node)
        if (!under || backgroundImage !== "none") return undefined
        return over(rgba(backgroundColor), under)
      },
      [255, 255, 255, 1]
    )
  const luminance = ([r, g, b]) =>
    [r, g, b]
      .map((value) => value / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      )
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0
      )
  const contrast = (element) => {
    const under = backdrop(element)
    if (!under) return 21
    const [light, dark] = [
      luminance(over(rgba(getComputedStyle(element).color), under)),
      luminance(under),
    ].sort((one, other) => other - one)
    return (light + 0.05) / (dark + 0.05)
  }
  const isLarge = ({ fontSize, fontWeight }) =>
    parseFloat(fontSize) >= 24 ||
    (parseFloat(fontSize) >= 18.66 && Number(fontWeight) >= 700)
  const faint = all("body *")
    .filter((element) =>
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      )
    )
    .filter(
      (element) =>
        inView(element) &&
        !element.closest(":disabled, [aria-disabled=true], [data-disabled]") &&
        ancestors(element).every(
          (node) => getComputedStyle(node).opacity === "1"
        )
    )
    .map((element) => ({ element, ratio: contrast(element) }))
    .filter(
      ({ element, ratio }) =>
        ratio < (isLarge(getComputedStyle(element)) ? 3 : 4.5) - 0.01
    )
    .map(({ element, ratio }) => `${ratio.toFixed(2)} ${name(element)}`)

  // Where the first visible thing of each band of the page starts. Bands that
  // share an edge read as one page; a stray value is a misalignment.
  const startOf = (band) => {
    if (band.matches("[data-slot=card], [data-slot=alert]"))
      return Math.round(box(band).left)
    const walker = document.createTreeWalker(
      band,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    )
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const isText = node.nodeType === Node.TEXT_NODE
      if (
        isText
          ? !node.textContent.trim()
          : !node.matches(
              "button, input, svg, img, [role=checkbox], [role=tablist], [data-slot=card]"
            )
      )
        continue
      if (!seen(isText ? node.parentElement : node)) continue
      const range = document.createRange()
      range.selectNode(node)
      return Math.round(range.getBoundingClientRect().left)
    }
  }
  const page =
    document.querySelector("main [data-slot=app-shell-content] > *") ??
    document.querySelector("main > *, main")
  const isBeside = (band, other) =>
    box(other).left < box(band).left &&
    box(other).top < box(band).bottom - 2 &&
    box(other).bottom > box(band).top + 2
  const bands = [...(page?.children ?? [])]
    .flatMap((band) => (band.children.length > 1 ? [...band.children] : [band]))
    .filter(seen)
    .filter((band, _, every) => !every.some((other) => isBeside(band, other)))
    .map((band, index, every) => {
      const gap = index === 0 ? 0 : box(band).top - box(every[index - 1]).bottom
      return `starts ${startOf(band)}, gap ${Math.round(gap)}: ${name(band).slice(0, 28)}`
    })
  // The App Shell lays out by direct children and order, and fails silently.
  const slot = (value, root = document) => [
    ...root.querySelectorAll(`[data-slot=${value}]`),
  ]
  const shellProblems = () => {
    const shells = slot("app-shell")
    if (shells.length === 0) return undefined
    const [body] = slot("sidebar-wrapper", shells[0])
    const [main] = document.querySelectorAll("[data-app-shell-main]")
    const [content] = slot("app-shell-content")
    const [panelTrigger] = slot("app-shell-panel-trigger")
    const isAfter = (element, other) =>
      !!(
        element.compareDocumentPosition(other) &
        Node.DOCUMENT_POSITION_PRECEDING
      )
    const rightEdge = box(body).right
    return [
      [shells.length > 1, "a shell inside a shell"],
      [
        slot("sidebar-wrapper").length > shells.length,
        "a SidebarProvider inside AppShell",
      ],
      [
        slot("sidebar").some(
          (element) =>
            element.parentElement !== body && !element.closest("[role=dialog]")
        ),
        "Sidebar is not a direct child of AppShell",
      ],
      [
        slot("sidebar").some(
          (element) =>
            main &&
            element.parentElement === body &&
            !element.closest("[role=dialog]") &&
            element.dataset.side !== "right" &&
            isAfter(element, main)
        ),
        "Sidebar comes after AppShellMain",
      ],
      [!main, "no AppShellMain"],
      [
        main && main.parentElement !== body,
        "AppShellMain is not a direct child of AppShell",
      ],
      [
        document.querySelectorAll("[data-app-shell-main]").length >
          shells.length,
        "more than one AppShellMain",
      ],
      [
        slot("app-shell-panel").some(
          (element) => element.parentElement !== body
        ),
        "AppShellPanel is not a direct child of AppShell",
      ],
      [
        slot("app-shell-panel").some(
          (element) =>
            main && (element.dataset.side === "left") === isAfter(element, main)
        ),
        "a panel sits on the wrong side of AppShellMain for its side",
      ],
      [
        slot("app-shell-status-bar").some(
          (element) => element.parentElement !== body
        ),
        "AppShellStatusBar is not a direct child of AppShell",
      ],
      [
        slot("app-shell-bottom-nav").some(
          (element) => !element.parentElement.matches("[data-app-shell-main]")
        ),
        "the bottom nav is not inside AppShellMain",
      ],
      [
        slot("app-shell-content").length > shells.length,
        "more than one AppShellContent",
      ],
      [
        content && !content.parentElement.matches("[data-app-shell-main]"),
        "AppShellContent is not a direct child of AppShellMain",
      ],
      [
        slot("app-shell-header").some((element) =>
          element.closest("[data-slot=app-shell-content]")
        ),
        "AppShellHeader is inside AppShellContent",
      ],
      [
        main && main.scrollHeight > main.clientHeight + 1,
        "AppShellMain is cut off: something above AppShellContent lost its height",
      ],
      [
        content && content.scrollWidth > content.clientWidth + 1,
        "AppShellContent scrolls sideways",
      ],
      [!slot("app-shell-page-title").length, "no AppShellPageTitle"],
      [
        slot("app-shell-page-title").some(
          (element) => !element.getClientRects().length
        ),
        "AppShellPageTitle is hidden, so the header shows its text as the page's",
      ],
      [
        slot("app-shell-page-title").length > shells.length,
        "more than one AppShellPageTitle",
      ],
      [
        panelTrigger &&
          (box(panelTrigger).right > rightEdge + 1 ||
            box(panelTrigger).left < 0),
        "a panel trigger is off screen: its panel is missing or misplaced",
      ],
      [
        slot("app-shell-panel-trigger-anchor").some(
          (element) =>
            element.dataset.pinned !== undefined &&
            element.dataset.state === "open" &&
            slot("app-shell-panel").every(
              (panel) =>
                box(element).left < box(panel).left ||
                box(element).right > box(panel).right + 1
            )
        ),
        "a right panel's trigger is not last in its row, so it doesn't line up with the open panel",
      ],
      [
        slot("app-shell-panel").some((element) =>
          slot("app-shell-panel").some(
            (other) =>
              other !== element &&
              [element, other].every(
                ({ dataset }) =>
                  dataset.placement === "inline" && dataset.state === "open"
              ) &&
              other.dataset.side === element.dataset.side
          )
        ),
        "two panels are open on one side",
      ],
      [
        slot("app-shell-panel-tabs").some((list) =>
          [...list.querySelectorAll("[role=tab]")].some(
            (tab) =>
              tab.getClientRects().length &&
              ![...tab.querySelectorAll("svg, span")].some(
                (part) => box(part).width > 1 && box(part).height > 1
              )
          )
        ),
        "a panel's tabs are blank: give each view an icon",
      ],
      [
        slot("sidebar-menu-button").some(
          (element) =>
            element.closest("[data-slot=app-nav-item]") &&
            !element.querySelector("span, svg")
        ),
        "AppNav rows lost their icon and badge: pass renderLink without children",
      ],
      [
        document.documentElement.scrollHeight > innerHeight + 1,
        "the document scrolls behind the shell",
      ],
    ]
      .filter(([isProblem]) => isProblem)
      .map(([, problem]) => problem)
  }

  return JSON.stringify(
    {
      width: innerWidth,
      shellProblems: shellProblems(),
      sidewaysScroll: document.documentElement.scrollWidth > innerWidth + 1,
      sidewaysRegions: all("main *")
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 4 &&
            /auto|scroll/.test(getComputedStyle(element).overflowX)
        )
        .map(
          (element) =>
            `${element.dataset.slot ?? element.tagName} ${element.scrollWidth} in ${element.clientWidth}`
        )
        .slice(0, 4),
      textFields: all(
        "input:not([type=checkbox], [type=radio], [type=hidden], [type=file], [type=range], [type=search], [readonly]), textarea"
      ).map(
        (element) =>
          name(element.labels?.[0] ?? element) || element.value || "unnamed"
      ),
      filledButtons: all("main button, main a, [role=dialog] button")
        .filter((element) => /(^|\s)bg-primary(\s|$)/.test(element.className))
        .map(name),
      cutOff: leaves
        .filter((element) => !isShortened(element))
        .map(name)
        .slice(0, 8),
      shortened: leaves.filter(isShortened).map(name).slice(0, 8),
      covered: covered.map(name).slice(0, 8),
      smallForTouch: matchMedia("(pointer: coarse)").matches
        ? controls
            .filter(
              (element) =>
                !covered.includes(element) &&
                getComputedStyle(element).display !== "inline"
            )
            .filter((element) => {
              const [x, y] = centre(element)
              return !hits(element, x, y - 15) && !hits(element, x, y + 15)
            })
            .map(name)
            .slice(0, 8)
        : undefined,
      unnamed: controls
        .filter(
          (element) =>
            !name(element) &&
            !element.getAttribute("aria-labelledby") &&
            !element.labels?.length
        )
        .map(
          (element) =>
            `${element.tagName.toLowerCase()} ${element.dataset.slot ?? ""} "${element.value ?? ""}" at ${Math.round(box(element).left)},${Math.round(box(element).top)}`
        )
        .slice(0, 8),
      faintText: faint.slice(0, 10),
      bands: bands.slice(0, 14),
      headings: all("h1, h2, h3")
        .map((element) => `${element.tagName} ${name(element)}`)
        .slice(0, 12),
    },
    null,
    1
  )
})()
