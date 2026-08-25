import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { MEDIA_ROOT, MEDIA_TYPES, keyToMediaUrl } from "@/lib/media-storage"

export const runtime = "nodejs"

// 50MB max
const MAX_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasPermission(session.role, "use_messages")) {
      return NextResponse.json({ error: "Your role does not allow message uploads." }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 })

    const entry = MEDIA_TYPES[file.type]
    if (!entry) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 })
    }

    // Store under a private root, never public/. The extension comes from our
    // own allowlist rather than the client-supplied filename, so a
    // "report.pdf.html" upload cannot pick its own content type on the way out.
    const key = `chat/${session.id}`
    const uploadDir = path.join(MEDIA_ROOT, key)
    await mkdir(uploadDir, { recursive: true })

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${entry.ext}`
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({
      url: keyToMediaUrl(`${key}/${filename}`),
      mediaType: entry.kind,
      mediaName: file.name,
      mediaSize: file.size,
    })
  } catch (err) {
    console.error("[Upload] Error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
