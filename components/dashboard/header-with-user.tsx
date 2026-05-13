import { getSession } from "@/lib/auth"
import { Header } from "./header"
import type { ReactNode } from "react"

interface Props {
  title: string
  description: string
  actions?: ReactNode
}

// Server component wrapper — fetches the session and passes user to the client Header
export async function HeaderWithUser({ title, description, actions }: Props) {
  const session = await getSession()

  const user = session
    ? {
        id: session.id,
        name: session.name ?? "",
        email: session.email,
        role: session.role,
      }
    : undefined

  return (
    <Header
      title={title}
      description={description}
      actions={actions}
      user={user}
    />
  )
}
