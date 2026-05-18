export type TrackedRepository = {
  projectId: string
  projectName: string
  projectDescription: string | null
  repositoryId: string
  repositoryName: string
  repositoryUrl: string
  defaultBranch: string
  provider: string
}

export type CommitStreamItem = {
  id: string
  message: string
  authorName: string
  authorAvatarUrl: string | null
  authorUrl: string | null
  committedAt: string
  branch: string
  commitUrl: string
  repositoryName: string
  repositoryUrl: string
  projectId: string
  projectName: string
}

export type PullRequestItem = {
  number: number
  title: string
  state: string
  draft: boolean
  mergeable: boolean | null
  mergeableState: string | null
  authorName: string
  authorAvatarUrl: string | null
  headBranch: string
  baseBranch: string
  createdAt: string
  updatedAt: string
  pullRequestUrl: string
}

export type BranchItem = {
  name: string
  protected: boolean
  lastCommitSha: string
}

export type DirectoryEntryItem = {
  name: string
  path: string
  sha: string
  size: number
  type: "file" | "dir" | "submodule" | "symlink"
  htmlUrl: string | null
}

export type FileEditorState = {
  path: string
  sha: string
  size: number
  htmlUrl: string | null
  content: string
}

export type RepositoryWorkspaceState = {
  repository: TrackedRepository
  repositoryDescription: string | null
  repositoryPrivate: boolean
  repositoryPushedAt: string
  branches: BranchItem[]
  commits: CommitStreamItem[]
  pullRequests: PullRequestItem[]
  rootEntries: DirectoryEntryItem[]
}

export type GitHubWorkspaceData = {
  configured: boolean
  writeEnabled: boolean
  repositories: TrackedRepository[]
  selectedProjectId: string | null
  selectedBranch: string | null
  selectedRepository: RepositoryWorkspaceState | null
  activityStream: CommitStreamItem[]
  error: string | null
}
