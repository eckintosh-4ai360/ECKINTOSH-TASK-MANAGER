import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { put } from "@vercel/blob"
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

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${entry.ext}`
    const key = `chat/${session.id}/${filename}`

    let url: string

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob cloud object storage
      const blob = await put(key, file, {
        access: "public",
        addRandomSuffix: false,
      })
      url = blob.url
    } else {
      // Local storage fallback for offline / development environments
      const uploadDir = path.join(MEDIA_ROOT, `chat/${session.id}`)
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))
      url = keyToMediaUrl(key)
    }

    return NextResponse.json({
      url,
      mediaType: entry.kind,
      mediaName: file.name,
      mediaSize: file.size,
    })
  } catch (err) {
    console.error("[Upload] Error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
