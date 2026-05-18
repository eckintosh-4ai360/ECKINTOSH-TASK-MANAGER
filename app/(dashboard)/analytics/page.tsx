import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { Button } from "@/components/ui/button"
import { ExportReportModal } from "@/components/modals/export-report-modal"
import { requirePermission } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function AnalyticsPage() {
  const session = await requirePermission("view_analytics")
  const canExportReports = hasPermission(session.role, "export_reports")

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
        <AnalyticsContent />
      </div>
    </>
  )
}
