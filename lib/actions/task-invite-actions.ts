"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sendExternalEmail } from "@/lib/email-delivery"
import { revalidatePath } from "next/cache"
import { validateInput, taskCommentSchema } from "@/lib/validation"

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getTaskComments(taskId: string) {
  try {
    await requireSession()
    return await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })
  } catch {
    return []
  }
}

export async function addTaskComment(taskId: string, content: string) {
  try {
    const session = await requireSession()

    const parsed = validateInput(taskCommentSchema, { taskId, content })
    if (!parsed.success) return { success: false, error: parsed.error }
    const trimmed = parsed.data.content

    const comment = await prisma.taskComment.create({
      data: { taskId, authorId: session.id, content: trimmed },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    // Notify task assignee if different from commenter
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, assigneeId: true, assignee: { select: { email: true, notificationPreference: { select: { emailEnabled: true } } } } },
    })

    if (task?.assigneeId && task.assigneeId !== session.id && task.assignee?.email) {
      const allowsEmail = task.assignee.notificationPreference?.emailEnabled ?? true
      if (allowsEmail) {
        await sendExternalEmail({
          to: task.assignee.email,
          subject: `New comment on "${task.title}"`,
          text: `${session.name ?? session.email} commented: "${trimmed}"`,
          html: buildCommentEmailHtml({
            taskTitle: task.title,
            commenterName: session.name ?? session.email,
            comment: trimmed,
          }),
        })
      }
    }

    revalidatePath("/tasks")
    return { success: true, comment }
  } catch (err) {
    console.error("Failed to add comment:", err)
    return { success: false, error: "Failed to add comment." }
  }
}

export async function deleteTaskComment(commentId: string) {
  try {
    const session = await requireSession()
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    })
    if (!comment) return { success: false, error: "Comment not found." }
    if (comment.authorId !== session.id && session.role !== "ADMIN") {
      return { success: false, error: "You can only delete your own comments." }
    }
    await prisma.taskComment.delete({ where: { id: commentId } })
    revalidatePath("/tasks")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete comment." }
  }
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function sendTaskCollaborationInvite({
  taskId,
  emails,
}: {
  taskId: string
  emails: string[]
}) {
  try {
    const session = await requireSession()
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, description: true, project: { select: { name: true } } },
    })

    if (!task) return { success: false, error: "Task not found." }

    const validEmails = emails.map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (validEmails.length === 0) return { success: false, error: "Provide at least one email." }

    const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const taskLink = `${appUrl}/tasks`

    const results = await Promise.allSettled(
      validEmails.map((email) =>
        sendExternalEmail({
          to: email,
          subject: `${session.name ?? session.email} invited you to collaborate on "${task.title}"`,
          text: `You've been invited to collaborate on a task.\n\nTask: ${task.title}\nProject: ${task.project?.name ?? "N/A"}\n\nView and comment here: ${taskLink}`,
          html: buildInviteEmailHtml({
            inviterName: session.name ?? session.email,
            taskTitle: task.title,
            projectName: task.project?.name ?? "N/A",
            description: task.description ?? "",
            taskLink,
          }),
        })
      )
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.length - sent

    return {
      success: true,
      message: failed > 0
        ? `Sent to ${sent} recipient${sent !== 1 ? "s" : ""}. ${failed} failed.`
        : `Invitation sent to ${sent} recipient${sent !== 1 ? "s" : ""}.`,
    }
  } catch (err) {
    console.error("Failed to send task invite:", err)
    return { success: false, error: "Failed to send invitations." }
  }
}

// ─── Email HTML Builders ──────────────────────────────────────────────────────

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function buildCommentEmailHtml({
  taskTitle,
  commenterName,
  comment,
}: {
  taskTitle: string
  commenterName: string
  comment: string
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#09111f;color:#f8fafc;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:28px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;color:#00d4ff;text-transform:uppercase;">Task Comment</p>
        <h1 style="margin:0 0 16px;font-size:20px;color:#f8fafc;">${esc(taskTitle)}</h1>
        <div style="background:#1e2d4a;border-left:3px solid #00d4ff;border-radius:8px;padding:16px;margin-bottom:16px;">
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">${esc(commenterName)} commented:</p>
          <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;">${esc(comment)}</p>
        </div>
        <p style="margin:0;font-size:12px;color:#64748b;">You received this because you are assigned to this task.</p>
      </div>
    </div>`
}

function buildInviteEmailHtml({
  inviterName,
  taskTitle,
  projectName,
  description,
  taskLink,
}: {
  inviterName: string
  taskTitle: string
  projectName: string
  description: string
  taskLink: string
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#09111f;color:#f8fafc;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:28px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;color:#00d4ff;text-transform:uppercase;">Spagad Task Collaboration</p>
        <h1 style="margin:0 0 8px;font-size:22px;color:#f8fafc;">You've been invited to collaborate</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">${esc(inviterName)} wants your input on a task.</p>
        <div style="background:#1e2d4a;border:1px solid rgba(0,212,255,0.15);border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:11px;color:#00d4ff;text-transform:uppercase;letter-spacing:0.08em;">Task</p>
          <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#f8fafc;">${esc(taskTitle)}</p>
          <p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Project</p>
          <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">${esc(projectName)}</p>
          ${description ? `<p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6;">${esc(description)}</p>` : ""}
        </div>
        <a href="${taskLink}" style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099bb);color:#09111f;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;">View Task &amp; Comment →</a>
        <p style="margin:20px 0 0;font-size:11px;color:#475569;">You may need to log in or create an account to leave comments.</p>
      </div>
    </div>`
}
