import path from "node:path"

/**
 * Chat attachments are private. They live OUTSIDE public/ so Next never serves
 * them statically, and are read back through /api/media/[...path], which checks
 * the session and that the caller is a party to the message.
 *
 * Override with MEDIA_STORAGE_DIR on hosts with a mounted volume.
 */
export const MEDIA_ROOT = process.env.MEDIA_STORAGE_DIR
  ? path.resolve(process.env.MEDIA_STORAGE_DIR)
  : path.join(process.cwd(), "storage", "uploads")

export const MEDIA_URL_PREFIX = "/api/media"

/**
 * SVG is deliberately absent: the browser executes script inside an SVG served
 * as image/svg+xml, which would be stored XSS on our own origin.
 */
export const MEDIA_TYPES: Record<string, { kind: string; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/jpg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/gif": { kind: "image", ext: "gif" },
  "image/webp": { kind: "image", ext: "webp" },

  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/ogg": { kind: "video", ext: "ogv" },
  "video/quicktime": { kind: "video", ext: "mov" },

  "audio/mpeg": { kind: "audio", ext: "mp3" },
  "audio/mp3": { kind: "audio", ext: "mp3" },
  "audio/wav": { kind: "audio", ext: "wav" },
  "audio/ogg": { kind: "audio", ext: "oga" },
  "audio/aac": { kind: "audio", ext: "aac" },
  "audio/webm": { kind: "audio", ext: "weba" },

  "application/pdf": { kind: "document", ext: "pdf" },
  "application/msword": { kind: "document", ext: "doc" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { kind: "document", ext: "docx" },
  "application/vnd.ms-excel": { kind: "document", ext: "xls" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { kind: "document", ext: "xlsx" },
  "text/plain": { kind: "document", ext: "txt" },
  "application/zip": { kind: "document", ext: "zip" },
  "application/x-zip-compressed": { kind: "document", ext: "zip" },
}

/** Types safe to render inline. Everything else is forced to download. */
const INLINE_KINDS = new Set(["image", "video", "audio"])

export function isInlineRenderable(mimeType: string) {
  const entry = MEDIA_TYPES[mimeType]
  return entry ? INLINE_KINDS.has(entry.kind) : false
}

export function lookupMimeByExtension(ext: string) {
  const normalized = ext.replace(/^\./, "").toLowerCase()

  for (const [mime, entry] of Object.entries(MEDIA_TYPES)) {
    if (entry.ext === normalized) return mime
  }

  return "application/octet-stream"
}

/**
 * Resolves a stored-media URL to an absolute path, refusing anything that
 * escapes MEDIA_ROOT. Returns null when the segments are unsafe.
 */
export function resolveMediaPath(segments: string[]) {
  if (segments.length === 0) return null

  // Reject traversal, absolute paths, NUL bytes, and Windows drive prefixes
  // before they reach the filesystem.
  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") return null
    if (segment.includes("\0") || segment.includes("/") || segment.includes("\\")) return null
  }

  const resolved = path.resolve(MEDIA_ROOT, ...segments)
  const root = path.resolve(MEDIA_ROOT)

  // Belt and braces: confirm the resolved path really sits under the root.
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null

  return resolved
}

/** Storage key (`chat/<userId>/<file>`) for a media URL, or null if not ours. */
export function mediaUrlToKey(url: string) {
  if (!url.startsWith(`${MEDIA_URL_PREFIX}/`)) return null
  return url.slice(MEDIA_URL_PREFIX.length + 1)
}

export function keyToMediaUrl(key: string) {
  return `${MEDIA_URL_PREFIX}/${key}`
}
