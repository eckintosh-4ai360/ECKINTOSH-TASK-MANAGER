"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileJson, FileSpreadsheet, File, CheckCircle2, X } from "lucide-react"

interface ImportDataModalProps {
  children: React.ReactNode
}

export function ImportDataModal({ children }: ImportDataModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleImport = () => {
    if (!selectedFile) return
    setImporting(true)
    // Simulate import
    setTimeout(() => {
      setImporting(false)
      setOpen(false)
      setSelectedFile(null)
    }, 2000)
  }

  const fileFormats = [
    { icon: FileJson, name: "JSON", ext: ".json", color: "text-yellow-500" },
    { icon: FileSpreadsheet, name: "CSV", ext: ".csv", color: "text-green-500" },
    { icon: File, name: "Excel", ext: ".xlsx", color: "text-blue-500" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <span>Import Data</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Supported Formats</Label>
            <div className="flex gap-3">
              {fileFormats.map((format) => (
                <div
                  key={format.name}
                  className="glass rounded-lg p-3 border border-border/30 flex items-center gap-2 flex-1"
                >
                  <format.icon className={`w-5 h-5 ${format.color}`} />
                  <div>
                    <p className="text-sm font-medium">{format.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{format.ext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Upload File</Label>
            <div className="relative">
              <Input
                type="file"
                accept=".json,.csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`glass rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
                  selectedFile ? "border-primary/30" : "border-border/50"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={(e) => {
                        e.preventDefault()
                        setSelectedFile(null)
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-primary/60 mb-3" />
                    <p className="text-sm text-foreground font-medium">Drop your file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Maximum file size: 10MB</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="glass rounded-lg p-4 border border-primary/10">
            <h4 className="text-sm font-medium text-foreground mb-2">Import Options</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>- Projects and tasks will be merged with existing data</p>
              <p>- Duplicate entries will be skipped automatically</p>
              <p>- Team members will receive notification emails</p>
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
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
