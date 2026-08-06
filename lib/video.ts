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

  // ── Private upload streamed through our API ───────────────────────────────
  if (url.startsWith("local:") || url.startsWith("wasabi:")) {
    return { type: "local", src: `/api/video/${lessonId}` }
  }

  // ── Proxy fallback (no CDN configured) ────────────────────────────────────
  if (url.startsWith("__proxy__")) {
    const id = url.slice("__proxy__".length)
    return { type: "local", src: `/api/video/${id}` }
  }

  // ── Direct CDN or external video URL (https://...) ────────────────────────
  // When CDN is configured, the API resolves private videos to a direct CDN
  // URL before sending to the client — treat it as a direct video source.
  if (/^https?:\/\//i.test(url) && /\.(mp4|webm|ogg|ogv|mov)([?#]|$)/i.test(url)) {
    return { type: "video", src: url }
  }

  if (!url) return { type: "empty" }

  // ── YouTube ───────────────────────────────────────────────────────────────
  // Handles: watch?v=, youtu.be/, /shorts/, /live/, /embed/ (already correct)
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
  // Handles: vimeo.com/ID, player.vimeo.com/video/ID, vimeo.com/channels/*/ID
  if (/vimeo\.com/.test(url)) {
    const vimeoId = (
      url.match(/player\.vimeo\.com\/video\/(\d+)/) ||
      url.match(/vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/)
    )?.[1]
    if (vimeoId) {
      return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoId}?dnt=1` }
    }
  }

  // ── Google Drive ──────────────────────────────────────────────────────────
  // Share link:  drive.google.com/file/d/FILE_ID/view
  // Open link:   drive.google.com/open?id=FILE_ID
  // We use the direct download/stream URL so we can use a <video> tag
  // instead of an iframe — this gives proper mobile scaling with no Drive UI chrome
  if (/drive\.google\.com/.test(url)) {
    const driveId = (
      url.match(/\/file\/d\/([^/?#]+)/) ||
      url.match(/[?&]id=([^&]+)/)
    )?.[1]
    if (driveId) {
      // uc?export=download streams the raw file — works as a <video> src
      // confirm=t bypasses the "large file" warning redirect
      return {
        type: "video",
        src: `https://drive.google.com/uc?export=download&confirm=t&id=${driveId}`,
      }
    }
  }

  // ── Dropbox ───────────────────────────────────────────────────────────────
  // Regular share links end in ?dl=0 — swap to dl=1 for direct stream
  // Dropbox blocks iframe embedding, so we serve a direct video tag instead
  if (/dropbox\.com/.test(url)) {
    const directUrl = url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/[?&]dl=\d/, "")
    return { type: "video", src: directUrl }
  }

  // ── OneDrive ──────────────────────────────────────────────────────────────
  // OneDrive embed: onedrive.live.com/embed?...  or 1drv.ms short links
  if (/onedrive\.live\.com|1drv\.ms/.test(url)) {
    // If it's already an embed URL pass through
    if (url.includes("/embed")) {
      return { type: "iframe", src: url }
    }
    // Regular share link — convert to embed
    const embedUrl = url
      .replace("onedrive.live.com/view.aspx", "onedrive.live.com/embed")
      .replace("onedrive.live.com/redir", "onedrive.live.com/embed")
    return { type: "iframe", src: embedUrl }
  }

  // ── Loom ──────────────────────────────────────────────────────────────────
  // loom.com/share/ID  →  loom.com/embed/ID
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

  // ── Direct video file (MP4, WebM, Ogg, MOV) ──────────────────────────────
  // Matches URLs ending in a video extension, optionally followed by query/hash
  if (/\.(mp4|webm|ogg|ogv|mov)([?#]|$)/i.test(url)) {
    return { type: "video", src: url }
  }

  // ── CDN URLs without extension (e.g. Bunny CDN) ───────────────────────────
  // If it's an https URL from a known CDN pattern or just has no extension,
  // try as a direct video source first
  if (/b-cdn\.net|bunnycdn|cdn\./i.test(url) && /^https:\/\//i.test(url)) {
    return { type: "video", src: url }
  }

  // ── Google Drive — catch remaining drive.google.com patterns ─────────────
  // Some share links don't match /file/d/ — convert to preview embed
  if (/drive\.google\.com/.test(url)) {
    return { type: "iframe", src: url }
  }

  // ── Generic https URL — try as iframe first ───────────────────────────────
  // Most video hosting platforms support embedding. If the iframe refuses
  // (X-Frame-Options), the VideoArea component shows an open-in-new-tab fallback.
  if (/^https?:\/\//i.test(url)) {
    return { type: "iframe", src: url }
  }

  return { type: "empty" }
}
