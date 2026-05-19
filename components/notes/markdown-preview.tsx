"use client"

import React, { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownPreviewProps {
  content: string
  onContentChange?: (newContent: string) => void
}

export function MarkdownPreview({ content, onContentChange }: MarkdownPreviewProps) {
  if (!content) {
    return <p className="text-sm italic text-muted-foreground">Empty note. Type some markdown to begin...</p>
  }

  const lines = content.split("\n")
  const renderedElements: React.ReactNode[] = []
  
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let codeLanguage = ""
  
  let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null

  // Commit the active list to rendered elements
  const commitList = (key: string) => {
    if (currentList) {
      if (currentList.type === "ul") {
        renderedElements.push(
          <ul key={`ul-${key}`} className="list-disc pl-6 space-y-1.5 my-3 text-foreground/90 leading-6 text-sm">
            {currentList.items}
          </ul>
        )
      } else {
        renderedElements.push(
          <ol key={`ol-${key}`} className="list-decimal pl-6 space-y-1.5 my-3 text-foreground/90 leading-6 text-sm">
            {currentList.items}
          </ol>
        )
      }
      currentList = null
    }
  }

  // Parse inline elements (bold, italics, code, links)
  const parseInline = (text: string): React.ReactNode[] => {
    let parts: (string | React.ReactNode)[] = [text]

    // 1. Bold: **bold text**
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part
      const regex = /\*\*(.*?)\*\*/g
      const result: (string | React.ReactNode)[] = []
      let lastIndex = 0
      let match
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index))
        }
        result.push(<strong key={`b-${match.index}`} className="font-bold text-foreground">{match[1]}</strong>)
        lastIndex = regex.lastIndex
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex))
      }
      return result
    })

    // 2. Italic: *italic text*
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part
      const regex = /\*(.*?)\*/g
      const result: (string | React.ReactNode)[] = []
      let lastIndex = 0
      let match
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index))
        }
        result.push(<em key={`i-${match.index}`} className="italic opacity-90">{match[1]}</em>)
        lastIndex = regex.lastIndex
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex))
      }
      return result
    })

    // 3. Inline Code: `code`
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part
      const regex = /`(.*?)`/g
      const result: (string | React.ReactNode)[] = []
      let lastIndex = 0
      let match
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index))
        }
        result.push(
          <code key={`code-${match.index}`} className="px-1.5 py-0.5 rounded bg-white/10 text-primary font-mono text-xs border border-white/5">
            {match[1]}
          </code>
        )
        lastIndex = regex.lastIndex
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex))
      }
      return result
    })

    // 4. Links: [text](url)
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part
      const regex = /\[(.*?)\]\((.*?)\)/g
      const result: (string | React.ReactNode)[] = []
      let lastIndex = 0
      let match
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index))
        }
        const url = match[2]
        result.push(
          <a
            key={`a-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5 font-semibold"
          >
            {match[1]}
            <ExternalLink className="w-2.5 h-2.5 inline" />
          </a>
        )
        lastIndex = regex.lastIndex
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex))
      }
      return result
    })

    return parts as React.ReactNode[]
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]

    // 1. Code Block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false
        const codeText = codeBlockLines.join("\n")
        const lang = codeLanguage || "code"
        renderedElements.push(
          <CodeBlockContainer key={`codeblock-${idx}`} code={codeText} language={lang} />
        )
        codeBlockLines = []
        codeLanguage = ""
      } else {
        commitList(String(idx))
        inCodeBlock = true
        codeLanguage = line.trim().slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // 2. Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      commitList(String(idx))
      renderedElements.push(<hr key={`hr-${idx}`} className="border-t border-border/40 my-4" />)
      continue
    }

    // 3. Headings
    if (line.startsWith("# ")) {
      commitList(String(idx))
      renderedElements.push(
        <h1 key={`h1-${idx}`} className="text-xl font-extrabold font-mono tracking-tight text-foreground border-b border-border/20 pb-1.5 mt-5 mb-2.5 uppercase">
          {parseInline(line.slice(2))}
        </h1>
      )
      continue
    }
    if (line.startsWith("## ")) {
      commitList(String(idx))
      renderedElements.push(
        <h2 key={`h2-${idx}`} className="text-lg font-bold font-mono tracking-tight text-foreground mt-4 mb-2">
          {parseInline(line.slice(3))}
        </h2>
      )
      continue
    }
    if (line.startsWith("### ")) {
      commitList(String(idx))
      renderedElements.push(
        <h3 key={`h3-${idx}`} className="text-sm font-bold font-mono tracking-tight text-foreground mt-3 mb-1.5">
          {parseInline(line.slice(4))}
        </h3>
      )
      continue
    }

    // 4. Blockquotes
    if (line.startsWith("> ")) {
      commitList(String(idx))
      renderedElements.push(
        <blockquote key={`quote-${idx}`} className="border-l-4 border-primary/50 bg-primary/5 px-3 py-2 rounded-r-lg my-2 text-muted-foreground italic font-mono text-xs leading-5">
          {parseInline(line.slice(2))}
        </blockquote>
      )
      continue
    }

    // 5. Interactive Checklists (- [ ] or - [x])
    const checklistMatch = line.match(/^(\s*)-\s+\[\s*([xX\s])\s*\]\s+(.+)$/)
    if (checklistMatch) {
      commitList(String(idx))
      const isChecked = checklistMatch[2] !== " "
      const text = checklistMatch[3]
      const indent = checklistMatch[1].length

      const toggleCheck = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!onContentChange) return
        const newLines = [...lines]
        const replacementChar = isChecked ? " " : "x"
        newLines[idx] = `${checklistMatch[1]}- [${replacementChar}] ${text}`
        onContentChange(newLines.join("\n"))
      }

      renderedElements.push(
        <div
          key={`chk-${idx}`}
          style={{ paddingLeft: `${indent * 8 + 4}px` }}
          className="flex items-start gap-2.5 py-1 text-sm font-mono cursor-pointer select-none group"
          onClick={toggleCheck}
        >
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all mt-0.5",
            isChecked 
              ? "bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,212,255,0.4)]" 
              : "border-muted-foreground/40 bg-secondary/30 group-hover:border-primary/50"
          )}>
            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span className={cn(
            "transition-colors leading-5",
            isChecked ? "line-through text-muted-foreground/60" : "text-foreground group-hover:text-primary"
          )}>
            {parseInline(text)}
          </span>
        </div>
      )
      continue
    }

    // 6. Unordered lists (- item or * item)
    const ulMatch = line.match(/^(\s*)[\-\*]\s+(.+)$/)
    if (ulMatch) {
      const text = ulMatch[2]
      const indent = ulMatch[1].length
      
      const itemNode = (
        <li key={`ul-li-${idx}`} style={{ paddingLeft: `${indent * 8}px` }}>
          {parseInline(text)}
        </li>
      )

      if (currentList && currentList.type === "ul") {
        currentList.items.push(itemNode)
      } else {
        commitList(String(idx))
        currentList = { type: "ul", items: [itemNode] }
      }
      continue
    }

    // 7. Ordered lists (1. item)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (olMatch) {
      const text = olMatch[2]
      const indent = olMatch[1].length
      
      const itemNode = (
        <li key={`ol-li-${idx}`} style={{ paddingLeft: `${indent * 8}px` }}>
          {parseInline(text)}
        </li>
      )

      if (currentList && currentList.type === "ol") {
        currentList.items.push(itemNode)
      } else {
        commitList(String(idx))
        currentList = { type: "ol", items: [itemNode] }
      }
      continue
    }

    // 8. Plain paragraph or blank lines
    if (line.trim() === "") {
      commitList(String(idx))
      renderedElements.push(<div key={`space-${idx}`} className="h-2" />)
    } else {
      commitList(String(idx))
      renderedElements.push(
        <p key={`p-${idx}`} className="text-foreground/90 font-sans text-sm leading-6 my-2">
          {parseInline(line)}
        </p>
      )
    }
  }

  // Commit any trailing list
  commitList("end")

  return <div className="space-y-0.5">{renderedElements}</div>
}

// Code Block with Copy state
function CodeBlockContainer({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-lg border border-white/10 bg-black/40 overflow-hidden relative group font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/5">
        <span className="uppercase text-muted-foreground text-[9px] font-bold tracking-wider">{language || "code"}</span>
        <button
          type="button"
          onClick={copyCode}
          className="p-1 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-[9px]"
        >
          {copied ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-500" />
              <span className="text-emerald-500 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3 leading-5 text-emerald-400/90 whitespace-pre scrollbar-thin">
        {code}
      </div>
    </div>
  )
}
