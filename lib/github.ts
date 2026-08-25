import { Buffer } from "node:buffer"

export type ParsedGitHubRepository = {
  owner: string
  repo: string
}

export type GitHubRepositoryMeta = {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  private: boolean
  default_branch: string
  pushed_at: string
  open_issues_count: number
  stargazers_count: number
}

export type GitHubBranch = {
  name: string
  protected: boolean
  commit: {
    sha: string
  }
}

export type GitHubCommit = {
  sha: string
  html_url: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    } | null
  }
  author: {
    login: string
    avatar_url: string
    html_url: string
  } | null
}

export type GitHubPullRequest = {
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  draft: boolean
  mergeable: boolean | null
  mergeable_state?: string | null
  created_at: string
  updated_at: string
  user: {
    login: string
    avatar_url: string
    html_url: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
  }
}

export type GitHubDirectoryEntry = {
  name: string
  path: string
  sha: string
  size: number
  type: "file" | "dir" | "submodule" | "symlink"
  html_url: string | null
  download_url: string | null
}

export type GitHubFileContent = {
  name: string
  path: string
  sha: string
  size: number
  html_url: string | null
  download_url: string | null
  content: string
  encoding: string
}

import { getSharedGitHubToken, sharedWriteTokenEnabled } from "@/lib/github-identity"

type GitHubRequestInit = RequestInit & {
  tokenRequired?: boolean
  /**
   * Credentials for this specific call. Write operations must always pass the
   * acting user's token so commits, branches, and merges are attributed to the
   * person who made them (see lib/github-identity.ts).
   */
  token?: string | null
}

function getGitHubToken() {
  return getSharedGitHubToken()
}

export function isGitHubConfigured() {
  return Boolean(getSharedGitHubToken())
}

/**
 * Whether the shared machine-account token may be used as a write fallback.
 * Off unless GITHUB_ALLOW_SHARED_WRITE_TOKEN=true — otherwise writes require
 * the acting user's own connection. Mirrors resolveWriteToken()'s fallback.
 */
export function canWriteToGitHub() {
  return sharedWriteTokenEnabled() && Boolean(getSharedGitHubToken())
}

export function parseGitHubRepositoryUrl(url: string): ParsedGitHubRepository | null {
  const trimmed = url.trim()
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/.*)?$/i)
  if (!match) return null

  return {
    owner: match[1],
    repo: match[2],
  }
}

function buildGitHubHeaders(init?: GitHubRequestInit) {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/vnd.github+json")
  headers.set("X-GitHub-Api-Version", "2022-11-28")

  // An explicitly supplied token always wins; the shared token is only a
  // fallback for reads.
  const token = init?.token ?? (init?.tokenRequired ? null : getGitHubToken())

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  } else if (init?.tokenRequired) {
    throw new Error("No GitHub credentials were supplied for this write operation.")
  }

  return headers
}

async function githubRequest<T>(path: string, init?: GitHubRequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: buildGitHubHeaders(init),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API request failed (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

export async function getGitHubRepositoryMeta(
  owner: string,
  repo: string,
) {
  return githubRequest<GitHubRepositoryMeta>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
}

export async function listGitHubBranches(
  owner: string,
  repo: string,
) {
  return githubRequest<GitHubBranch[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
  )
}

export async function listGitHubCommits(
  owner: string,
  repo: string,
  branch?: string,
  perPage = 15,
) {
  const search = new URLSearchParams({
    per_page: String(perPage),
  })
  if (branch) search.set("sha", branch)

  return githubRequest<GitHubCommit[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${search.toString()}`,
  )
}

export async function listGitHubPullRequests(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
) {
  const search = new URLSearchParams({
    state,
    per_page: "20",
  })

  return githubRequest<GitHubPullRequest[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${search.toString()}`,
  )
}

export async function getGitHubDirectory(
  owner: string,
  repo: string,
  path = "",
  ref?: string,
) {
  const safePath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : ""

  return githubRequest<GitHubDirectoryEntry[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${safePath ? `/${safePath}` : ""}${query}`,
  )
}

export async function getGitHubFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
) {
  const safePath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : ""

  const file = await githubRequest<GitHubFileContent>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${safePath}${query}`,
  )

  const content = file.encoding === "base64"
    ? Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8")
    : file.content

  return {
    ...file,
    content,
  }
}

export async function updateGitHubFile(params: {
  owner: string
  repo: string
  path: string
  branch: string
  message: string
  content: string
  sha?: string
  committer?: {
    name: string
    email: string
  }
  /** The acting user's OAuth token. */
  token: string
}) {
  const safePath = params.path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return githubRequest<{
    content: {
      sha: string
      html_url: string
      path: string
    }
    commit: {
      sha: string
      html_url: string
      message: string
    }
  }>(
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/contents/${safePath}`,
    {
      method: "PUT",
      tokenRequired: true,
      token: params.token,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: params.message,
        content: Buffer.from(params.content, "utf8").toString("base64"),
        sha: params.sha,
        branch: params.branch,
        committer: params.committer,
      }),
    },
  )
}

export async function createGitHubBranch(params: {
  owner: string
  repo: string
  branch: string
  sha: string
  /** The acting user's OAuth token. */
  token: string
}) {
  return githubRequest<{
    ref: string
    object: {
      sha: string
      type: string
      url: string
    }
  }>(
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/git/refs`,
    {
      method: "POST",
      tokenRequired: true,
      token: params.token,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${params.branch}`,
        sha: params.sha,
      }),
    },
  )
}

export async function createGitHubPullRequest(params: {
  owner: string
  repo: string
  title: string
  head: string
  base: string
  body?: string
  /** The acting user's OAuth token. */
  token: string
}) {
  return githubRequest<GitHubPullRequest>(
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/pulls`,
    {
      method: "POST",
      tokenRequired: true,
      token: params.token,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        head: params.head,
        base: params.base,
        body: params.body,
      }),
    },
  )
}

export async function mergeGitHubPullRequest(params: {
  owner: string
  repo: string
  pullNumber: number
  commitTitle?: string
  commitMessage?: string
  mergeMethod?: "merge" | "squash" | "rebase"
  /** The acting user's OAuth token. */
  token: string
}) {
  return githubRequest<{
    sha: string
    merged: boolean
    message: string
  }>(
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/pulls/${params.pullNumber}/merge`,
    {
      method: "PUT",
      tokenRequired: true,
      token: params.token,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commit_title: params.commitTitle,
        commit_message: params.commitMessage,
        merge_method: params.mergeMethod ?? "squash",
      }),
    },
  )
}
