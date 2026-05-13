"use client"

import { Button } from "@/components/ui/button"
import { Database, HardDrive, Cloud, Activity } from "lucide-react"

const storageItems = [
  { label: "Local Storage", value: "256 GB", used: 78, icon: HardDrive },
  { label: "Cloud Backup", value: "1.2 TB", used: 45, icon: Cloud },
  { label: "Database", value: "128 GB", used: 62, icon: Database },
]

export function MobileAppCard() {
  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up relative overflow-hidden"
      style={{ animationDelay: "900ms" }}
    >
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Storage Monitor</h2>
          <Activity className="w-5 h-5 text-primary animate-pulse" />
        </div>

        <div className="space-y-4">
          {storageItems.map((item) => (
            <div key={item.label} className="glass rounded-lg p-3 border border-border/30 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.value}</p>
                </div>
                <span className="text-sm font-mono text-primary">{item.used}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000"
                  style={{ width: `${item.used}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full mt-4 glass border border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-foreground bg-transparent">
          <Database className="w-4 h-4 mr-2 text-primary" />
          Manage Storage
        </Button>
      </div>
    </div>
  )
}
