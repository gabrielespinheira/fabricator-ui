export type AvatarPart = {
  /** -1 slides back, 1 slides on, 0 stays. */
  shift: -1 | 0 | 1
  isLifted: boolean
}

/**
 * Where an avatar in a group goes while another is held: the active one lifts
 * where it stands, those before it slide back and those after it slide on, as
 * the website's group parts around the avatar under the pointer.
 */
export function getAvatarPart(
  index: number,
  activeIndex: number | null
): AvatarPart {
  if (activeIndex === null) return { shift: 0, isLifted: false }
  if (index === activeIndex) return { shift: 0, isLifted: true }
  return { shift: index < activeIndex ? -1 : 1, isLifted: false }
}
