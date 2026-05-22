"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Highlighter,
  Minus,
  Mic,
  Type,
} from "lucide-react"
import { useEffect } from "react"
import "./rich-text-editor.css"

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/20 text-primary border border-primary/30"
          : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0" />
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
}: {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write your note...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "rich-text-editor-content",
        spellcheck: "true",
      },
    },
    immediatelyRender: false,
  })

  // Sync external content changes (e.g. note switching)
  useEffect(() => {
    if (!editor) return
    // Only update if content differs to avoid cursor jumping
    const current = editor.getHTML()
    if (current !== content) {
      // Use queueMicrotask to avoid updating editor during a React render
      queueMicrotask(() => {
        editor.commands.setContent(content)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!editor) return null

  return (
    <div className={cn("flex flex-col rounded-xl border border-primary/20 glass overflow-hidden", className)}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border/40 bg-background/30">
        {/* Paragraph */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive("paragraph")}
          title="Paragraph"
        >
          <Type className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Extras */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Horizontal Rule"
        >
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Spacer + Speak to Note */}
        <div className="flex-1" />
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors border border-border/30"
          title="Speak to Note (coming soon)"
        >
          <Mic className="w-3.5 h-3.5" />
          Speak to Note
        </button>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        className="flex-1"
      />
    </div>
  )
}
