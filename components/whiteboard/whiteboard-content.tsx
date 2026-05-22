"use client"

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useTransition,
} from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Trash2,
  PenLine,
  MoreHorizontal,
  Check,
  Download,
  ImageDown,
  Loader2,
  Clock,
  FileImage,
  StickyNote,
  Sparkles,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  createWhiteboard,
  deleteWhiteboard,
  getWhiteboardData,
  renameWhiteboard,
  updateWhiteboard,
  type WhiteboardData,
  type WhiteboardItem,
} from "@/lib/actions/whiteboard-actions"
import { useTheme } from "next-themes"
import type { ExcalidrawCanvasHandle } from "./excalidraw-canvas"
import dynamic from "next/dynamic"
import { toast } from "sonner"


// ─── Lazy canvas (no SSR) ─────────────────────────────────────────────────────
const ExcalidrawCanvas = dynamic(
  () => import("./excalidraw-canvas").then((m) => m.ExcalidrawCanvas),
  { ssr: false },
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

const EMPTY_DATA: WhiteboardData = { elements: [], appState: {}, files: {} }

// ─── Board Sidebar Item ───────────────────────────────────────────────────────

function BoardItem({
  board,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  board: WhiteboardItem
  isActive: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(board.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  function commitRename() {
    setEditing(false)
    if (title.trim() && title.trim() !== board.title) {
      onRename(title.trim())
    } else {
      setTitle(board.title)
    }
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-1 px-3 py-2.5 rounded-xl cursor-pointer border transition-all duration-200",
        isActive
          ? "bg-primary/10 border-primary/30 shadow-sm shadow-primary/10"
          : "border-transparent hover:bg-white/5 hover:border-border/30",
      )}
    >
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span
          className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            isActive ? "bg-primary" : "bg-emerald-400",
          )}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") { setEditing(false); setTitle(board.title) }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border-b border-primary/40 outline-none text-sm font-medium text-foreground"
          />
        ) : (
          <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
            {board.title}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={startEdit}>
              <PenLine className="w-3.5 h-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-[10px] text-muted-foreground/60 pl-4">
        {formatRelative(board.updatedAt)}
      </p>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
        <PenLine className="w-9 h-9 text-primary/60" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">No board selected</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Create a whiteboard to start sketching, planning, and designing — like FigmaJam.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-2 shadow-lg shadow-primary/20">
        <Plus className="w-4 h-4" />
        New Whiteboard
      </Button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WhiteboardContent({
  initialBoards,
}: {
  initialBoards: WhiteboardItem[]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [boards, setBoards] = useState<WhiteboardItem[]>(initialBoards)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [canvasData, setCanvasData] = useState<WhiteboardData | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [isCreating, startCreateTransition] = useTransition()
  const [isLoadingBoard, setIsLoadingBoard] = useState(false)

  const [showAiInput, setShowAiInput] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const canvasRef = useRef<ExcalidrawCanvasHandle>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDataRef = useRef<WhiteboardData | null>(null)
  const lastSavedDataStrRef = useRef<string>("")

  async function handleGenerateDiagram(e: React.FormEvent) {
    e.preventDefault()
    const promptText = aiPrompt.trim()
    if (!promptText || isGenerating) return
    setIsGenerating(true)
    const toastId = toast.loading("Generating diagram using Groq AI...")
    try {
      const res = await fetch("/api/whiteboard/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      })
      if (!res.ok) throw new Error("Failed to generate diagram")
      const data = await res.json()
      if (data.nodes && data.edges) {
        canvasRef.current?.addDiagram(data.nodes, data.edges)
        toast.success("Diagram generated successfully!", { id: toastId })
        setShowAiInput(false)
        setAiPrompt("")
      } else {
        throw new Error("Invalid response structure from AI")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate diagram. Please check your Groq API key.", { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }


  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null

  // ─── Load board data when selection changes ───────────────────────────────

  async function selectBoard(id: string) {
    if (id === activeBoardId) return
    setIsLoadingBoard(true)
    setActiveBoardId(id)
    setCanvasData(null)
    setSaveStatus("idle")
    const data = await getWhiteboardData(id)
    const initialData = data ?? EMPTY_DATA
    setCanvasData(initialData)
    lastSavedDataStrRef.current = JSON.stringify({
      elements: initialData.elements,
      files: initialData.files,
    })
    setIsLoadingBoard(false)
  }

  // ─── Auto-save with debounce ──────────────────────────────────────────────

  const handleCanvasChange = useCallback(
    (data: WhiteboardData) => {
      const currentDataStr = JSON.stringify({
        elements: data.elements,
        files: data.files,
      })

      if (currentDataStr === lastSavedDataStrRef.current) {
        return
      }

      pendingDataRef.current = data
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus("saving")
      saveTimerRef.current = setTimeout(async () => {
        if (!activeBoardId || !pendingDataRef.current) return
        await updateWhiteboard(activeBoardId, pendingDataRef.current)
        lastSavedDataStrRef.current = currentDataStr
        setSaveStatus("saved")
        // Update board updatedAt in sidebar
        setBoards((prev) =>
          prev.map((b) =>
            b.id === activeBoardId
              ? { ...b, updatedAt: new Date().toISOString() }
              : b,
          ),
        )
      }, 2000)
    },
    [activeBoardId],
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // ─── Create new board ─────────────────────────────────────────────────────

  function handleCreate() {
    startCreateTransition(async () => {
      const result = await createWhiteboard()
      if (result.success && result.board) {
        setBoards((prev) => [result.board, ...prev])
        await selectBoard(result.board.id)
      }
    })
  }

  // ─── Rename ───────────────────────────────────────────────────────────────

  async function handleRename(id: string, title: string) {
    await renameWhiteboard(id, title)
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, title } : b)),
    )
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await deleteWhiteboard(id)
    setBoards((prev) => prev.filter((b) => b.id !== id))
    if (activeBoardId === id) {
      setActiveBoardId(null)
      setCanvasData(null)
    }
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async function handleExportPNG() {
    await canvasRef.current?.exportPNG()
  }

  async function handleExportSVG() {
    await canvasRef.current?.exportSVG()
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 overflow-hidden rounded-2xl border border-primary/10 glass-card">
      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-border/40 bg-background/40 backdrop-blur-sm">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-0.5">
            <div>
              <p className="text-[9px] font-bold text-primary/60 uppercase tracking-[0.15em]">
                Library
              </p>
              <h2 className="text-sm font-semibold text-foreground">Whiteboards</h2>
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isCreating}
              className="h-7 px-2.5 gap-1 text-xs shadow-md shadow-primary/20"
            >
              {isCreating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              New
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {boards.length} board{boards.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {boards.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                No whiteboards yet. Create one to start!
              </p>
            </div>
          ) : (
            boards.map((board) => (
              <BoardItem
                key={board.id}
                board={board}
                isActive={board.id === activeBoardId}
                onSelect={() => selectBoard(board.id)}
                onRename={(title) => handleRename(board.id, title)}
                onDelete={() => handleDelete(board.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Canvas Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeBoardId && activeBoard ? (
          <>
            {/* Canvas Header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/30 bg-background/30 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div>
                  <h1 className="text-sm font-semibold text-foreground leading-none">
                    {activeBoard.title}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {saveStatus === "saving" && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Saving…
                      </span>
                    )}
                    {saveStatus === "saved" && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <Check className="w-2.5 h-2.5" />
                        Saved
                      </span>
                    )}
                    {saveStatus === "idle" && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelative(activeBoard.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls and Export buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => canvasRef.current?.addStickyNote()}
                  className="h-7 px-3 gap-1.5 text-xs border-border/50 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 dark:hover:text-amber-400"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  Sticky Note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAiInput((prev) => !prev)}
                  className={cn(
                    "h-7 px-3 gap-1.5 text-xs border-border/50 transition-all",
                    showAiInput
                      ? "bg-primary/20 border-primary text-primary"
                      : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Diagram
                </Button>

                <div className="h-4 w-px bg-border/40 mx-1" />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportSVG}
                  className="h-7 px-3 gap-1.5 text-xs border-border/50"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  SVG
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportPNG}
                  className="h-7 px-3 gap-1.5 text-xs shadow-md shadow-primary/20"
                >
                  <ImageDown className="w-3.5 h-3.5" />
                  Export PNG
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
              {showAiInput && (
                <div className="absolute top-4 right-4 z-50 w-80 p-4 rounded-xl bg-background/95 border border-border shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
                  <form onSubmit={handleGenerateDiagram} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        AI Diagram Generator
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAiInput(false)}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <Input
                      placeholder="e.g. Authentication flow, Database schema..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={isGenerating}
                      className="h-8 text-xs bg-background/50 border-border/50 focus:border-primary/50"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full h-8 text-xs gap-1 shadow-md shadow-primary/10"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {isLoadingBoard ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Loading board…</p>
                  </div>
                </div>
              ) : canvasData ? (
                <ExcalidrawCanvas
                  ref={canvasRef}
                  initialData={canvasData}
                  onChange={handleCanvasChange}
                  isDark={isDark}
                />
              ) : null}
            </div>
          </>
        ) : (
          <EmptyState onCreate={handleCreate} />
        )}
      </div>
    </div>
  )
}
