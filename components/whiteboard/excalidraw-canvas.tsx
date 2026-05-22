"use client"

import dynamic from "next/dynamic"
import { useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import type { WhiteboardData } from "@/lib/actions/whiteboard-actions"
import "@excalidraw/excalidraw/index.css"

// ─── Dynamic import — no SSR (Excalidraw uses browser APIs) ──────────────────
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw")
    return mod.Excalidraw
  },
  { ssr: false, loading: () => <CanvasLoader /> },
)

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function CanvasLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#f8f9fa] dark:bg-[#121212]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Loading canvas…</p>
      </div>
    </div>
  )
}

// ─── Canvas handle exposed to parent ─────────────────────────────────────────
export type ExcalidrawCanvasHandle = {
  getSnapshot: () => WhiteboardData | null
  exportPNG: () => Promise<void>
  exportSVG: () => Promise<void>
  addStickyNote: () => void | Promise<void>
  addDiagram: (nodes: any[], edges: any[]) => void | Promise<void>
}

type Props = {
  initialData: WhiteboardData
  onChange: (data: WhiteboardData) => void
  isDark: boolean
}

export const ExcalidrawCanvas = forwardRef<ExcalidrawCanvasHandle, Props>(
  function ExcalidrawCanvas({ initialData, onChange, isDark }, ref) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiRef = useRef<any>(null)

    // Expose snapshot + export methods to parent
    useImperativeHandle(ref, () => ({
      getSnapshot() {
        if (!apiRef.current) return null
        const elements = apiRef.current.getSceneElements()
        const appState = apiRef.current.getAppState()
        const files = apiRef.current.getFiles()
        const safeAppState = {
          scrollX: typeof appState.scrollX === "number" ? appState.scrollX : 0,
          scrollY: typeof appState.scrollY === "number" ? appState.scrollY : 0,
          zoom: appState.zoom && typeof (appState.zoom as any).value === "number" ? appState.zoom : { value: 1 },
          viewBackgroundColor: typeof appState.viewBackgroundColor === "string" ? appState.viewBackgroundColor : "transparent",
        }
        return {
          elements: elements as unknown[],
          appState: safeAppState,
          files: files as Record<string, unknown>,
        }
      },

      async addStickyNote() {
        if (!apiRef.current) return
        const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw")
        const appState = apiRef.current.getAppState()
        const zoom = appState.zoom?.value || 1
        const cx = -appState.scrollX + appState.width / 2 / zoom
        const cy = -appState.scrollY + appState.height / 2 / zoom

        const rectId = `sticky_rect_${Math.random().toString(36).substr(2, 9)}`
        const textId = `sticky_text_${Math.random().toString(36).substr(2, 9)}`

        const rectElement = {
          type: "rectangle" as const,
          id: rectId,
          x: cx - 100,
          y: cy - 100,
          width: 200,
          height: 200,
          strokeColor: "#fab005",
          backgroundColor: "#ffec99",
          fillStyle: "solid" as const,
          strokeWidth: 1,
          strokeStyle: "solid" as const,
          roughness: 1,
          opacity: 100,
          roundness: { type: 3 as const },
          boundElements: [{ type: "text" as const, id: textId }],
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          updated: Date.now(),
        }

        const textElement = {
          type: "text" as const,
          id: textId,
          x: cx - 90,
          y: cy - 90,
          width: 180,
          height: 180,
          strokeColor: "#2b2b2b",
          strokeWidth: 1,
          strokeStyle: "solid" as const,
          roughness: 0,
          opacity: 100,
          text: "Type here",
          fontSize: 18,
          fontFamily: 1,
          textAlign: "center" as const,
          verticalAlign: "middle" as const,
          containerId: rectId,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          updated: Date.now(),
        }

        const newElements = convertToExcalidrawElements([rectElement, textElement])
        const existingElements = apiRef.current.getSceneElements()
        apiRef.current.updateScene({
          elements: [...existingElements, ...newElements],
        })
      },

      async addDiagram(nodes: any[], edges: any[]) {
        if (!apiRef.current) return
        const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw")
        const appState = apiRef.current.getAppState()
        const zoom = appState.zoom?.value || 1
        const cx = -appState.scrollX + appState.width / 2 / zoom
        const cy = -appState.scrollY + appState.height / 2 / zoom

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        nodes.forEach(n => {
          if (n.x < minX) minX = n.x
          if (n.y < minY) minY = n.y
          if (n.x + n.width > maxX) maxX = n.x + n.width
          if (n.y + n.height > maxY) maxY = n.y + n.height
        })

        const diagCx = minX === Infinity ? 0 : (minX + maxX) / 2
        const diagCy = minY === Infinity ? 0 : (minY + maxY) / 2
        const dx = cx - diagCx
        const dy = cy - diagCy

        const elementsToAdd: any[] = []
        const colors: Record<string, { stroke: string; bg: string }> = {
          blue: { stroke: "#1c7ed6", bg: "#d0ebff" },
          green: { stroke: "#37b24d", bg: "#ebfbee" },
          red: { stroke: "#f03e3e", bg: "#ffe3e3" },
          orange: { stroke: "#f76707", bg: "#fff4e6" },
          purple: { stroke: "#ae3ec9", bg: "#f3e0f9" },
          yellow: { stroke: "#f59f00", bg: "#fff9db" },
          gray: { stroke: "#495057", bg: "#e9ecef" },
        }

        const idMap = new Map<string, string>()

        nodes.forEach(node => {
          const type = node.type || "rectangle"
          const shapeId = `shape_${Math.random().toString(36).substr(2, 9)}`
          const textId = `text_${Math.random().toString(36).substr(2, 9)}`
          idMap.set(node.id, shapeId)

          const themeColors = colors[node.color || "blue"] || colors.blue
          const nodeX = node.x + dx
          const nodeY = node.y + dy
          const nodeW = node.width || 140
          const nodeH = node.height || 70

          const shapeElement = {
            type: (type === "circle" ? "ellipse" : type === "diamond" ? "diamond" : "rectangle") as "ellipse" | "diamond" | "rectangle",
            id: shapeId,
            x: nodeX,
            y: nodeY,
            width: nodeW,
            height: nodeH,
            strokeColor: themeColors.stroke,
            backgroundColor: themeColors.bg,
            fillStyle: "solid" as const,
            strokeWidth: 2,
            strokeStyle: "solid" as const,
            roughness: 1,
            opacity: 100,
            roundness: type === "rectangle" ? { type: 3 } : null,
            boundElements: [{ type: "text" as const, id: textId }],
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            updated: Date.now(),
          }

          const textElement = {
            type: "text" as const,
            id: textId,
            x: nodeX + 10,
            y: nodeY + 10,
            width: nodeW - 20,
            height: nodeH - 20,
            strokeColor: "#2b2b2b",
            strokeWidth: 1,
            strokeStyle: "solid" as const,
            roughness: 0,
            opacity: 100,
            text: node.label || "",
            fontSize: 14,
            fontFamily: 2,
            textAlign: "center" as const,
            verticalAlign: "middle" as const,
            containerId: shapeId,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            updated: Date.now(),
          }

          elementsToAdd.push(shapeElement, textElement)
        })

        edges.forEach(edge => {
          const fromShapeId = idMap.get(edge.from)
          const toShapeId = idMap.get(edge.to)

          const fromNode = nodes.find(n => n.id === edge.from)
          const toNode = nodes.find(n => n.id === edge.to)

          if (!fromNode || !toNode) return

          const fx = fromNode.x + dx
          const fy = fromNode.y + dy
          const fw = fromNode.width || 140
          const fh = fromNode.height || 70

          const tx = toNode.x + dx
          const ty = toNode.y + dy
          const tw = toNode.width || 140
          const th = toNode.height || 70

          const fCx = fx + fw / 2
          const fCy = fy + fh / 2
          const tCx = tx + tw / 2
          const tCy = ty + th / 2

          let startX = fCx
          let startY = fCy
          let endX = tCx
          let endY = tCy

          if (Math.abs(tCx - fCx) > Math.abs(tCy - fCy)) {
            if (tCx > fCx) {
              startX = fx + fw
              endX = tx
            } else {
              startX = fx
              endX = tx + tw
            }
          } else {
            if (tCy > fCy) {
              startY = fy + fh
              endY = ty
            } else {
              startY = fy
              endY = ty + th
            }
          }

          const arrowId = `arrow_${Math.random().toString(36).substr(2, 9)}`
          const arrowElement = {
            type: "arrow" as const,
            id: arrowId,
            x: startX,
            y: startY,
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY),
            strokeColor: "#495057",
            strokeWidth: 2,
            strokeStyle: "solid" as const,
            roughness: 1,
            opacity: 100,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            updated: Date.now(),
            points: [
              [0, 0],
              [endX - startX, endY - startY],
            ],
            startArrowhead: null,
            endArrowhead: "arrow" as const,
          }

          elementsToAdd.push(arrowElement)

          if (edge.label) {
            const midX = (startX + endX) / 2
            const midY = (startY + endY) / 2
            const textId = `arrow_text_${Math.random().toString(36).substr(2, 9)}`

            const labelElement = {
              type: "text" as const,
              id: textId,
              x: midX - 60,
              y: midY - 10,
              width: 120,
              height: 20,
              strokeColor: "#495057",
              strokeWidth: 1,
              strokeStyle: "solid" as const,
              roughness: 0,
              opacity: 100,
              text: edge.label,
              fontSize: 11,
              fontFamily: 2,
              textAlign: "center" as const,
              verticalAlign: "middle" as const,
              seed: Math.floor(Math.random() * 100000),
              version: 1,
              versionNonce: Math.floor(Math.random() * 100000),
              isDeleted: false,
              updated: Date.now(),
            }

            elementsToAdd.push(labelElement)
          }
        })

        const newElements = convertToExcalidrawElements(elementsToAdd)
        const existingElements = apiRef.current.getSceneElements()
        apiRef.current.updateScene({
          elements: [...existingElements, ...newElements],
        })
      },

      async exportPNG() {
        if (!apiRef.current) return
        const { exportToBlob } = await import("@excalidraw/excalidraw")
        const elements = apiRef.current.getSceneElements()
        const appState = apiRef.current.getAppState()
        const files = apiRef.current.getFiles()
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, exportWithDarkMode: false },
          files,
          mimeType: "image/png",
          quality: 1,
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "whiteboard.png"
        a.click()
        URL.revokeObjectURL(url)
      },

      async exportSVG() {
        if (!apiRef.current) return
        const { exportToSvg } = await import("@excalidraw/excalidraw")
        const elements = apiRef.current.getSceneElements()
        const appState = apiRef.current.getAppState()
        const files = apiRef.current.getFiles()
        const svg = await exportToSvg({
          elements,
          appState: { ...appState, exportWithDarkMode: false },
          files,
        })
        const svgString = new XMLSerializer().serializeToString(svg)
        const blob = new Blob([svgString], { type: "image/svg+xml" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "whiteboard.svg"
        a.click()
        URL.revokeObjectURL(url)
      },
    }))

    const handleChange = useCallback(
      (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
        const safeAppState = {
          scrollX: typeof appState.scrollX === "number" ? appState.scrollX : 0,
          scrollY: typeof appState.scrollY === "number" ? appState.scrollY : 0,
          zoom: appState.zoom && typeof (appState.zoom as any).value === "number" ? appState.zoom : { value: 1 },
          viewBackgroundColor: typeof appState.viewBackgroundColor === "string" ? appState.viewBackgroundColor : "transparent",
        }
        onChange({
          elements: elements as unknown[],
          appState: safeAppState,
          files,
        })
      },
      [onChange],
    )

    return (
      <div className="flex-1 h-full w-full" style={{ minHeight: 0 }}>
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api }}
          initialData={{
            elements: initialData.elements as never,
            appState: {
              scrollX: (initialData.appState as any)?.scrollX ?? 0,
              scrollY: (initialData.appState as any)?.scrollY ?? 0,
              zoom: (initialData.appState as any)?.zoom ?? { value: 1 },
              viewBackgroundColor: (initialData.appState as any)?.viewBackgroundColor ?? "transparent",
              theme: isDark ? "dark" : "light",
            },
            files: initialData.files as never,
            scrollToContent: true,
          }}
          onChange={handleChange as never}
          theme={isDark ? "dark" : "light"}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
            },
          }}
        />
      </div>
    )
  },
)
