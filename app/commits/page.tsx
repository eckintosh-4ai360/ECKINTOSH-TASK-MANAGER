import { SidebarWithUser as Sidebar } from "@/components/dashboard/sidebar-with-user"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { Badge } from "@/components/ui/badge"
import { GitBranch, GitCommit, UserRound } from "lucide-react"

const commits = [
  { id: "a91c2f4", author: "Eckintosh", project: "DevFlow Platform", message: "Wire sprint creation to dashboard metrics", time: "09:18", branch: "main" },
  { id: "d74ab28", author: "Jay", project: "E-Commerce API", message: "Tighten checkout webhook validation", time: "10:05", branch: "feature/payments" },
  { id: "9be03ac", author: "Kemi", project: "Mobile App v2", message: "Add auth flow state handling", time: "11:42", branch: "mobile/auth" },
  { id: "6f0d11b", author: "Tunde", project: "DevFlow Platform", message: "Polish task board empty states", time: "13:07", branch: "ui/task-board" },
]

export default function CommitsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Commits Today"
          description="Track the team's code activity across active repositories."
        />

        <div className="mt-6 glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Commit Stream</h2>
              <p className="text-xs text-muted-foreground">{commits.length} highlighted commits today</p>
            </div>
          </div>

          <div className="grid gap-3">
            {commits.map((commit) => (
              <div key={commit.id} className="rounded-xl border border-border/50 bg-background/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GitCommit className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground">{commit.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserRound className="w-3 h-3" />
                        {commit.author}
                      </span>
                      <span>/</span>
                      <span>{commit.project}</span>
                      <span>/</span>
                      <span className="font-mono">{commit.time}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="glass border-border/40 font-mono text-[10px]">
                      {commit.branch}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary border border-primary/25 font-mono text-[10px]">
                      {commit.id}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
