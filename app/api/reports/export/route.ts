import { NextResponse, type NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"

type ExportFormat = "pdf" | "xlsx" | "json"
type DateRange = "week" | "month" | "quarter" | "year" | "all"

type ExportConfig = {
  format: ExportFormat
  dateRange: DateRange
  includeProjects: boolean
  includeTasks: boolean
  includeTeam: boolean
  includeAnalytics: boolean
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last 3 months",
  year: "Last 12 months",
  all: "All time",
}

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: "pdf",
  xlsx: "xls",
  json: "json",
}

function parseConfig(value: unknown): ExportConfig | null {
  if (!value || typeof value !== "object") return null

  const config = value as Partial<ExportConfig>
  const validFormats: ExportFormat[] = ["pdf", "xlsx", "json"]
  const validRanges: DateRange[] = ["week", "month", "quarter", "year", "all"]

  if (!config.format || !validFormats.includes(config.format)) return null
  if (!config.dateRange || !validRanges.includes(config.dateRange)) return null

  return {
    format: config.format,
    dateRange: config.dateRange,
    includeProjects: config.includeProjects === true,
    includeTasks: config.includeTasks === true,
    includeTeam: config.includeTeam === true,
    includeAnalytics: config.includeAnalytics === true,
  }
}

function getDateFilter(dateRange: DateRange) {
  if (dateRange === "all") return undefined

  const date = new Date()
  const daysByRange: Record<Exclude<DateRange, "all">, number> = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  }

  date.setDate(date.getDate() - daysByRange[dateRange])
  return date
}

function formatDate(value: Date | null | undefined) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escapePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function wrapLine(line: string, width = 92) {
  const words = line.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }

    if (`${current} ${word}`.length > width) {
      lines.push(current)
      current = word
      continue
    }

    current = `${current} ${word}`
  }

  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

async function getReportData(config: ExportConfig, user: { id: string; email: string; name: string }) {
  const fromDate = getDateFilter(config.dateRange)
  const dateWhere = fromDate ? { gte: fromDate } : undefined

  const [projects, tasks, users, standups, deployments, activeSprints] = await Promise.all([
    config.includeProjects || config.includeAnalytics
      ? prisma.project.findMany({
          where: dateWhere ? { createdAt: dateWhere } : undefined,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            priority: true,
            progress: true,
            color: true,
            tech: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            owner: { select: { name: true, email: true } },
            _count: { select: { tasks: true, members: true } },
          },
        })
      : Promise.resolve([]),
    config.includeTasks || config.includeAnalytics
      ? prisma.task.findMany({
          where: dateWhere ? { createdAt: dateWhere } : undefined,
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            project: { select: { name: true } },
            assignee: { select: { name: true, email: true } },
          },
        })
      : Promise.resolve([]),
    config.includeTeam || config.includeAnalytics
      ? prisma.user.findMany({
          where: dateWhere ? { createdAt: dateWhere } : undefined,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            title: true,
            timezone: true,
            createdAt: true,
            _count: { select: { tasks: true, projectMembers: true, standups: true } },
          },
        })
      : Promise.resolve([]),
    config.includeTeam
      ? prisma.standup.findMany({
          where: dateWhere ? { date: dateWhere } : undefined,
          orderBy: { date: "desc" },
          take: 25,
          select: {
            id: true,
            didYesterday: true,
            doingToday: true,
            blockers: true,
            mood: true,
            date: true,
            user: { select: { name: true, email: true } },
            project: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    config.includeAnalytics
      ? prisma.deployment.findMany({
          where: dateWhere ? { deployedAt: dateWhere } : undefined,
          orderBy: { deployedAt: "desc" },
          take: 50,
          select: {
            version: true,
            environment: true,
            status: true,
            deployedAt: true,
            project: { select: { name: true } },
            deployedBy: { select: { name: true, email: true } },
          },
        })
      : Promise.resolve([]),
    config.includeAnalytics
      ? prisma.sprint.count({
          where: {
            status: "ACTIVE",
            ...(dateWhere ? { createdAt: dateWhere } : {}),
          },
        })
      : Promise.resolve(0),
  ])

  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length
  const activeProjects = projects.filter((project) => project.status === "active").length
  const overdueTasks = tasks.filter((task) => task.dueDate && task.dueDate < new Date() && task.status !== "COMPLETED").length
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0

  return {
    metadata: {
      title: "Eckintosh Workspace Report",
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      dateRange: {
        key: config.dateRange,
        label: DATE_RANGE_LABELS[config.dateRange],
        from: fromDate?.toISOString() ?? null,
        to: new Date().toISOString(),
      },
      sections: {
        projects: config.includeProjects,
        tasks: config.includeTasks,
        team: config.includeTeam,
        analytics: config.includeAnalytics,
      },
    },
    summary: {
      projects: projects.length,
      activeProjects,
      tasks: tasks.length,
      completedTasks,
      overdueTasks,
      completionRate,
      teamMembers: users.length,
      activeSprints,
      deployments: deployments.length,
    },
    projects,
    tasks,
    team: {
      users,
      standups,
    },
    analytics: {
      activeSprints,
      deployments,
      statusBreakdown: tasks.reduce<Record<string, number>>((acc, task) => {
        acc[task.status] = (acc[task.status] ?? 0) + 1
        return acc
      }, {}),
      priorityBreakdown: tasks.reduce<Record<string, number>>((acc, task) => {
        acc[task.priority] = (acc[task.priority] ?? 0) + 1
        return acc
      }, {}),
      projectStatusBreakdown: projects.reduce<Record<string, number>>((acc, project) => {
        acc[project.status] = (acc[project.status] ?? 0) + 1
        return acc
      }, {}),
    },
  }
}

type ReportData = Awaited<ReturnType<typeof getReportData>>

function getProjectRows(data: ReportData) {
  return data.projects.map((project) => [
    project.name,
    project.status,
    project.priority,
    `${project.progress}%`,
    project.owner.name ?? project.owner.email,
    project._count.tasks,
    project._count.members,
    formatDate(project.endDate),
  ])
}

function getTaskRows(data: ReportData) {
  return data.tasks.map((task) => [
    task.title,
    task.status.replace("_", " "),
    task.priority,
    task.project.name,
    task.assignee?.name ?? task.assignee?.email ?? "Unassigned",
    formatDate(task.dueDate),
  ])
}

function getTeamRows(data: ReportData) {
  return data.team.users.map((user) => [
    user.name ?? user.email,
    user.email,
    user.role,
    user.title ?? "",
    user.timezone ?? "",
    user._count.tasks,
    user._count.projectMembers,
    user._count.standups,
  ])
}

function buildJson(data: ReportData) {
  return JSON.stringify(data, null, 2)
}

function buildExcel(data: ReportData, config: ExportConfig) {
  const sheets: Array<{ name: string; rows: Array<Array<string | number>> }> = [
    {
      name: "Summary",
      rows: [
        ["Metric", "Value"],
        ["Generated At", new Date(data.metadata.generatedAt).toLocaleString()],
        ["Generated By", `${data.metadata.generatedBy.name} <${data.metadata.generatedBy.email}>`],
        ["Date Range", data.metadata.dateRange.label],
        ["Projects", data.summary.projects],
        ["Active Projects", data.summary.activeProjects],
        ["Tasks", data.summary.tasks],
        ["Completed Tasks", data.summary.completedTasks],
        ["Overdue Tasks", data.summary.overdueTasks],
        ["Completion Rate", `${data.summary.completionRate}%`],
        ["Team Members", data.summary.teamMembers],
        ["Active Sprints", data.summary.activeSprints],
        ["Deployments", data.summary.deployments],
      ],
    },
  ]

  if (config.includeProjects) {
    sheets.push({
      name: "Projects",
      rows: [["Name", "Status", "Priority", "Progress", "Owner", "Tasks", "Members", "Due Date"], ...getProjectRows(data)],
    })
  }

  if (config.includeTasks) {
    sheets.push({
      name: "Tasks",
      rows: [["Title", "Status", "Priority", "Project", "Assignee", "Due Date"], ...getTaskRows(data)],
    })
  }

  if (config.includeTeam) {
    sheets.push({
      name: "Team",
      rows: [["Name", "Email", "Role", "Title", "Timezone", "Tasks", "Projects", "Standups"], ...getTeamRows(data)],
    })
    sheets.push({
      name: "Standups",
      rows: [
        ["Date", "User", "Project", "Did Yesterday", "Doing Today", "Blockers", "Mood"],
        ...data.team.standups.map((standup) => [
          formatDate(standup.date),
          standup.user.name ?? standup.user.email,
          standup.project?.name ?? "",
          standup.didYesterday,
          standup.doingToday,
          standup.blockers ?? "",
          standup.mood,
        ]),
      ],
    })
  }

  if (config.includeAnalytics) {
    sheets.push({
      name: "Analytics",
      rows: [
        ["Category", "Name", "Value"],
        ...Object.entries(data.analytics.statusBreakdown).map(([name, value]) => ["Task Status", name, value]),
        ...Object.entries(data.analytics.priorityBreakdown).map(([name, value]) => ["Task Priority", name, value]),
        ...Object.entries(data.analytics.projectStatusBreakdown).map(([name, value]) => ["Project Status", name, value]),
      ],
    })
    sheets.push({
      name: "Deployments",
      rows: [
        ["Date", "Project", "Version", "Environment", "Status", "Deployed By"],
        ...data.analytics.deployments.map((deployment) => [
          formatDate(deployment.deployedAt),
          deployment.project.name,
          deployment.version,
          deployment.environment,
          deployment.status,
          deployment.deployedBy.name ?? deployment.deployedBy.email,
        ]),
      ],
    })
  }

  const worksheets = sheets
    .map((sheet) => {
      const rows = sheet.rows
        .map((row) => {
          const cells = row
            .map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escapeXml(cell)}</Data></Cell>`)
            .join("")
          return `<Row>${cells}</Row>`
        })
        .join("")

      return `<Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31))}"><Table>${rows}</Table></Worksheet>`
    })
    .join("")

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheets}
</Workbook>`
}

function buildPdf(data: ReportData, config: ExportConfig) {
  const lines: string[] = [
    data.metadata.title,
    `Generated: ${new Date(data.metadata.generatedAt).toLocaleString()}`,
    `Generated by: ${data.metadata.generatedBy.name} <${data.metadata.generatedBy.email}>`,
    `Date range: ${data.metadata.dateRange.label}`,
    "",
    "Summary",
    `Projects: ${data.summary.projects}`,
    `Active projects: ${data.summary.activeProjects}`,
    `Tasks: ${data.summary.tasks}`,
    `Completed tasks: ${data.summary.completedTasks}`,
    `Overdue tasks: ${data.summary.overdueTasks}`,
    `Completion rate: ${data.summary.completionRate}%`,
    `Team members: ${data.summary.teamMembers}`,
    `Active sprints: ${data.summary.activeSprints}`,
    `Deployments: ${data.summary.deployments}`,
  ]

  if (config.includeProjects) {
    lines.push("", "Projects Overview")
    getProjectRows(data).forEach((row) => {
      lines.push(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | owner: ${row[4]} | tasks: ${row[5]}`)
    })
  }

  if (config.includeTasks) {
    lines.push("", "Tasks Summary")
    getTaskRows(data).forEach((row) => {
      lines.push(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | due: ${row[5] || "No due date"}`)
    })
  }

  if (config.includeTeam) {
    lines.push("", "Team Activity")
    getTeamRows(data).forEach((row) => {
      lines.push(`${row[0]} | ${row[2]} | ${row[3]} | tasks: ${row[5]} | standups: ${row[7]}`)
    })
    data.team.standups.slice(0, 12).forEach((standup) => {
      lines.push(`Standup ${formatDate(standup.date)} - ${standup.user.name ?? standup.user.email}: ${standup.doingToday}`)
    })
  }

  if (config.includeAnalytics) {
    lines.push("", "Analytics Data")
    Object.entries(data.analytics.statusBreakdown).forEach(([status, count]) => lines.push(`Task status ${status}: ${count}`))
    Object.entries(data.analytics.priorityBreakdown).forEach(([priority, count]) => lines.push(`Task priority ${priority}: ${count}`))
    Object.entries(data.analytics.projectStatusBreakdown).forEach(([status, count]) => lines.push(`Project status ${status}: ${count}`))
  }

  const wrappedLines = lines.flatMap((line) => wrapLine(line))
  const pages: string[][] = []
  for (let index = 0; index < wrappedLines.length; index += 42) {
    pages.push(wrappedLines.slice(index, index + 42))
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  const pageIds: number[] = []

  pages.forEach((pageLines) => {
    const stream = [
      "BT",
      "/F1 11 Tf",
      "50 780 Td",
      "15 TL",
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      "ET",
    ].join("\n")

    const contentId = objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`)
    const pageId = objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  })

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, "utf8")
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, "utf8")
}

function getHeaders(format: ExportFormat, filename: string) {
  const contentTypes: Record<ExportFormat, string> = {
    pdf: "application/pdf",
    xlsx: "application/vnd.ms-excel; charset=utf-8",
    json: "application/json; charset=utf-8",
  }

  return {
    "Content-Type": contentTypes[format],
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let config: ExportConfig | null = null

  try {
    config = parseConfig(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid export request." }, { status: 400 })
  }

  if (!config) {
    return NextResponse.json({ error: "Choose a valid format and date range." }, { status: 400 })
  }

  const hasSection = config.includeProjects || config.includeTasks || config.includeTeam || config.includeAnalytics
  if (!hasSection) {
    return NextResponse.json({ error: "Select at least one report section." }, { status: 400 })
  }

  try {
    const data = await getReportData(config, {
      id: session.id,
      name: session.name,
      email: session.email,
    })
    const generatedDate = new Date().toISOString().slice(0, 10)
    const baseName = `eckintosh-${slugify(config.dateRange)}-report-${generatedDate}`
    const filename = `${baseName}.${FORMAT_EXTENSIONS[config.format]}`

    if (config.format === "json") {
      return new Response(buildJson(data), {
        headers: getHeaders(config.format, filename),
      })
    }

    if (config.format === "xlsx") {
      return new Response(buildExcel(data, config), {
        headers: getHeaders(config.format, filename),
      })
    }

    return new Response(buildPdf(data, config), {
      headers: getHeaders(config.format, filename),
    })
  } catch (error) {
    console.error("[export-report] Failed to generate report:", error)
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 })
  }
}
