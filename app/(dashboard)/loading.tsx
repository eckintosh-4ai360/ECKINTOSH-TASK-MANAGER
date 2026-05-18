function DashboardLoadingCard() {
  return (
    <div className="glass-card rounded-xl p-5 border border-primary/10">
      <div className="h-4 w-28 rounded bg-primary/10 animate-pulse" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded bg-primary/10 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-primary/10 animate-pulse" />
        <div className="h-24 rounded-xl bg-primary/5 animate-pulse" />
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:block fixed top-0 left-0 w-64 h-screen border-r border-primary/10 glass-card">
        <div className="px-4 pt-5 space-y-4">
          <div className="h-10 w-40 rounded-xl bg-primary/10 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-10 rounded-lg bg-primary/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-3 md:p-4 lg:p-6 lg:ml-64">
        <div className="space-y-6 animate-fade-in">
          <div className="space-y-3">
            <div className="h-10 max-w-md rounded-xl bg-primary/10 animate-pulse" />
            <div className="h-9 w-64 rounded-lg bg-primary/5 animate-pulse" />
            <div className="h-3 w-80 rounded bg-primary/10 animate-pulse" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardLoadingCard />
            <DashboardLoadingCard />
            <DashboardLoadingCard />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardLoadingCard />
            <DashboardLoadingCard />
          </div>
        </div>
      </main>
    </div>
  )
}
