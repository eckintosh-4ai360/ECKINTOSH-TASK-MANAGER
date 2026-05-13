"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import { User, Bell, Palette, Shield, Camera, Mail, Lock } from "lucide-react"

export function SettingsContent() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Profile Information</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar className="w-20 h-20 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                <AvatarImage src="/profile.jpg" alt="Jessin Sam" />
                <AvatarFallback className="bg-primary/10 text-primary font-mono text-lg">JS</AvatarFallback>
              </Avatar>
              <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <div>
              <Button variant="outline" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-2 font-mono">JPG, PNG or GIF. Max 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" />
                Full Name
              </Label>
              <Input id="name" defaultValue="Jessin Sam" className="glass border-primary/20 focus:border-primary/50 h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Email
              </Label>
              <Input id="email" type="email" defaultValue="jessin@gmail.com" className="glass border-primary/20 focus:border-primary/50 h-11" />
            </div>
          </div>

          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
            Save Changes
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Notifications</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: "Email notifications", description: "Receive email about your account activity", icon: Mail },
            { label: "Push notifications", description: "Receive push notifications in your browser", icon: Bell },
            { label: "Task reminders", description: "Get reminded about upcoming task deadlines", icon: Shield },
            { label: "Team updates", description: "Notifications about team member activities", icon: User },
          ].map((item, index) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-4 rounded-lg glass border border-transparent hover:border-primary/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch 
                defaultChecked={index < 2} 
                className="data-[state=checked]:bg-primary"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg glass border border-transparent hover:border-primary/20 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Enable dark mode theme</p>
              </div>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center border border-destructive/30">
            <Lock className="w-4 h-4 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Danger Zone</h3>
        </div>
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
