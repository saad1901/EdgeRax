/**
 * Normalises any user-pasted video URL into a form the player can use.
 *
 * Returns one of:
 *   { type: "iframe",  src: string }   — render as <iframe>
 *   { type: "video",   src: string }   — render as <video> (direct MP4/WebM/Ogg)
 *   { type: "open",    src: string }   — can't embed; show open-in-new-tab button
 *   { type: "local",   src: string }   — our own streaming route
 *   { type: "empty"                }   — no URL at all
 */
export type VideoSource =
  | { type: "iframe"; src: string }
  | { type: "video";  src: string }
  | { type: "open";   src: string; label: string }
  | { type: "local";  src: string }
  | { type: "empty" }

export function resolveVideoUrl(rawUrl: string, lessonId: string): VideoSource {
  const url = rawUrl?.trim() ?? ""

  if (!url) return { type: "empty" }

  // ── Private upload or proxy marker ──────────────────────────────────────────
  if (url.startsWith("local:") || url.startsWith("wasabi:") || url.startsWith("__proxy__")) {
    return { type: "local", src: `/api/video/${lessonId}` }
  }

  // ── YouTube ───────────────────────────────────────────────────────────────
  const ytId = (
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    url.match(/youtube\.com\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/)
  )?.[1]
  if (ytId) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`,
    }
  }

  // ── Vimeo ─────────────────────────────────────────────────────────────────
  if (/vimeo\.com/.test(url)) {
    const vimeoId = (
      url.match(/player\.vimeo\.com\/video\/(\d+)/) ||
      url.match(/vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/)
    )?.[1]
    if (vimeoId) {
      return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoId}?dnt=1` }
    }
  }

  // ── OneDrive Embed ────────────────────────────────────────────────────────
  if (/onedrive\.live\.com|1drv\.ms/.test(url)) {
    if (url.includes("/embed")) {
      return { type: "iframe", src: url }
    }
    const embedUrl = url
      .replace("onedrive.live.com/view.aspx", "onedrive.live.com/embed")
      .replace("onedrive.live.com/redir", "onedrive.live.com/embed")
    return { type: "iframe", src: embedUrl }
  }

  // ── Loom ──────────────────────────────────────────────────────────────────
  if (/loom\.com/.test(url)) {
    const loomId = url.match(/loom\.com\/(?:share|embed)\/([A-Za-z0-9]+)/)?.[1]
    if (loomId) {
      return { type: "iframe", src: `https://www.loom.com/embed/${loomId}?hide_owner=true&hide_share=true&hide_title=true` }
    }
  }

  // ── Dailymotion ───────────────────────────────────────────────────────────
  if (/dailymotion\.com/.test(url)) {
    const dmId = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([^_?#]+)/)?.[1]
    if (dmId) {
      return { type: "iframe", src: `https://www.dailymotion.com/embed/video/${dmId}` }
    }
  }

  // ── Streamable ────────────────────────────────────────────────────────────
  if (/streamable\.com/.test(url)) {
    const stId = url.match(/streamable\.com\/(?:e\/)?([A-Za-z0-9]+)/)?.[1]
    if (stId) {
      return { type: "iframe", src: `https://streamable.com/e/${stId}` }
    }
  }

  // ── Wistia ────────────────────────────────────────────────────────────────
  if (/wistia\.com|wistia\.net/.test(url)) {
    const wistiaId = url.match(/(?:wistia\.com\/medias?|wistia\.net\/medias?)\/([^/?#]+)/)?.[1]
    if (wistiaId) {
      return { type: "iframe", src: `https://fast.wistia.com/embed/iframe/${wistiaId}` }
    }
  }

  // ── All Direct Video Files & Drives (Google Drive, Dropbox, Direct MP4/WebM) ──
  // Proxy through our protected API endpoint so raw storage URLs are NEVER exposed to client DOM/inspect element
  if (/^https?:\/\//i.test(url) || /\.(mp4|webm|ogg|ogv|mov)([?#]|$)/i.test(url)) {
    return { type: "local", src: `/api/video/${lessonId}` }
  }

  return { type: "empty" }
}
