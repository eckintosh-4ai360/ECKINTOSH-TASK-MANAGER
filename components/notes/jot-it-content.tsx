"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Check,
  Loader2,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Eye,
  Edit2,
  Columns,
} from "lucide-react"
import { MarkdownPreview } from "./markdown-preview"
import {
  createNote,
  deleteNote,
  type JotNote,
  toggleNotePinned,
  updateNote,
} from "@/lib/actions/note-actions"

const NOTE_COLORS = ["#00d4ff", "#a855f7", "#10b981", "#f59e0b", "#ef4444"]

type Draft = {
  id: string | null
  title: string
  content: string
  color: string
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: "",
  content: "",
  color: NOTE_COLORS[0],
}

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function JotItContent({ initialNotes }: { initialNotes: JotNote[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<"edit" | "preview" | "split">("edit")

  const filteredNotes = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return notes

    return notes.filter((note) =>
      [note.title, note.content].some((field) => field.toLowerCase().includes(value)),
    )
  }, [notes, query])

  const selectedNote = draft.id ? notes.find((note) => note.id === draft.id) ?? null : null
  const canSave = draft.title.trim().length > 0 || draft.content.trim().length > 0

  function resetDraft() {
    setDraft(EMPTY_DRAFT)
    setMessage(null)
    setMode("edit")
  }

  function selectNote(note: JotNote) {
    setDraft({
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
    })
    setMessage(null)
  }

  function handleSave() {
    if (!canSave) {
      setMessage("Add a title or note body first.")
      return
    }

    startTransition(async () => {
      const result = draft.id
        ? await updateNote(draft.id, draft)
        : await createNote(draft)

      if (!result.success || !result.note) {
        setMessage("Could not save that note.")
        return
      }

      setNotes((current) => {
        const withoutSaved = current.filter((note) => note.id !== result.note.id)
        return [result.note, ...withoutSaved].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
      })
      setDraft({
        id: result.note.id,
        title: result.note.title,
        content: result.note.content,
        color: result.note.color,
      })
      setMessage("Saved.")
    })
  }

  function handlePinned(note: JotNote) {
    startTransition(async () => {
      await toggleNotePinned(note.id, !note.pinned)
      setNotes((current) =>
        current
          .map((item) => item.id === note.id ? { ...item, pinned: !item.pinned } : item)
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          }),
      )
      if (draft.id === note.id) {
        setMessage(!note.pinned ? "Pinned." : "Unpinned.")
      }
    })
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      await deleteNote(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      if (draft.id === noteId) resetDraft()
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
            <NotebookPen className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Jots</h2>
            <p className="text-xs text-muted-foreground">{notes.length} saved note{notes.length === 1 ? "" : "s"}</p>
          </div>
          <Button type="button" size="icon" className="ml-auto h-9 w-9" onClick={resetDraft}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            className="pl-9 glass border-primary/20"
          />
        </div>

        <div className="space-y-2 max-h-[calc(100vh-290px)] overflow-y-auto pr-1">
          {filteredNotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
              {query ? "No notes match your search." : "No notes yet. Start with a quick jot."}
            </div>
          )}

          {filteredNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => selectNote(note)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-all hover:border-primary/35 hover:bg-primary/5",
                draft.id === note.id ? "border-primary/45 bg-primary/10" : "border-border/50 bg-background/40",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: note.color, boxShadow: `0 0 10px ${note.color}55` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{note.title}</p>
                    {note.pinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {note.content || "Empty note"}
                  </p>
                  <p className="mt-2 text-[10px] font-mono text-muted-foreground/70">
                    {formatUpdated(note.updatedAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-3 border-b border-border/40 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedNote ? "Edit note" : "New note"}
                </h2>
                {selectedNote?.pinned && <Badge className="bg-primary/10 text-primary border border-primary/25">Pinned</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedNote ? `Updated ${formatUpdated(selectedNote.updatedAt)}` : "Capture the thought before it wanders off."}
              </p>
            </div>
            
            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-secondary/30 p-0.5 border border-border/40 w-fit">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all",
                  mode === "edit"
                    ? "bg-primary/25 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all",
                  mode === "preview"
                    ? "bg-primary/25 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("split")}
                className={cn(
                  "hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all",
                  mode === "split"
                    ? "bg-primary/25 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedNote && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handlePinned(selectedNote)}
                className="glass border-primary/20"
                aria-label={selectedNote.pinned ? "Unpin note" : "Pin note"}
              >
                {selectedNote.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </Button>
            )}
            {selectedNote && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleDelete(selectedNote.id)}
                className="glass border-destructive/25 text-destructive hover:bg-destructive/10"
                aria-label="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button type="button" onClick={handleSave} disabled={isPending || !canSave}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Note title"
            className="h-12 glass border-primary/20 text-base font-semibold"
          />

          {mode !== "preview" && (
            <div className="flex flex-wrap items-center gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, color }))}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-all",
                    draft.color === color ? "scale-110 border-foreground shadow-lg" : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Set note color ${color}`}
                />
              ))}
            </div>
          )}

          {mode === "edit" && (
            <Textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              placeholder="Write your note (supports Markdown)..."
              className="min-h-[360px] resize-none glass border-primary/20 leading-7 font-mono text-sm"
            />
          )}

          {mode === "preview" && (
            <div
              className="min-h-[360px] p-5 rounded-xl glass border-primary/10 overflow-y-auto max-h-[calc(100vh-320px)] border-l-4"
              style={{ borderLeftColor: draft.color }}
            >
              <MarkdownPreview
                content={draft.content}
                onContentChange={(newContent) => {
                  setDraft((current) => ({ ...current, content: newContent }))
                  const noteId = draft.id
                  if (noteId) {
                    startTransition(async () => {
                      const updatedDraft = { ...draft, content: newContent }
                      const result = await updateNote(noteId, updatedDraft)
                      if (result.success && result.note) {
                        setNotes((current) =>
                          current.map((n) => (n.id === result.note?.id ? result.note : n))
                        )
                        setMessage("Auto-saved check state.")
                      }
                    })
                  }
                }}
              />
            </div>
          )}

          {mode === "split" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                placeholder="Write your note (supports Markdown)..."
                className="min-h-[360px] resize-none glass border-primary/20 leading-7 font-mono text-sm"
              />
              <div
                className="min-h-[360px] p-5 rounded-xl glass border-primary/10 overflow-y-auto max-h-[calc(100vh-320px)] border-l-4"
                style={{ borderLeftColor: draft.color }}
              >
                <MarkdownPreview
                  content={draft.content}
                  onContentChange={(newContent) => {
                    setDraft((current) => ({ ...current, content: newContent }))
                    const noteId = draft.id
                    if (noteId) {
                      startTransition(async () => {
                        const updatedDraft = { ...draft, content: newContent }
                        const result = await updateNote(noteId, updatedDraft)
                        if (result.success && result.note) {
                          setNotes((current) =>
                            current.map((n) => (n.id === result.note?.id ? result.note : n))
                          )
                          setMessage("Auto-saved check state.")
                        }
                      })
                    }
                  }}
                />
              </div>
            </div>
          )}

          {message && (
            <p className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
              {message}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
