// Where an accordion item sits among its neighbours: closed neighbours join
// into one card and square the corners they share; an open item parts from
// both. The website writes it onto each item as data attributes
// (use-accordion-shape), native animates its style from it.

type AccordionItemShape = {
  /** A gap above: the item is open, or follows an open one. */
  hasGap: boolean
  isTopRound: boolean
  isBottomRound: boolean
}

function getAccordionItemShape(
  items: readonly string[],
  open: readonly string[],
  value: string
): AccordionItemShape {
  const index = items.indexOf(value)
  if (index === -1)
    return { hasGap: false, isTopRound: true, isBottomRound: true }
  const isOpen = (at: number) => open.includes(items[at])
  const hasPrevious = index > 0
  const hasNext = index < items.length - 1
  if (isOpen(index)) {
    return { hasGap: hasPrevious, isTopRound: true, isBottomRound: true }
  }
  const isAfterOpen = hasPrevious && isOpen(index - 1)
  return {
    hasGap: isAfterOpen,
    isTopRound: !hasPrevious || isAfterOpen,
    isBottomRound: !hasNext || isOpen(index + 1),
  }
}

/**
 * The items' values from the top down, from where each one last laid out: the
 * order holds however the items are wrapped or mapped.
 */
function getAccordionItemOrder(positions: ReadonlyMap<string, number>) {
  return [...positions.entries()]
    .sort(([, a], [, b]) => a - b)
    .map(([value]) => value)
}

export { getAccordionItemOrder, getAccordionItemShape, type AccordionItemShape }
