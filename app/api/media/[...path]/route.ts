import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import {
  isInlineRenderable,
  isSafeKeySegments,
  keyToMediaUrl,
  lookupMimeByExtension,
  readBlobObject,
  resolveMediaPath,
  useBlobStorage,
} from "@/lib/media-storage"

export const runtime = "nodejs"

/**
 * Authenticated read path for chat attachments.
 *
 * These files used to sit in public/, which meant anyone holding a URL could
 * fetch them, forever, with no session. Now every read is checked: you must be
 * signed in, and you must be a party to the message the file was sent in (or
 * be the person who uploaded it, for files not yet sent).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPermission(session.role, "use_messages")) {
    return NextResponse.json({ error: "Your role does not allow message attachments." }, { status: 403 })
  }

  const { path: segments } = await context.params

  if (!isSafeKeySegments(segments)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const key = segments.join("/")
  if (!(await canAccess(session.id, key))) {
    // Deliberately 404, not 403 — a 403 would confirm the file exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const extension = key.split(".").pop() ?? ""
  const mimeType = lookupMimeByExtension(extension)
  const disposition = isInlineRenderable(mimeType) ? "inline" : "attachment"

  return useBlobStorage()
    ? serveFromBlob(key, mimeType, disposition)
    : serveFromDisk(segments, mimeType, disposition)
}

async function serveFromBlob(key: string, mimeType: string, disposition: string) {
  // get() with access:"private" is the only way to read this object — its
  // real URL was never handed to a client, so there's nothing to leak.
  const result = await readBlobObject(key).catch(() => null)
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Length": String(result.blob.size),
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": disposition,
  })

  return new NextResponse(result.stream, { status: 200, headers })
}

async function serveFromDisk(segments: string[], mimeType: string, disposition: string) {
  const absolutePath = resolveMediaPath(segments)
  if (!absolutePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let fileStat
  try {
    fileStat = await stat(absolutePath)
    if (!fileStat.isFile()) throw new Error("not a file")
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Length": String(fileStat.size),
    // Private: never let a shared cache hold someone else's attachment.
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    // Anything not safely renderable is downloaded rather than executed.
    "Content-Disposition": disposition,
  })

  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream

  return new NextResponse(stream, { status: 200, headers })
}

/**
 * The uploader always may. Otherwise the file must belong to a message that
 * this user sent or received.
 */
async function canAccess(userId: string, key: string) {
  const [scope, ownerId] = key.split("/")

  if (scope === "chat" && ownerId === userId) return true

  const message = await prisma.message.findFirst({
    where: {
      mediaUrl: keyToMediaUrl(key),
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { id: true },
  })

  return message !== null
}
