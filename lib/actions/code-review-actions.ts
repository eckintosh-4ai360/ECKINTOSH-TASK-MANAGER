"use server"

import { requirePermission } from "@/lib/auth"
import { generateGroqJson } from "@/lib/ai/groq"

export type CodeReviewFinding = {
  severity: "high" | "medium" | "low"
  line: number | null
  title: string
  detail: string
  suggestedFix: string
}

export type CodeReviewResult = {
  summary: string
  risk: "high" | "medium" | "low"
  findings: CodeReviewFinding[]
  testSuggestions: string[]
  commitMessage: string
}

function lineOf(content: string, pattern: RegExp) {
  const lines = content.split(/\r?\n/)
  const index = lines.findIndex((line) => pattern.test(line))
  return index >= 0 ? index + 1 : null
}

function createFinding(
  severity: CodeReviewFinding["severity"],
  line: number | null,
  title: string,
  detail: string,
  suggestedFix: string,
): CodeReviewFinding {
  return { severity, line, title, detail, suggestedFix }
}

function fallbackReview(path: string, content: string): CodeReviewResult {
  const findings: CodeReviewFinding[] = []
  const isClientFile = /(^|\/)(components|app)\/.+\.(tsx|jsx)$/.test(path.replace(/\\/g, "/"))
  const isApiRoute = /(^|\/)app\/api\/.+route\.(ts|js)$/.test(path.replace(/\\/g, "/"))

  if (/\beval\s*\(/.test(content)) {
    findings.push(createFinding(
      "high",
      lineOf(content, /\beval\s*\(/),
      "Dynamic code execution",
      "eval can execute untrusted input and create security vulnerabilities.",
      "Replace eval with explicit parsing or a constrained interpreter for the exact data format.",
    ))
  }

  if (/dangerouslySetInnerHTML/.test(content)) {
    findings.push(createFinding(
      "high",
      lineOf(content, /dangerouslySetInnerHTML/),
      "Unsafe HTML rendering surface",
      "Rendering raw HTML can expose cross-site scripting if the source is not sanitized.",
      "Sanitize HTML before rendering and keep the accepted tag list narrow.",
    ))
  }

  if (isClientFile && /process\.env\.(?!NEXT_PUBLIC_)/.test(content)) {
    findings.push(createFinding(
      "high",
      lineOf(content, /process\.env\.(?!NEXT_PUBLIC_)/),
      "Server secret referenced in client code",
      "Client bundles can only safely access NEXT_PUBLIC_ variables. Other environment variables may leak or fail at runtime.",
      "Move the secret access into a Server Component, Route Handler, or Server Action.",
    ))
  }

  if (isApiRoute && !/(requireSession|requirePermission|auth\(|getSession)/.test(content)) {
    findings.push(createFinding(
      "medium",
      1,
      "API route has no visible auth gate",
      "This route may be callable without a session unless authentication happens elsewhere.",
      "Add requireSession or requirePermission near the top of each handler before reading or mutating data.",
    ))
  }

  if (/console\.(log|debug|trace)\(/.test(content)) {
    findings.push(createFinding(
      "low",
      lineOf(content, /console\.(log|debug|trace)\(/),
      "Debug logging left in code",
      "Debug logs can leak noisy implementation details in production.",
      "Remove the log or guard it behind a development-only check.",
    ))
  }

  if (/\bas any\b/.test(content)) {
    findings.push(createFinding(
      "medium",
      lineOf(content, /\bas any\b/),
      "Type safety bypass",
      "Using any hides invalid states from TypeScript and can let runtime bugs through.",
      "Replace the cast with a narrow union type, parser, or validation step.",
    ))
  }

  if (/TODO|FIXME/.test(content)) {
    findings.push(createFinding(
      "low",
      lineOf(content, /TODO|FIXME/),
      "Unresolved implementation note",
      "A TODO or FIXME marks work that may be incomplete.",
      "Convert the note into a task, finish it, or explain why the current behavior is acceptable.",
    ))
  }

  const risk = findings.some((finding) => finding.severity === "high")
    ? "high"
    : findings.some((finding) => finding.severity === "medium")
      ? "medium"
      : "low"

  return {
    summary: findings.length
      ? `Found ${findings.length} review signal${findings.length === 1 ? "" : "s"} in ${path}.`
      : `No obvious static review findings in ${path}.`,
    risk,
    findings,
    testSuggestions: [
      "Run the app build and lint checks.",
      "Exercise the changed flow in the browser.",
      "Add or update a focused regression test for the touched behavior.",
    ],
    commitMessage: `Review and harden ${path}`,
  }
}

function normalizeReview(review: CodeReviewResult, fallback: CodeReviewResult): CodeReviewResult {
  const severities = new Set(["high", "medium", "low"])

  return {
    summary: review.summary?.trim() || fallback.summary,
    risk: severities.has(review.risk) ? review.risk : fallback.risk,
    findings: Array.isArray(review.findings)
      ? review.findings.slice(0, 8).map((finding) => ({
          severity: severities.has(finding.severity) ? finding.severity : "medium",
          line: typeof finding.line === "number" && finding.line > 0 ? Math.round(finding.line) : null,
          title: finding.title?.trim() || "Review finding",
          detail: finding.detail?.trim() || "The AI reviewer found a possible issue.",
          suggestedFix: finding.suggestedFix?.trim() || "Review this area and apply the safest local fix.",
        }))
      : fallback.findings,
    testSuggestions: Array.isArray(review.testSuggestions) && review.testSuggestions.length
      ? review.testSuggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
      : fallback.testSuggestions,
    commitMessage: review.commitMessage?.trim() || fallback.commitMessage,
  }
}

export async function reviewRepositoryFileAction(input: {
  projectId: string
  path: string
  branch: string
  content: string
}): Promise<{ success: true; review: CodeReviewResult } | { success: false; error: string }> {
  await requirePermission("use_repository_workspace")

  const path = input.path.trim()
  const content = input.content

  if (!path || !content.trim()) {
    return { success: false, error: "Open a file with code before requesting review." }
  }

  const fallback = fallbackReview(path, content)
  const review = await generateGroqJson<CodeReviewResult>({
    fallback,
    maxTokens: 2200,
    system:
      "You are an expert code reviewer for a developer productivity platform. Return strict JSON only. Focus on real bugs, security issues, runtime failures, accessibility issues, data loss, and missing validation. Do not invent files or APIs not present in the code.",
    prompt: JSON.stringify({
      repositoryContext: {
        projectId: input.projectId,
        branch: input.branch,
        path,
      },
      reviewRules: [
        "Prefer high-signal findings over style opinions.",
        "Every finding should include a likely line number if possible.",
        "Suggested fixes should be concrete and implementable.",
        "If the file looks good, return an empty findings array and practical test suggestions.",
      ],
      expectedShape: {
        summary: "string",
        risk: "high | medium | low",
        findings: [
          {
            severity: "high | medium | low",
            line: "number | null",
            title: "string",
            detail: "string",
            suggestedFix: "string",
          },
        ],
        testSuggestions: ["string"],
        commitMessage: "string",
      },
      content: content.slice(0, 24_000),
    }),
  })

  return { success: true, review: normalizeReview(review, fallback) }
}
