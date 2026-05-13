"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileText, FileSpreadsheet, FileJson, Calendar } from "lucide-react"

interface ExportReportModalProps {
  children: React.ReactNode
}

export function ExportReportModal({ children }: ExportReportModalProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [config, setConfig] = useState({
    format: "",
    dateRange: "",
    includeProjects: true,
    includeTasks: true,
    includeTeam: false,
    includeAnalytics: true,
  })

  const handleExport = () => {
    setExporting(true)
    setTimeout(() => {
      setExporting(false)
      setOpen(false)
    }, 2000)
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
                  key={format.value}
                  onClick={() => setConfig({ ...config, format: format.value })}
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
              onValueChange={(value) => setConfig({ ...config, dateRange: value })}
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
                    onCheckedChange={(checked) => setConfig({ ...config, [item.key]: checked })}
                    className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor={item.key} className="text-sm cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

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
              disabled={!config.format || !config.dateRange || exporting}
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
