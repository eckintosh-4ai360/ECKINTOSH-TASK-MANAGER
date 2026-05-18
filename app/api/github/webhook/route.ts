import crypto from "node:crypto"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"

export const runtime = "nodejs"

type GitHubPushEvent = {
  ref?: string
  pusher?: {
    name?: string
  }
  head_commit?: {
    message?: string
  } | null
  commits?: Array<{ id?: string }>
  repository?: {
    html_url?: string
    full_name?: string
  }
}

type GitHubPullRequestEvent = {
  action?: string
  repository?: {
    html_url?: string
    full_name?: string
  }
  pull_request?: {
    number?: number
    title?: string
    merged?: boolean
    user?: {
      login?: string
    }
    head?: {
      ref?: string
    }
    base?: {
      ref?: string
    }
  }
}

function verifySignature(body: string, signatureHeader: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) return true
  if (!signatureHeader) return false

  const digest = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`
  const expected = Buffer.from(digest)
  const actual = Buffer.from(signatureHeader)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function normalizeRepositoryUrl(url: string | undefined) {
  if (!url) return null
  const trimmed = url.trim().replace(/\.git$/, "").replace(/\/$/, "")
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)$/i)
  if (!match) return null
  return `https://github.com/${match[1]}/${match[2]}`
}

async function findProjectRepository(repositoryUrl: string | null) {
  if (!repositoryUrl) return null

  return prisma.repository.findFirst({
    where: {
      url: repositoryUrl,
    },
    select: {
      projectId: true,
      project: {
        select: {
          name: true,
          ownerId: true,
        },
      },
    },
  })
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  const event = request.headers.get("x-github-event")

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 })
  }

  try {
    if (event === "push") {
      const payload = JSON.parse(body) as GitHubPushEvent
      const repositoryUrl = normalizeRepositoryUrl(payload.repository?.html_url)
      const repository = await findProjectRepository(repositoryUrl)

      if (!repository) {
        return NextResponse.json({ ok: true, ignored: true })
      }

      const recipients = await getWorkspaceRecipientIds()
      const branchName = payload.ref?.split("/").pop() ?? "unknown branch"
      const authorName = payload.pusher?.name ?? "A developer"
      const commitCount = payload.commits?.length ?? 0
      const headline = payload.head_commit?.message?.split("\n")[0] ?? "New commit pushed"

      await createNotificationsForUsers({
        userIds: recipients,
        channel: "teamUpdates",
        title: "GitHub push received",
        message: `${authorName} pushed ${commitCount} commit${commitCount === 1 ? "" : "s"} to ${branchName} on ${repository.project.name}. ${headline}`,
        type: "info",
        link: `/commits?projectId=${repository.projectId}`,
        email: {
          senderId: repository.project.ownerId,
          subject: `GitHub push: ${repository.project.name}`,
        },
      })
    }

    if (event === "pull_request") {
      const payload = JSON.parse(body) as GitHubPullRequestEvent
      const repositoryUrl = normalizeRepositoryUrl(payload.repository?.html_url)
      const repository = await findProjectRepository(repositoryUrl)

      if (!repository) {
        return NextResponse.json({ ok: true, ignored: true })
      }

      const recipients = await getWorkspaceRecipientIds()
      const authorName = payload.pull_request?.user?.login ?? "A developer"
      const title = payload.pull_request?.title ?? "Pull request update"
      const action = payload.pull_request?.merged
        ? "merged"
        : payload.action ?? "updated"

      await createNotificationsForUsers({
        userIds: recipients,
        channel: "teamUpdates",
        title: payload.pull_request?.merged ? "Pull request merged" : "Pull request updated",
        message: `${authorName} ${action} PR #${payload.pull_request?.number ?? "?"} on ${repository.project.name}: ${title}`,
        type: payload.pull_request?.merged ? "success" : "info",
        link: `/commits?projectId=${repository.projectId}`,
        email: {
          senderId: repository.project.ownerId,
          subject: `GitHub pull request: ${repository.project.name}`,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[github-webhook] Failed to process webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}
