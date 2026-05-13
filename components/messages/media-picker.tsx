"use client"

import { useRef, useState } from "react"
import { Paperclip, Image, Film, Music, FileText, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaPickerProps {
  onSend: (file: File) => Promise<void>
  isSending: boolean
}

const ACCEPT = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"

export function MediaPicker({ onSend, isSending }: MediaPickerProps) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<{ file: File; url: string; type: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function pickFile(accept: string) {
    if (!fileRef.current) return
    fileRef.current.accept = accept
    fileRef.current.click()
    setOpen(false)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const type = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video"
      : file.type.startsWith("audio/") ? "audio"
      : "document"
    setPreview({ file, url, type })
    e.target.value = ""
  }

  async function handleSend() {
    if (!preview) return
    await onSend(preview.file)
    URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  return (
    <>
      {/* Hidden input */}
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[hsl(222,20%,10%)] rounded-2xl p-5 max-w-md w-full mx-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground">Send {preview.type}</p>
              <button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null) }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-xl overflow-hidden mb-4 bg-black/30 flex items-center justify-center min-h-[120px]">
              {preview.type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt="preview" className="max-h-[300px] object-contain rounded-xl" />
              )}
              {preview.type === "video" && (
                <video src={preview.url} controls className="max-h-[300px] rounded-xl" />
              )}
              {preview.type === "audio" && (
                <div className="flex flex-col items-center gap-3 p-6">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Music className="w-8 h-8 text-primary" />
                  </div>
                  <audio src={preview.url} controls className="w-full" />
                </div>
              )}
              {preview.type === "document" && (
                <div className="flex flex-col items-center gap-3 p-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">{preview.file.name}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate mb-4">{preview.file.name}</p>

            <Button
              onClick={handleSend}
              disabled={isSending}
              className="w-full bg-gradient-to-r from-primary to-primary/80 h-11"
            >
              {isSending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                : <><Send className="w-4 h-4 mr-2" /> Send</>}
            </Button>
          </div>
        </div>
      )}

      {/* Attachment button + popover */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute bottom-12 left-0 z-20 bg-[hsl(222,20%,12%)] border border-white/10 rounded-2xl p-2 shadow-2xl flex gap-1">
              {[
                { icon: Image, label: "Photo", accept: "image/*", color: "text-emerald-400" },
                { icon: Film, label: "Video", accept: "video/*", color: "text-blue-400" },
                { icon: Music, label: "Audio", accept: "audio/*", color: "text-purple-400" },
                { icon: FileText, label: "Document", accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip", color: "text-orange-400" },
              ].map(({ icon: Icon, label, accept, color }) => (
                <button
                  key={label}
                  onClick={() => pickFile(accept)}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
