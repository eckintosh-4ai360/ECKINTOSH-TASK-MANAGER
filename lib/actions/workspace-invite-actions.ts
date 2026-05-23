"use server"

import { requireSession } from "@/lib/auth"
import { sendExternalEmail } from "@/lib/email-delivery"

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

    const validEmails = emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"))
    if (validEmails.length === 0) {
      return { success: false, error: "Provide at least one valid email address." }
    }

    const appUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"

    const signupLink = `${appUrl}/login`

    const results = await Promise.allSettled(
      validEmails.map((email) =>
        sendExternalEmail({
          to: email,
          subject: `${session.name ?? session.email} invited you to join Eckintosh`,
          text: `You've been invited to join the Eckintosh workspace as a ${role}.\n\n${message ? `Message: ${message}\n\n` : ""}Get started here: ${signupLink}`,
          html: buildWorkspaceInviteHtml({
            inviterName: session.name ?? session.email,
            role,
            personalMessage: message ?? "",
            signupLink,
          }),
        })
      )
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.length - sent

    return {
      success: true,
      sent,
      failed,
      message:
        failed > 0
          ? `Sent to ${sent} recipient${sent !== 1 ? "s" : ""}. ${failed} failed (email provider may not be configured).`
          : `Invitation sent to ${sent} recipient${sent !== 1 ? "s" : ""}!`,
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
        <span style="font-size:18px;font-weight:800;color:#00d4ff;letter-spacing:0.05em;">ECKINTOSH</span>
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
          <strong style="color:#cbd5e1;">${esc(inviterName)}</strong> has invited you to collaborate on Eckintosh as a <strong style="color:#00d4ff;">${esc(roleLabel)}</strong>.
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
          This invitation was sent by ${esc(inviterName)} via Eckintosh Task Manager.
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
