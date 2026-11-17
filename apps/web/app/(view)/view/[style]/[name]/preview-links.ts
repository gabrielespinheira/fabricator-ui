/**
 * Previews are whole pages in a frame, and their links point at routes of
 * the app they'd live in (/messages, /sign-up). Following one would load a
 * page the site doesn't have, so a preview stays where it is. Links to a
 * spot on the same page, scripts and downloads still work.
 */
export function shouldKeepPreviewInPlace({
  href,
  download = false,
}: {
  href: string | null
  download?: boolean
}) {
  if (download || !href) return false
  if (href.startsWith("#")) return false
  if (/^javascript:/i.test(href)) return false
  return true
}

/**
 * A form's own submit reloads the frame or posts it elsewhere. Forms with a
 * function action carry React's `javascript:` action and must reach React
 * unprevented, or it skips the action.
 */
export function shouldKeepFormInPlace(action: string | null) {
  return !action || !/^javascript:/i.test(action)
}

/**
 * The guard as an inline script, so it holds from the first byte of the
 * page rather than from hydration: a click on a frame that's still loading
 * can't escape it either. Built from the two rules above, which have no
 * outside references and survive being written out as source.
 */
export function getPreviewGuardScript() {
  return `(function () {
  var keepLink = ${shouldKeepPreviewInPlace.toString()};
  var keepForm = ${shouldKeepFormInPlace.toString()};
  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) return;
    var link = event.target.closest("a[href]");
    if (!link) return;
    if (keepLink({ href: link.getAttribute("href"), download: link.hasAttribute("download") })) {
      event.preventDefault();
    }
  }, true);
  document.addEventListener("submit", function (event) {
    if (!(event.target instanceof HTMLFormElement)) return;
    if (keepForm(event.target.getAttribute("action"))) event.preventDefault();
  }, true);
})();`
}
