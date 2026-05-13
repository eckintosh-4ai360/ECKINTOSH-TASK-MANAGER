"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, ArrowLeft, Shield } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export default function LogoutPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header title="Session Control" description="Manage your active session." />

        <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
          <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in border-destructive/20">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center border border-destructive/30 relative">
                <LogOut className="w-10 h-10 text-destructive" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">End Session</h1>
              <p className="text-muted-foreground text-sm">
                Are you sure you want to terminate your current session?
              </p>
            </div>

            <div className="glass rounded-lg p-4 border border-border/30 text-left">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>Your data will be securely preserved and synced upon return.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5" 
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 shadow-lg shadow-destructive/20" 
                onClick={() => router.push("/")}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
