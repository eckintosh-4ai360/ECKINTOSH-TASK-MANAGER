"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { getPermissionError, hasPermission } from "@/lib/rbac"
import {
  canWriteToGitHub,
  createGitHubBranch,
  createGitHubPullRequest,
  getGitHubDirectory,
  getGitHubFile,
  getGitHubRepositoryMeta,
  isGitHubConfigured,
  listGitHubBranches,
  listGitHubCommits,
  listGitHubPullRequests,
  mergeGitHubPullRequest,
  parseGitHubRepositoryUrl,
  updateGitHubFile,
} from "@/lib/github"
import type {
  BranchItem,
  CommitStreamItem,
  DirectoryEntryItem,
  FileEditorState,
  GitHubWorkspaceData,
  PullRequestItem,
  RepositoryWorkspaceState,
  TrackedRepository,
} from "@/lib/github-workspace"

function normalizeRepositoryUrl(url: string) {
  const parsed = parseGitHubRepositoryUrl(url)
  if (!parsed) return null
  return `https://github.com/${parsed.owner}/${parsed.repo}`
}

function validateBranchName(branchName: string) {
  const name = branchName.trim()
  if (!name) return { success: false as const, error: "Enter a branch name." }
  if (name.length > 120) return { success: false as const, error: "Branch names must be 120 characters or fewer." }
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)
    || name.includes("..")
    || name.includes("//")
    || name.includes("@{")
    || name.endsWith("/")
    || name.endsWith(".")
    || name.endsWith(".lock")
  ) {
    return {
      success: false as const,
      error: "Use a valid Git branch name with letters, numbers, dots, dashes, underscores, or slashes.",
    }
  }

  return { success: true as const, name }
}

function mapTrackedRepository(project: {
  id: string
  name: string
  description: string | null
  repository: {
    id: string
    name: string
    url: string
    provider: string
    defaultBranch: string
  } | null
}): TrackedRepository | null {
  if (!project.repository) return null

  return {
    projectId: project.id,
    projectName: project.name,
    projectDescription: project.description,
    repositoryId: project.repository.id,
    repositoryName: project.repository.name,
    repositoryUrl: project.repository.url,
    defaultBranch: project.repository.defaultBranch,
    provider: project.repository.provider,
  }
}

async function getTrackedRepositories() {
  const projects = await prisma.project.findMany({
    where: {
      repository: {
        isNot: null,
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      repository: {
        select: {
          id: true,
          name: true,
          url: true,
          provider: true,
          defaultBranch: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return projects
    .map(mapTrackedRepository)
    .filter((repository): repository is TrackedRepository => Boolean(repository))
}

async function resolveTrackedRepository(projectId: string) {
  const repository = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      repository: {
        select: {
          id: true,
          name: true,
          url: true,
          provider: true,
          defaultBranch: true,
        },
      },
    },
  })

  if (!repository) {
    throw new Error("Project not found.")
  }

  const tracked = mapTrackedRepository(repository)
  if (!tracked) {
    throw new Error("This project does not have a connected repository yet.")
  }

  const parsed = parseGitHubRepositoryUrl(tracked.repositoryUrl)
  if (!parsed) {
    throw new Error("The connected repository URL is not a valid GitHub repository.")
  }

  return { tracked, parsed }
}

function mapCommit(
  commit: Awaited<ReturnType<typeof listGitHubCommits>>[number],
  branch: string,
  tracked: TrackedRepository,
): CommitStreamItem {
  return {
    id: commit.sha,
    message: commit.commit.message.split("\n")[0] ?? "Commit",
    authorName: commit.author?.login ?? commit.commit.author?.name ?? "Unknown",
    authorAvatarUrl: commit.author?.avatar_url ?? null,
    authorUrl: commit.author?.html_url ?? null,
    committedAt: commit.commit.author?.date ?? new Date().toISOString(),
    branch,
    commitUrl: commit.html_url,
    repositoryName: tracked.repositoryName,
    repositoryUrl: tracked.repositoryUrl,
    projectId: tracked.projectId,
    projectName: tracked.projectName,
  }
}

function mapPullRequest(
  pullRequest: Awaited<ReturnType<typeof listGitHubPullRequests>>[number],
): PullRequestItem {
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    state: pullRequest.state,
    draft: pullRequest.draft,
    mergeable: pullRequest.mergeable,
    mergeableState: pullRequest.mergeable_state ?? null,
    authorName: pullRequest.user.login,
    authorAvatarUrl: pullRequest.user.avatar_url,
    headBranch: pullRequest.head.ref,
    baseBranch: pullRequest.base.ref,
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
    pullRequestUrl: pullRequest.html_url,
  }
}

function mapBranch(branch: Awaited<ReturnType<typeof listGitHubBranches>>[number]): BranchItem {
  return {
    name: branch.name,
    protected: branch.protected,
    lastCommitSha: branch.commit.sha,
  }
}

function mapDirectoryEntry(
  entry: Awaited<ReturnType<typeof getGitHubDirectory>>[number],
): DirectoryEntryItem {
  return {
    name: entry.name,
    path: entry.path,
    sha: entry.sha,
    size: entry.size,
    type: entry.type,
    htmlUrl: entry.html_url,
  }
}

async function buildRepositoryWorkspaceState(
  tracked: TrackedRepository,
  branch?: string | null,
): Promise<RepositoryWorkspaceState> {
  const parsed = parseGitHubRepositoryUrl(tracked.repositoryUrl)
  if (!parsed) {
    throw new Error("The connected repository URL is not a valid GitHub repository.")
  }

  const selectedBranch = branch || tracked.defaultBranch
  const [meta, branches, commits, pullRequests, rootEntries] = await Promise.all([
    getGitHubRepositoryMeta(parsed.owner, parsed.repo),
    listGitHubBranches(parsed.owner, parsed.repo),
    listGitHubCommits(parsed.owner, parsed.repo, selectedBranch, 20),
    listGitHubPullRequests(parsed.owner, parsed.repo),
    getGitHubDirectory(parsed.owner, parsed.repo, "", selectedBranch),
  ])

  return {
    repository: {
      ...tracked,
      defaultBranch: meta.default_branch || tracked.defaultBranch,
    },
    repositoryDescription: meta.description,
    repositoryPrivate: meta.private,
    repositoryPushedAt: meta.pushed_at,
    branches: branches.map(mapBranch),
    commits: commits.map((commit) => mapCommit(commit, selectedBranch, tracked)),
    pullRequests: pullRequests.map(mapPullRequest),
    rootEntries: rootEntries.map(mapDirectoryEntry),
  }
}

async function buildActivityStream(repositories: TrackedRepository[]) {
  const recentRepositories = repositories.slice(0, 6)
  const activity = await Promise.all(
    recentRepositories.map(async (tracked) => {
      const parsed = parseGitHubRepositoryUrl(tracked.repositoryUrl)
      if (!parsed) return []

      try {
        const commits = await listGitHubCommits(parsed.owner, parsed.repo, tracked.defaultBranch, 6)
        return commits.map((commit) => mapCommit(commit, tracked.defaultBranch, tracked))
      } catch {
        return []
      }
    }),
  )

  return activity
    .flat()
    .sort((left, right) => new Date(right.committedAt).getTime() - new Date(left.committedAt).getTime())
    .slice(0, 30)
}

export async function syncProjectRepository(projectId: string, repositoryUrl?: string | null) {
  const trimmedUrl = repositoryUrl?.trim() ?? ""

  if (!trimmedUrl) {
    await prisma.repository.deleteMany({
      where: { projectId },
    })

    return {
      success: true,
      repository: null,
    }
  }

  const parsed = parseGitHubRepositoryUrl(trimmedUrl)
  if (!parsed) {
    return {
      success: false,
      error: "Please provide a valid GitHub repository URL.",
    }
  }

  let repositoryName = parsed.repo
  let defaultBranch = "main"
  let normalizedUrl = normalizeRepositoryUrl(trimmedUrl) ?? trimmedUrl

  try {
    const meta = await getGitHubRepositoryMeta(parsed.owner, parsed.repo)
    repositoryName = meta.name
    defaultBranch = meta.default_branch
    normalizedUrl = meta.html_url
  } catch {
    // If the repository is private or GitHub is not configured yet,
    // persist the parsed URL and allow the admin to finish setup later.
  }

  const repository = await prisma.repository.upsert({
    where: { projectId },
    update: {
      name: repositoryName,
      url: normalizedUrl,
      provider: "github",
      defaultBranch,
    },
    create: {
      name: repositoryName,
      url: normalizedUrl,
      provider: "github",
      defaultBranch,
      projectId,
    },
  })

  return {
    success: true,
    repository,
  }
}

export async function getGitHubWorkspaceData(
  projectId?: string | null,
  branch?: string | null,
): Promise<GitHubWorkspaceData> {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_repository_workspace")) {
    return {
      configured: isGitHubConfigured(),
      writeEnabled: false,
      repositories: [],
      selectedProjectId: null,
      selectedBranch: null,
      selectedRepository: null,
      activityStream: [],
      error: getPermissionError("use_repository_workspace"),
    }
  }

  const repositories = await getTrackedRepositories()
  if (repositories.length === 0) {
    return {
      configured: isGitHubConfigured(),
      writeEnabled: canWriteToGitHub() && hasPermission(session.role, "use_repository_workspace"),
      repositories: [],
      selectedProjectId: null,
      selectedBranch: null,
      selectedRepository: null,
      activityStream: [],
      error: "No GitHub repositories are connected yet. Add a GitHub URL to a project first.",
    }
  }

  const selected = repositories.find((repository) => repository.projectId === projectId) ?? repositories[0]

  try {
    const [selectedRepository, activityStream] = await Promise.all([
      buildRepositoryWorkspaceState(selected, branch),
      buildActivityStream(repositories),
    ])

    const selectedBranch = branch || selectedRepository.repository.defaultBranch

    return {
      configured: isGitHubConfigured(),
      writeEnabled: canWriteToGitHub() && hasPermission(session.role, "use_repository_workspace"),
      repositories,
      selectedProjectId: selected.projectId,
      selectedBranch,
      selectedRepository,
      activityStream,
      error: null,
    }
  } catch (error) {
    return {
      configured: isGitHubConfigured(),
      writeEnabled: canWriteToGitHub() && hasPermission(session.role, "use_repository_workspace"),
      repositories,
      selectedProjectId: selected.projectId,
      selectedBranch: branch || selected.defaultBranch,
      selectedRepository: null,
      activityStream: await buildActivityStream(repositories),
      error: error instanceof Error ? error.message : "GitHub workspace data could not be loaded.",
    }
  }
}

export async function getRepositoryDirectoryAction(projectId: string, path = "", branch?: string | null) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_repository_workspace")) {
    return { success: false, error: getPermissionError("use_repository_workspace") }
  }

  try {
    const { tracked, parsed } = await resolveTrackedRepository(projectId)
    const directory = await getGitHubDirectory(
      parsed.owner,
      parsed.repo,
      path,
      branch || tracked.defaultBranch,
    )

    return {
      success: true,
      entries: directory.map(mapDirectoryEntry),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load the repository directory.",
    }
  }
}

export async function getRepositoryFileAction(projectId: string, path: string, branch?: string | null) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_repository_workspace")) {
    return { success: false, error: getPermissionError("use_repository_workspace") }
  }

  try {
    const { tracked, parsed } = await resolveTrackedRepository(projectId)
    const file = await getGitHubFile(
      parsed.owner,
      parsed.repo,
      path,
      branch || tracked.defaultBranch,
    )

    const payload: FileEditorState = {
      path: file.path,
      sha: file.sha,
      size: file.size,
      htmlUrl: file.html_url,
      content: file.content,
    }

    return {
      success: true,
      file: payload,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not open that repository file.",
    }
  }
}

export async function saveRepositoryFileAction(input: {
  projectId: string
  path: string
  content: string
  message: string
  branch: string
  sha?: string
}) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_repository_workspace")) {
    return { success: false, error: getPermissionError("use_repository_workspace") }
  }

  if (!canWriteToGitHub()) {
    return { success: false, error: "GitHub write access is not configured yet." }
  }

  try {
    const { parsed } = await resolveTrackedRepository(input.projectId)
    const response = await updateGitHubFile({
      owner: parsed.owner,
      repo: parsed.repo,
      path: input.path,
      branch: input.branch,
      message: input.message.trim(),
      content: input.content,
      sha: input.sha,
      committer: {
        name: session.name ?? session.email,
        email: session.email,
      },
    })

    return {
      success: true,
      commit: response.commit,
      file: response.content,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save that file back to GitHub.",
    }
  }
}

export async function createRepositoryBranchAction(input: {
  projectId: string
  branchName: string
  sourceBranch?: string | null
}) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_repository_workspace")) {
    return { success: false, error: getPermissionError("use_repository_workspace") }
  }

  if (!canWriteToGitHub()) {
    return { success: false, error: "GitHub write access is not configured yet." }
  }

  const branchName = validateBranchName(input.branchName)
  if (!branchName.success) {
    return { success: false, error: branchName.error }
  }

  try {
    const { tracked, parsed } = await resolveTrackedRepository(input.projectId)
    const sourceBranch = input.sourceBranch || tracked.defaultBranch
    const branches = await listGitHubBranches(parsed.owner, parsed.repo)
    const source = branches.find((branch) => branch.name === sourceBranch)
    if (!source) {
      return { success: false, error: `Source branch "${sourceBranch}" was not found.` }
    }

    const existing = branches.find((branch) => branch.name === branchName.name)
    if (existing) {
      return { success: false, error: `Branch "${branchName.name}" already exists.` }
    }

    await createGitHubBranch({
      owner: parsed.owner,
      repo: parsed.repo,
      branch: branchName.name,
      sha: source.commit.sha,
    })

    revalidatePath("/commits")

    return {
      success: true,
      branch: {
        name: branchName.name,
        protected: false,
        lastCommitSha: source.commit.sha,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not create the GitHub branch.",
    }
  }
}

export async function createRepositoryPullRequestAction(input: {
  projectId: string
  title: string
  headBranch: string
  baseBranch: string
  body?: string
}) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_repository_workspace")) {
    return { success: false, error: getPermissionError("use_repository_workspace") }
  }

  if (!canWriteToGitHub()) {
    return { success: false, error: "GitHub write access is not configured yet." }
  }

  try {
    const { parsed } = await resolveTrackedRepository(input.projectId)
    const pullRequest = await createGitHubPullRequest({
      owner: parsed.owner,
      repo: parsed.repo,
      title: input.title.trim(),
      head: input.headBranch,
      base: input.baseBranch,
      body: input.body?.trim() || undefined,
    })

    return {
      success: true,
      pullRequest: mapPullRequest(pullRequest),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not create the pull request.",
    }
  }
}

export async function mergeRepositoryPullRequestAction(input: {
  projectId: string
  pullNumber: number
  mergeMethod?: "merge" | "squash" | "rebase"
}) {
  const session = await requireSession()
  if (!hasPermission(session.role, "merge_pull_requests")) {
    return { success: false, error: getPermissionError("merge_pull_requests") }
  }

  if (!canWriteToGitHub()) {
    return { success: false, error: "GitHub write access is not configured yet." }
  }

  try {
    const { parsed } = await resolveTrackedRepository(input.projectId)
    const mergeResult = await mergeGitHubPullRequest({
      owner: parsed.owner,
      repo: parsed.repo,
      pullNumber: input.pullNumber,
      mergeMethod: input.mergeMethod,
      commitTitle: `Merge pull request #${input.pullNumber}`,
    })

    return {
      success: true,
      mergeResult,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not merge the pull request.",
    }
  }
}
