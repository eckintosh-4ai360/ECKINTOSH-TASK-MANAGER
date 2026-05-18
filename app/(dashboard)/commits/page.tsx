import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { GitHubWorkspace } from "@/components/commits/github-workspace"
import { getGitHubWorkspaceData } from "@/lib/actions/github-actions"
import { requirePermission } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

type CommitsPageProps = {
  searchParams: Promise<{
    projectId?: string
    branch?: string
  }>
}

export default async function CommitsPage({ searchParams }: CommitsPageProps) {
  const session = await requirePermission("use_repository_workspace")
  const params = await searchParams
  const workspace = await getGitHubWorkspaceData(params.projectId, params.branch)
  const canMergePullRequests = hasPermission(session.role, "merge_pull_requests")

  return (
    <>
      <Header
        title="Code Ops"
        description="Track repositories, inspect activity, and push code changes from inside the workspace."
      />

      <div className="mt-6">
        <GitHubWorkspace
          initialData={workspace}
          canMergePullRequests={canMergePullRequests}
        />
      </div>
    </>
  )
}
