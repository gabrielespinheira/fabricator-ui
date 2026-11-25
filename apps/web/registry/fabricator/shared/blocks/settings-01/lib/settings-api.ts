// Stands in for your server. A save takes a moment, and fails while the
// browser is offline or the page was opened with ?save=fail, so the failure
// can be looked at.

const SAVE_TIME = 450

function getRefusal() {
  if (!navigator.onLine) return "You are offline."
  return new URLSearchParams(window.location.search).get("save") === "fail"
    ? "The server didn't answer."
    : null
}

export async function saveSetting() {
  await new Promise((resolve) => setTimeout(resolve, SAVE_TIME))
  const refusal = getRefusal()
  if (refusal) throw new Error(refusal)
}
