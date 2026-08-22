// viewportGuard.js
//
// Works around a WebKit/iOS Safari quirk: if ANY element on the page ever
// renders wider than the viewport - even for a single frame, even if it's
// immediately clipped by overflow-x:hidden - Safari's WKWebView can get its
// layout viewport "stuck" at the wider size. Removing the offending content
// does NOT make Safari re-shrink the page back down on its own; the app is
// left looking zoomed-out inside a normal-sized screen until the user
// manually pinch-zooms it back, or reloads.
//
// This has already shown up from two unrelated causes in this app (the
// Google Map resizing after search results load, and a reminder time
// picker that briefly didn't fit its dialog on narrow screens) and is
// exactly the kind of thing that's easier to guard against broadly than to
// chase one overflow source at a time - the next one will come from some
// component nobody's thought of yet.
//
// The fix: rather than trying to detect the "stuck zoom" state directly
// (that's a rendering-engine internal - scrollWidth/clientWidth don't
// reliably expose it once the offending content is gone), we proactively
// force Safari to recompute its layout viewport any time the page's overall
// size changes at all, by briefly re-writing the <meta name="viewport">
// tag. Toggling that tag's content is a long-standing, widely-used
// workaround for getting WebKit to redo its viewport-fitting math - this is
// a real WebKit bug (webkit.org/b/170595), not something fixable from our
// CSS alone.
//
// Call installViewportGuard() once, at app startup (see main.jsx).

export function installViewportGuard() {
  if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
    return () => {};
  }

  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return () => {};

  const baseContent = meta.getAttribute("content");
  let nudgeTimer = null;

  function nudgeViewport() {
    // The browser only redoes its viewport math when it sees the attribute
    // actually change, so we append an extra directive, then remove it.
    meta.setAttribute("content", `${baseContent}, maximum-scale=1`);
    requestAnimationFrame(() => {
      meta.setAttribute("content", baseContent);
    });
  }

  function scheduleNudge() {
    clearTimeout(nudgeTimer);
    // Debounce so we nudge once layout has actually settled - dialog close
    // animations, the map resizing, the on-screen keyboard showing/hiding,
    // etc. - rather than mid-transition.
    nudgeTimer = setTimeout(nudgeViewport, 300);
  }

  const observer = new ResizeObserver(scheduleNudge);
  observer.observe(document.body);

  // Orientation changes and backgrounding/foregrounding the app can also
  // leave iOS's viewport in a stale state, independent of any element
  // resizing, so nudge on those too.
  window.addEventListener("orientationchange", scheduleNudge);
  const handleVisibility = () => {
    if (document.visibilityState === "visible") scheduleNudge();
  };
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    observer.disconnect();
    window.removeEventListener("orientationchange", scheduleNudge);
    document.removeEventListener("visibilitychange", handleVisibility);
    clearTimeout(nudgeTimer);
  };
}
