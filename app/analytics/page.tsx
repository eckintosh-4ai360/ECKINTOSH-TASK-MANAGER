import { Sidebar } from "@/components/dashboard/sidebar"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { Button } from "@/components/ui/button"
import { ExportReportModal } from "@/components/modals/export-report-modal"

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Analytics Hub"
          description="Track your performance and productivity metrics."
          actions={
            <ExportReportModal>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-10 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 glass border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-foreground"
              >
                Export Report
              </Button>
            </ExportReportModal>
          }
        />

        <div className="mt-6">
          <AnalyticsContent />
        </div>
      </main>
    </div>
  )
}
