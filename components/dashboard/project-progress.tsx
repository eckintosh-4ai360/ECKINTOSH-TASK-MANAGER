"use client"

import { useEffect, useState } from "react"

export function ProjectProgress() {
  const resourceData = [
    { label: "Processing Power", value: 42, color: "from-primary to-primary/60" },
    { label: "Memory Usage", value: 68, color: "from-chart-2 to-chart-2/60" },
    { label: "Storage", value: 35, color: "from-chart-3 to-chart-3/60" },
    { label: "Network I/O", value: 89, color: "from-chart-4 to-chart-4/60" },
  ]

  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up"
      style={{ animationDelay: "800ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">Resource Allocation</h2>
        <span className="text-xs font-mono text-primary">42% allocated</span>
      </div>
      
      <div className="space-y-4">
        {resourceData.map((resource, index) => (
          <div key={resource.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{resource.label}</span>
              <span className="text-xs font-mono text-foreground">{resource.value}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${resource.color} rounded-full transition-all duration-1000`}
                style={{ width: `${resource.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Active Processes */}
      <div className="mt-5 pt-4 border-t border-border/30">
        <p className="text-[10px] text-primary/80 uppercase tracking-widest mb-3">Active Processes</p>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary border-2 border-card flex items-center justify-center">
                <span className="text-[10px] font-mono text-primary">{i}</span>
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">+12 more</span>
        </div>
      </div>
    </div>
  )
}
