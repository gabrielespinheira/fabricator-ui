// What a search field does with its text: when it offers the clear button and
// what a key press does. Shared by React web and React Native.

type SearchFieldState = {
  value: string
  isDisabled: boolean
  isReadOnly: boolean
}

/** The clear button shows only while there is text the person can edit. */
function canClearSearch({ value, isDisabled, isReadOnly }: SearchFieldState) {
  return value.length > 0 && !isDisabled && !isReadOnly
}

/**
 * Escape clears the text. On an empty field it does nothing, so the key
 * reaches what is around the field (a dialog closes, a toolbar collapses).
 */
function getSearchKeyAction(
  key: string,
  state: SearchFieldState
): "clear" | "none" {
  return key === "Escape" && canClearSearch(state) ? "clear" : "none"
}

export { canClearSearch, getSearchKeyAction, type SearchFieldState }
