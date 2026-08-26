"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import type { AppRole } from "@/lib/rbac"
import { sendExternalEmail } from "@/lib/email-delivery"
import { createInvitation } from "@/lib/invitations"

const MAX_INVITES_PER_CALL = 25

// UI role labels map onto the app's actual roles. Only USER and GUEST are
// available to a regular inviter; ADMIN requires the inviter to already be
// one, so this can't be used to self-escalate.
const ROLE_MAP: Record<string, AppRole> = {
  member: "USER",
  viewer: "GUEST",
  admin: "ADMIN",
}

export async function sendWorkspaceInvites({
  emails,
  role = "member",
  message,
}: {
  emails: string[]
  role?: string
  message?: string
}) {
  try {
    const session = await requireSession()

    const requestedRole = ROLE_MAP[role] ?? "USER"
    if (requestedRole === "ADMIN" && !hasPermission(session.role, "manage_users")) {
      return { success: false, error: "Only admins can invite someone as an admin." }
    }

    const validEmails = Array.from(
      new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"))),
    )
    if (validEmails.length === 0) {
      return { success: false, error: "Provide at least one valid email address." }
    }
    if (validEmails.length > MAX_INVITES_PER_CALL) {
      return { success: false, error: `Send at most ${MAX_INVITES_PER_CALL} invitations at a time.` }
    }

    const existingUsers = await prisma.user.findMany({
      where: { email: { in: validEmails } },
      select: { email: true },
    })
    const alreadyMembers = new Set(existingUsers.map((u) => u.email))
    const toInvite = validEmails.filter((email) => !alreadyMembers.has(email))

    const appUrl =
      process.env.AUTH_URL ??
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"

    const results = await Promise.allSettled(
      toInvite.map(async (email) => {
        // A fresh, single-use token per recipient — createInvitation replaces
        // any earlier pending invite for the same address.
        const token = await createInvitation({
          email,
          role: requestedRole,
          message,
          invitedById: session.id,
        })

        const acceptLink = `${appUrl}/invite/${token}`

        return sendExternalEmail({
          to: email,
          subject: `${session.name ?? session.email} invited you to join Spagad SRAD`,
          text: `You've been invited to join the Spagad SRAD workspace as a ${role}.\n\n${message ? `Message: ${message}\n\n` : ""}Accept your invitation here: ${acceptLink}\n\nThis link expires in 7 days.`,
          html: buildWorkspaceInviteHtml({
            inviterName: session.name ?? session.email,
            role,
            personalMessage: message ?? "",
            signupLink: acceptLink,
          }),
        })
      }),
    )

    const sent = results.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = toInvite.length - sent
    const skipped = validEmails.length - toInvite.length

    const parts: string[] = []
    if (sent > 0) parts.push(`Sent to ${sent} recipient${sent !== 1 ? "s" : ""}`)
    if (skipped > 0) parts.push(`${skipped} already ${skipped === 1 ? "has" : "have"} an account`)
    if (failed > 0) parts.push(`${failed} failed to send (email delivery may not be configured)`)

    return {
      success: sent > 0 || skipped > 0,
      sent,
      failed,
      skipped,
      message: parts.length ? `${parts.join(". ")}.` : "No invitations were sent.",
    }
  } catch (err) {
    console.error("Workspace invite error:", err)
    return { success: false, error: "Failed to send invitations." }
  }
}

// ─── Email HTML Builder ───────────────────────────────────────────────────────

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildWorkspaceInviteHtml({
  inviterName,
  role,
  personalMessage,
  signupLink,
}: {
  inviterName: string
  role: string
  personalMessage: string
  signupLink: string
}) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#09111f;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Logo/Brand -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#00d4ff20,#00d4ff10);border:1px solid rgba(0,212,255,0.3);border-radius:16px;padding:12px 24px;">
        <span style="font-size:18px;font-weight:800;color:#00d4ff;letter-spacing:0.05em;">SPAGAD</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:20px;overflow:hidden;">
      
      <!-- Hero Banner -->
      <div style="background:linear-gradient(135deg,#0a1628,#152240);padding:36px 32px;border-bottom:1px solid rgba(0,212,255,0.15);">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;color:#00d4ff;text-transform:uppercase;font-weight:600;">Team Invitation</p>
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#f8fafc;line-height:1.3;">
          You're invited to join<br>the workspace 🚀
        </h1>
        <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
          <strong style="color:#cbd5e1;">${esc(inviterName)}</strong> has invited you to collaborate on Spagad SRAD as a <strong style="color:#00d4ff;">${esc(roleLabel)}</strong>.
        </p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        ${personalMessage ? `
        <!-- Personal Message -->
        <div style="background:#1e2d4a;border-left:3px solid #00d4ff;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
          <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.1em;color:#00d4ff;text-transform:uppercase;font-weight:600;">Personal Message</p>
          <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;font-style:italic;">"${esc(personalMessage)}"</p>
        </div>` : ""}

        <!-- What you get -->
        <div style="margin-bottom:28px;">
          <p style="margin:0 0 14px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">With your invitation you'll get access to:</p>
          <div style="display:grid;gap:10px;">
            ${[
              ["📋", "Task & Kanban boards"],
              ["🤝", "Team collaboration & comments"],
              ["📊", "Analytics & sprint management"],
              ["🤖", "AI-powered productivity tools"],
            ]
              .map(
                ([icon, text]) => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#1a2a42;border:1px solid rgba(0,212,255,0.1);border-radius:10px;">
              <span style="font-size:18px;">${icon}</span>
              <span style="font-size:13px;color:#cbd5e1;">${text}</span>
            </div>`
              )
              .join("")}
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${signupLink}" style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099bb);color:#09111f;text-decoration:none;font-weight:800;font-size:15px;padding:14px 40px;border-radius:12px;letter-spacing:0.02em;">
            Accept Invitation →
          </a>
        </div>

        <p style="margin:0;font-size:11px;color:#475569;text-align:center;line-height:1.6;">
          Or copy this link: <a href="${signupLink}" style="color:#00d4ff;">${signupLink}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;background:#0d1829;border-top:1px solid rgba(0,212,255,0.1);">
        <p style="margin:0;font-size:11px;color:#334155;text-align:center;">
          This invitation was sent by ${esc(inviterName)} via Spagad SRAD Task Manager.
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
