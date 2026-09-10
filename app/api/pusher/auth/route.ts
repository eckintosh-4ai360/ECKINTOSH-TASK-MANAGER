import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getPusherServer, getWorkspacePresenceChannel } from "@/lib/pusher/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!session.workspaceId) return NextResponse.json({ error: "No active workspace." }, { status: 403 })

    const pusher = getPusherServer()
    if (!pusher) {
      return NextResponse.json({ error: "Pusher is not configured on the server." }, { status: 503 })
    }

    let socketId = ""
    let channelName = ""

    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const body = await request.json()
      socketId = body.socket_id
      channelName = body.channel_name
    } else {
      const formData = await request.formData()
      socketId = (formData.get("socket_id") as string) ?? ""
      channelName = (formData.get("channel_name") as string) ?? ""
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "socket_id and channel_name are required." }, { status: 400 })
    }

    const expectedPresenceChannel = getWorkspacePresenceChannel(session.workspaceId)
    if (channelName !== expectedPresenceChannel) {
      return NextResponse.json({ error: "Channel is outside the active workspace." }, { status: 403 })
    }

    // Authorize the active workspace presence channel only.
    if (channelName === expectedPresenceChannel) {
      const presenceData = {
        user_id: session.id,
        user_info: {
          name: session.name,
          email: session.email,
          role: session.role,
        },
      }
      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData)
      return NextResponse.json(authResponse)
    } else {
      const authResponse = pusher.authorizeChannel(socketId, channelName)
      return NextResponse.json(authResponse)
    }
  } catch (error) {
    console.error("[Pusher Auth] Error:", error)
    return NextResponse.json({ error: "Pusher authorization failed." }, { status: 500 })
  }
}
