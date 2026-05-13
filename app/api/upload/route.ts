import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { getSession } from "@/lib/auth"

// 50MB max
const MAX_SIZE = 50 * 1024 * 1024

const MEDIA_TYPES: Record<string, string> = {
  // Images
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  // Video
  "video/mp4": "video",
  "video/webm": "video",
  "video/ogg": "video",
  "video/quicktime": "video",
  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/aac": "audio",
  "audio/webm": "audio",
  // Documents
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "text/plain": "document",
  "application/zip": "document",
  "application/x-zip-compressed": "document",
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 })

    const mediaType = MEDIA_TYPES[file.type]
    if (!mediaType) return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 })

    // Save to public/uploads/chat/<userId>/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "chat", session.id)
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split(".").pop() ?? "bin"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const fullPath = path.join(uploadDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)

    const url = `/uploads/chat/${session.id}/${filename}`

    return NextResponse.json({
      url,
      mediaType,
      mediaName: file.name,
      mediaSize: file.size,
    })
  } catch (err) {
    console.error("[Upload] Error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
