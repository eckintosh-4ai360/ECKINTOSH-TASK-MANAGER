"use client"

import { useState } from "react"
import { FileText, Music, Film, Download, File } from "lucide-react"

interface MediaBubbleProps {
  mediaUrl: string
  mediaType: string
  mediaName: string | null
  mediaSize: number | null
  isMine: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaBubble({ mediaUrl, mediaType, mediaName, mediaSize, isMine }: MediaBubbleProps) {
  const [lightbox, setLightbox] = useState(false)

  if (mediaType === "image") {
    return (
      <>
        <button onClick={() => setLightbox(true)} className="block rounded-xl overflow-hidden max-w-[260px] cursor-zoom-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl} alt={mediaName ?? "image"} className="w-full object-cover max-h-[220px] hover:brightness-90 transition-all" />
        </button>
        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setLightbox(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl} alt={mediaName ?? "image"} className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
          </div>
        )}
      </>
    )
  }

  if (mediaType === "video") {
    return (
      <video
        src={mediaUrl}
        controls
        className="rounded-xl max-w-[280px] max-h-[220px] bg-black"
        preload="metadata"
      />
    )
  }

  if (mediaType === "audio") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 min-w-[220px] ${isMine ? "bg-primary/20" : "bg-white/5"}`}>
        <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
          <Music className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-foreground">{mediaName ?? "Audio"}</p>
          {mediaSize && <p className="text-[10px] text-muted-foreground">{formatBytes(mediaSize)}</p>}
          <audio src={mediaUrl} controls className="w-full mt-1 h-7" />
        </div>
      </div>
    )
  }

  // Document
  const iconMap: Record<string, typeof FileText> = {
    pdf: FileText,
    doc: FileText,
    docx: FileText,
    zip: File,
    txt: FileText,
  }
  const ext = (mediaName ?? "").split(".").pop()?.toLowerCase() ?? ""
  const Icon = iconMap[ext] ?? File

  return (
    <a
      href={mediaUrl}
      download={mediaName ?? true}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 min-w-[200px] max-w-[260px] transition-colors group ${
        isMine ? "bg-primary/20 hover:bg-primary/30" : "bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{mediaName ?? "File"}</p>
        {mediaSize && <p className="text-[10px] text-muted-foreground">{formatBytes(mediaSize)}</p>}
      </div>
      <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
    </a>
  )
}
