import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { Button } from "@/components/ui/button"
import { ExportReportModal } from "@/components/modals/export-report-modal"
import { requirePermission } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { getAnalyticsData } from "@/lib/actions/analytics-actions"

export default async function AnalyticsPage() {
  const session = await requirePermission("view_analytics")
  const canExportReports = hasPermission(session.role, "export_reports")
  const analytics = await getAnalyticsData()

  return (
    <>
      <Header
        title="Analytics Hub"
        description="Track your performance and productivity metrics."
        actions={canExportReports ? (
          <ExportReportModal>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-10 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 glass border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-foreground"
            >
              Export Report
            </Button>
          </ExportReportModal>
        ) : undefined}
      />

      <div className="mt-6">
        {"error" in analytics ? (
          <div className="glass-card rounded-xl p-8 text-center border border-destructive/30">
            <p className="text-destructive font-mono text-sm">{analytics.error}</p>
          </div>
        ) : (
          <AnalyticsContent data={analytics} />
        )}
      </div>
    </>
  )
}
