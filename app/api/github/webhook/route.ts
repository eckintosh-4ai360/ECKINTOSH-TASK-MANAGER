import crypto from "node:crypto"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"

export const runtime = "nodejs"

type GitHubPushEvent = {
  ref?: string
  after?: string
  deleted?: boolean
  pusher?: {
    name?: string
  }
  sender?: {
    login?: string
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

type SignatureResult = { ok: true } | { ok: false; reason: string; status: number }

// Fails CLOSED. An unsigned webhook fans notifications and email out to every
// user in the workspace, so an unconfigured secret must reject the request
// rather than wave it through.
function verifySignature(body: string, signatureHeader: string | null): SignatureResult {
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  if (!secret) {
    console.error("[github-webhook] Rejected: GITHUB_WEBHOOK_SECRET is not configured.")
    return { ok: false, reason: "Webhook delivery is not configured.", status: 503 }
  }

  if (!signatureHeader) {
    return { ok: false, reason: "Missing x-hub-signature-256 header.", status: 401 }
  }

  const digest = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`
  const expected = Buffer.from(digest)
  const actual = Buffer.from(signatureHeader)

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "Invalid webhook signature.", status: 401 }
  }

  return { ok: true }
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
      defaultBranch: true,
      project: {
        select: {
          name: true,
          ownerId: true,
        },
      },
    },
  })
}

/** Which environment (if any) a push to this branch represents. Feature
 * branches aren't deploys, so pushes to them don't create a Deployment row. */
function resolveDeploymentEnvironment(branchName: string, defaultBranch: string) {
  if (branchName === defaultBranch) return "production"
  if (["staging", "stage"].includes(branchName)) return "staging"
  if (["develop", "development", "dev"].includes(branchName)) return "development"
  return null
}

/** Best-effort match of the GitHub actor to a workspace user; falls back to
 * the project owner so the row always has a valid deployedById. */
async function resolveDeployedById(githubLogin: string | undefined, fallbackUserId: string) {
  if (githubLogin) {
    const match = await prisma.user.findFirst({ where: { githubLogin }, select: { id: true } })
    if (match) return match.id
  }
  return fallbackUserId
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  const event = request.headers.get("x-github-event")

  const signatureResult = verifySignature(body, signature)
  if (!signatureResult.ok) {
    return NextResponse.json({ error: signatureResult.reason }, { status: signatureResult.status })
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

      // Record a deployment for pushes to a recognized deploy branch. This is
      // a best-effort signal from source control, not a real CI/CD callback —
      // there's no pending/running phase, so it lands straight at its outcome.
      const environment = payload.deleted
        ? null
        : resolveDeploymentEnvironment(branchName, repository.defaultBranch)

      if (environment) {
        const deployedById = await resolveDeployedById(payload.sender?.login, repository.project.ownerId)
        const version = payload.after?.slice(0, 7) || payload.commits?.at(-1)?.id?.slice(0, 7) || "unknown"

        await prisma.deployment.create({
          data: {
            version,
            environment,
            status: "success",
            projectId: repository.projectId,
            deployedById,
            notes: headline,
          },
        })
      }
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
