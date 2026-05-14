"use client"

import { type ReactNode, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, CheckCircle2, Download, FileText, FileSpreadsheet, FileJson, Calendar } from "lucide-react"

interface ExportReportModalProps {
  children: ReactNode
}

type ExportConfig = {
  format: "" | "pdf" | "xlsx" | "json"
  dateRange: "" | "week" | "month" | "quarter" | "year" | "all"
  includeProjects: boolean
  includeTasks: boolean
  includeTeam: boolean
  includeAnalytics: boolean
}

function getDownloadFilename(response: Response, format: ExportConfig["format"]) {
  const disposition = response.headers.get("content-disposition")
  const match = disposition?.match(/filename="([^"]+)"/)
  if (match?.[1]) return match[1]

  const extension = format === "xlsx" ? "xls" : format || "txt"
  return `eckintosh-report.${extension}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function ExportReportModal({ children }: ExportReportModalProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [config, setConfig] = useState<ExportConfig>({
    format: "",
    dateRange: "",
    includeProjects: true,
    includeTasks: true,
    includeTeam: false,
    includeAnalytics: true,
  })

  const selectedSectionCount = [
    config.includeProjects,
    config.includeTasks,
    config.includeTeam,
    config.includeAnalytics,
  ].filter(Boolean).length

  const handleExport = async () => {
    if (!config.format || !config.dateRange) {
      setMessage({ type: "error", text: "Choose an export format and date range first." })
      return
    }

    if (selectedSectionCount === 0) {
      setMessage({ type: "error", text: "Select at least one section to include in the report." })
      return
    }

    setExporting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error ?? "Export failed. Please try again.")
      }

      const blob = await response.blob()
      downloadBlob(blob, getDownloadFilename(response, config.format))
      setMessage({ type: "success", text: "Report generated and downloaded." })
      setOpen(false)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Export failed. Please try again.",
      })
    } finally {
      setExporting(false)
    }
  }

  const formats = [
    { value: "pdf", label: "PDF Document", icon: FileText },
    { value: "xlsx", label: "Excel Spreadsheet", icon: FileSpreadsheet },
    { value: "json", label: "JSON Data", icon: FileJson },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <span>Export Report</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Export Format</Label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((format) => (
                <button
                  type="button"
                  key={format.value}
                  onClick={() => setConfig({ ...config, format: format.value as ExportConfig["format"] })}
                  className={`glass rounded-lg p-4 border flex flex-col items-center gap-2 transition-all ${
                    config.format === format.value
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/30 hover:border-primary/30"
                  }`}
                >
                  <format.icon className={`w-6 h-6 ${config.format === format.value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{format.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Date Range
            </Label>
            <Select
              value={config.dateRange}
              onValueChange={(value) => setConfig({ ...config, dateRange: value as ExportConfig["dateRange"] })}
            >
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 3 months</SelectItem>
                <SelectItem value="year">Last 12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Include in Report</Label>
            <div className="glass rounded-lg p-4 border border-border/30 space-y-3">
              {[
                { key: "includeProjects", label: "Projects Overview" },
                { key: "includeTasks", label: "Tasks Summary" },
                { key: "includeTeam", label: "Team Activity" },
                { key: "includeAnalytics", label: "Analytics Data" },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <Checkbox
                    id={item.key}
                    checked={config[item.key as keyof typeof config] as boolean}
                    onCheckedChange={(checked) => setConfig({ ...config, [item.key]: checked === true })}
                    className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor={item.key} className="text-sm cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={!config.format || !config.dateRange || selectedSectionCount === 0 || exporting}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
