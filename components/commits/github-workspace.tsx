"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  GitBranch,
  GitCommit,
  Github,
  ExternalLink,
  RefreshCw,
  Folder,
  FileCode2,
  ArrowLeft,
  FolderOpen,
  Save,
  Sparkles,
  GitPullRequest,
  ShieldCheck,
  Globe,
  Plus,
  Bot,
  Bug,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { getGitHubWorkspaceData, getRepositoryDirectoryAction, getRepositoryFileAction, saveRepositoryFileAction, createRepositoryPullRequestAction, mergeRepositoryPullRequestAction, createRepositoryBranchAction } from "@/lib/actions/github-actions"
import { reviewRepositoryFileAction, type CodeReviewResult } from "@/lib/actions/code-review-actions"
import type { DirectoryEntryItem, FileEditorState, GitHubWorkspaceData } from "@/lib/github-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-xl border border-border/40 bg-background/40 text-sm text-muted-foreground">
      Loading editor...
    </div>
  ),
})

type GitHubWorkspaceProps = {
  initialData: GitHubWorkspaceData
  canMergePullRequests: boolean
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function getEditorLanguage(path: string) {
  const extension = path.split(".").pop()?.toLowerCase()

  switch (extension) {
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "json":
      return "json"
    case "md":
      return "markdown"
    case "css":
      return "css"
    case "html":
      return "html"
    case "yml":
    case "yaml":
      return "yaml"
    case "py":
      return "python"
    case "sql":
      return "sql"
    case "sh":
      return "shell"
    default:
      return "plaintext"
  }
}

function sortDirectoryEntries(entries: DirectoryEntryItem[]) {
  return [...entries].sort((left, right) => {
    if (left.type === right.type) {
      return left.name.localeCompare(right.name)
    }

    if (left.type === "dir") return -1
    if (right.type === "dir") return 1
    return left.name.localeCompare(right.name)
  })
}

function reviewRiskClass(risk: CodeReviewResult["risk"]) {
  if (risk === "high") return "border-destructive/25 bg-destructive/10 text-destructive"
  if (risk === "medium") return "border-amber-400/25 bg-amber-400/10 text-amber-300"
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
}

function reviewSeverityClass(severity: CodeReviewResult["findings"][number]["severity"]) {
  if (severity === "high") return "bg-destructive/15 text-destructive border-destructive/25"
  if (severity === "medium") return "bg-amber-400/15 text-amber-300 border-amber-400/25"
  return "bg-primary/10 text-primary border-primary/25"
}

export function GitHubWorkspace({ initialData, canMergePullRequests }: GitHubWorkspaceProps) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(initialData)
  const [selectedProjectId, setSelectedProjectId] = useState(initialData.selectedProjectId ?? "")
  const [selectedBranch, setSelectedBranch] = useState(initialData.selectedBranch ?? "")
  const [currentPath, setCurrentPath] = useState("")
  const [entries, setEntries] = useState<DirectoryEntryItem[]>(initialData.selectedRepository?.rootEntries ?? [])
  const [openedFile, setOpenedFile] = useState<FileEditorState | null>(null)
  const [editorValue, setEditorValue] = useState("")
  const [commitMessage, setCommitMessage] = useState("")
  const [newBranchName, setNewBranchName] = useState("")
  const [pullRequestTitle, setPullRequestTitle] = useState("")
  const [pullRequestBody, setPullRequestBody] = useState("")
  const [codeReview, setCodeReview] = useState<CodeReviewResult | null>(null)
  const [isLoadingWorkspace, startWorkspaceTransition] = useTransition()
  const [isLoadingDirectory, startDirectoryTransition] = useTransition()
  const [isLoadingFile, startFileTransition] = useTransition()
  const [isSavingFile, startSaveTransition] = useTransition()
  const [isBranchPending, startBranchTransition] = useTransition()
  const [isPullRequestPending, startPullRequestTransition] = useTransition()
  const [isReviewPending, startReviewTransition] = useTransition()
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false)

  async function handleConnectGitHub() {
    setIsConnectingGitHub(true)
    try {
      // Re-runs GitHub OAuth so auth.ts's signIn callback stores this user's
      // own token — after which their writes are attributed to them, not to
      // a shared machine account.
      await signIn("github", { redirectTo: "/auth/complete?returnTo=/commits" })
    } catch {
      toast.error("Could not start GitHub sign-in. Please try again.")
      setIsConnectingGitHub(false)
    }
  }

  useEffect(() => {
    setWorkspace(initialData)
    setSelectedProjectId(initialData.selectedProjectId ?? "")
    setSelectedBranch(initialData.selectedBranch ?? "")
    setCurrentPath("")
    setEntries(initialData.selectedRepository?.rootEntries ?? [])
    setOpenedFile(null)
    setEditorValue("")
    setCommitMessage("")
    setNewBranchName("")
    setPullRequestTitle("")
    setPullRequestBody("")
    setCodeReview(null)
  }, [initialData])

  const selectedRepository = workspace.selectedRepository
  const branchItems = selectedRepository?.branches ?? []
  const directoryBreadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : []

  const isDirty = useMemo(() => {
    return Boolean(openedFile && editorValue !== openedFile.content)
  }, [editorValue, openedFile])

  async function reloadWorkspace(projectId: string, branch?: string | null) {
    startWorkspaceTransition(() => {
      void getGitHubWorkspaceData(projectId, branch)
        .then((data) => {
          setWorkspace(data)
          setSelectedProjectId(data.selectedProjectId ?? "")
          setSelectedBranch(data.selectedBranch ?? "")
          setCurrentPath("")
          setEntries(data.selectedRepository?.rootEntries ?? [])
          setOpenedFile(null)
          setEditorValue("")
          setCommitMessage("")
          setNewBranchName("")
          setCodeReview(null)

          if (data.selectedProjectId) {
            const query = new URLSearchParams({ projectId: data.selectedProjectId })
            if (data.selectedBranch) query.set("branch", data.selectedBranch)
            router.replace(`/commits?${query.toString()}`)
          }

          if (data.error) {
            toast.error(data.error)
          }
        })
        .catch(() => {
          toast.error("GitHub workspace could not be refreshed.")
        })
    })
  }

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId)
    void reloadWorkspace(projectId)
  }

  function handleBranchChange(branch: string) {
    if (!selectedProjectId) return
    setSelectedBranch(branch)
    void reloadWorkspace(selectedProjectId, branch)
  }

  function loadDirectory(path: string) {
    if (!selectedProjectId) return

    startDirectoryTransition(() => {
      void getRepositoryDirectoryAction(selectedProjectId, path, selectedBranch)
        .then((result) => {
          if (!result.success || !result.entries) {
            toast.error(result.error ?? "Could not open that folder.")
            return
          }

          setCurrentPath(path)
          setEntries(result.entries)
        })
        .catch(() => {
          toast.error("Could not open that folder.")
        })
    })
  }

  function handleDirectoryBack() {
    const parts = currentPath.split("/").filter(Boolean)
    parts.pop()
    const nextPath = parts.join("/")
    loadDirectory(nextPath)
  }

  function openFile(path: string) {
    if (!selectedProjectId) return

    startFileTransition(() => {
      void getRepositoryFileAction(selectedProjectId, path, selectedBranch)
        .then((result) => {
          if (!result.success || !result.file) {
            toast.error(result.error ?? "Could not open that file.")
            return
          }

          setOpenedFile(result.file)
          setEditorValue(result.file.content)
          setCommitMessage(`Update ${result.file.path}`)
          setCodeReview(null)
        })
        .catch(() => {
          toast.error("Could not open that file.")
        })
    })
  }

  function saveFile() {
    if (!selectedProjectId || !openedFile) return
    if (!commitMessage.trim()) {
      toast.error("Add a commit message before saving.")
      return
    }

    startSaveTransition(() => {
      void saveRepositoryFileAction({
        projectId: selectedProjectId,
        path: openedFile.path,
        content: editorValue,
        message: commitMessage,
        branch: selectedBranch,
        sha: openedFile.sha,
      })
        .then((result) => {
          if (!result.success || !result.file) {
            toast.error(result.error ?? "GitHub rejected the file update.")
            return
          }

          const nextFile = {
            ...openedFile,
            sha: result.file.sha,
            htmlUrl: result.file.html_url,
            content: editorValue,
          }
          setOpenedFile(nextFile)
          setEditorValue(editorValue)
          toast.success("Commit pushed to GitHub.")
          void reloadWorkspace(selectedProjectId, selectedBranch)
        })
        .catch(() => {
          toast.error("GitHub rejected the file update.")
        })
    })
  }

  function reviewOpenFile() {
    if (!selectedProjectId || !openedFile) return

    startReviewTransition(() => {
      void reviewRepositoryFileAction({
        projectId: selectedProjectId,
        path: openedFile.path,
        branch: selectedBranch,
        content: editorValue,
      })
        .then((result) => {
          if (!result.success) {
            toast.error(result.error)
            return
          }

          setCodeReview(result.review)
          if (!commitMessage.trim() || commitMessage === `Update ${openedFile.path}`) {
            setCommitMessage(result.review.commitMessage)
          }
          toast.success("AI code review complete.")
        })
        .catch(() => {
          toast.error("AI code review could not be completed.")
        })
    })
  }

  function createBranch() {
    if (!selectedProjectId || !selectedBranch) return
    if (!newBranchName.trim()) {
      toast.error("Add a branch name first.")
      return
    }

    startBranchTransition(() => {
      void createRepositoryBranchAction({
        projectId: selectedProjectId,
        branchName: newBranchName,
        sourceBranch: selectedBranch,
      })
        .then((result) => {
          if (!result.success || !result.branch) {
            toast.error(result.error ?? "Could not create that branch.")
            return
          }

          toast.success(`Branch ${result.branch.name} created.`)
          setNewBranchName("")
          void reloadWorkspace(selectedProjectId, result.branch.name)
        })
        .catch(() => {
          toast.error("Could not create that branch.")
        })
    })
  }

  function createPullRequest() {
    if (!selectedProjectId || !selectedRepository) return
    if (!pullRequestTitle.trim()) {
      toast.error("Add a pull request title first.")
      return
    }

    startPullRequestTransition(() => {
      void createRepositoryPullRequestAction({
        projectId: selectedProjectId,
        title: pullRequestTitle,
        headBranch: selectedBranch,
        baseBranch: selectedRepository.repository.defaultBranch,
        body: pullRequestBody,
      })
        .then((result) => {
          if (!result.success) {
            toast.error(result.error ?? "Could not create the pull request.")
            return
          }

          toast.success("Pull request created on GitHub.")
          setPullRequestTitle("")
          setPullRequestBody("")
          void reloadWorkspace(selectedProjectId, selectedBranch)
        })
        .catch(() => {
          toast.error("Could not create the pull request.")
        })
    })
  }

  function mergePullRequest(pullNumber: number) {
    if (!selectedProjectId) return

    startPullRequestTransition(() => {
      void mergeRepositoryPullRequestAction({
        projectId: selectedProjectId,
        pullNumber,
        mergeMethod: "squash",
      })
        .then((result) => {
          if (!result.success) {
            toast.error(result.error ?? "Could not merge that pull request.")
            return
          }

          toast.success("Pull request merged.")
          void reloadWorkspace(selectedProjectId, selectedBranch)
        })
        .catch(() => {
          toast.error("Could not merge that pull request.")
        })
    })
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary/80">
              <Github className="w-4 h-4" />
              GitHub Workspace
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Code, commits, and pull requests in one place</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Track connected repositories, inspect activity, open files, and push commits without leaving the workspace.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            onClick={() => selectedProjectId && reloadWorkspace(selectedProjectId, selectedBranch)}
            disabled={isLoadingWorkspace || !selectedProjectId}
          >
            <RefreshCw className={cn("w-4 h-4", isLoadingWorkspace && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {!workspace.configured && (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
            GitHub read/write automation is not configured yet. Public repositories can still be connected later, but private repo access, file saves, PR creation, and merges need a GitHub token on the server.
          </div>
        )}

        {workspace.error && (
          <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
            {workspace.error}
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_auto]">
          <div className="space-y-2">
            <Label>Project Repository</Label>
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue placeholder="Select a tracked project" />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                {workspace.repositories.map((repository) => (
                  <SelectItem key={repository.projectId} value={repository.projectId}>
                    {repository.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={selectedBranch}
              onValueChange={handleBranchChange}
              disabled={!selectedRepository}
            >
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                {branchItems.map((branch) => (
                  <SelectItem key={branch.name} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/40 bg-background/35 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{workspace.writeEnabled ? "Write access ready" : "Read-only mode"}</p>
            <p className="mt-1">
              {workspace.writeEnabled
                ? "File edits and PR actions can be sent to GitHub from here."
                : workspace.needsGitHubConnection
                  ? "Connect your own GitHub account so commits, branches, and pull requests you make here are attributed to you."
                  : "Connect a write-enabled GitHub token to push code or manage pull requests."}
            </p>
            {workspace.needsGitHubConnection && (
              <Button
                type="button"
                size="sm"
                onClick={handleConnectGitHub}
                disabled={isConnectingGitHub}
                className="mt-3 h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isConnectingGitHub ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Github className="w-3.5 h-3.5" />
                )}
                Connect GitHub
              </Button>
            )}
          </div>
        </div>

        {workspace.writeEnabled && selectedRepository && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/40 bg-background/30 p-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-branch-name">Create work branch</Label>
              <Input
                id="new-branch-name"
                value={newBranchName}
                onChange={(event) => setNewBranchName(event.target.value)}
                placeholder={`feature/${selectedRepository.repository.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "work"}`}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
              <p className="text-xs text-muted-foreground">
                New branches start from {selectedBranch || selectedRepository.repository.defaultBranch}, then you can commit and open a pull request here.
              </p>
            </div>
            <Button
              type="button"
              onClick={createBranch}
              disabled={isBranchPending || !newBranchName.trim()}
              className="h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Plus className="w-4 h-4" />
              {isBranchPending ? "Creating..." : "Create Branch"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Integration Notes</h3>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p>Admins connect repositories by saving a GitHub URL on the project record.</p>
            <p>Developers can browse connected branches and commit file changes from the in-app editor when GitHub write access is configured.</p>
            <p>Admins can merge pull requests from here to keep the release flow inside the workspace.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Branch Snapshot</h3>
          </div>
          <ScrollArea className="mt-4 h-[174px] pr-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {branchItems.map((branch) => (
                <div key={branch.name} className="rounded-xl border border-border/40 bg-background/35 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{branch.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{branch.lastCommitSha.slice(0, 10)}</p>
                    </div>
                    {branch.protected && (
                      <Badge className="bg-primary/10 text-primary border border-primary/25">Protected</Badge>
                    )}
                  </div>
                </div>
              ))}
              {branchItems.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground sm:col-span-2">
                  Select a tracked repository to see its branches.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6">
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList className="glass border border-border/40">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="pulls">Pull Requests</TabsTrigger>
              <TabsTrigger value="workspace">Code Workspace</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              {selectedRepository && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-primary/80">
                        <Github className="w-4 h-4" />
                        Connected Repository
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">{selectedRepository.repository.projectName}</h3>
                      <p className="text-sm text-muted-foreground">{selectedRepository.repositoryDescription ?? selectedRepository.repository.repositoryUrl}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border border-primary/25">
                        <GitBranch className="mr-1 h-3.5 w-3.5" />
                        {selectedBranch}
                      </Badge>
                      <Badge variant="secondary" className="glass border-border/40">
                        {selectedRepository.repositoryPrivate ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <Globe className="mr-1 h-3.5 w-3.5" />}
                        {selectedRepository.repositoryPrivate ? "Private" : "Public"}
                      </Badge>
                      <Link href={selectedRepository.repository.repositoryUrl} target="_blank" className="inline-flex">
                        <Button type="button" size="sm" variant="outline" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                          <ExternalLink className="w-4 h-4" />
                          Open Repo
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <GitCommit className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-foreground">Selected Branch Commits</h4>
                  </div>
                  <ScrollArea className="h-[420px] pr-3">
                    <div className="grid gap-3">
                      {(selectedRepository?.commits ?? []).map((commit) => (
                        <div key={`${commit.branch}-${commit.id}`} className="rounded-xl border border-border/40 bg-background/35 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{commit.message}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {commit.authorName} · {formatDateTime(commit.committedAt)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="font-mono">
                              {commit.id.slice(0, 7)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {(selectedRepository?.commits.length ?? 0) === 0 && (
                        <div className="rounded-xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                          No commits were returned for this branch yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-foreground">Workspace Activity Stream</h4>
                  </div>
                  <ScrollArea className="h-[420px] pr-3">
                    <div className="grid gap-3">
                      {workspace.activityStream.map((commit) => (
                        <div key={`${commit.projectId}-${commit.id}`} className="rounded-xl border border-border/40 bg-background/35 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{commit.message}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {commit.projectName} · {commit.authorName} · {formatDateTime(commit.committedAt)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="font-mono">
                              {commit.branch}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pulls" className="space-y-4">
              {selectedRepository && selectedBranch !== selectedRepository.repository.defaultBranch && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-foreground">Open a pull request from {selectedBranch}</h4>
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="pr-title">Pull request title</Label>
                      <Input
                        id="pr-title"
                        value={pullRequestTitle}
                        onChange={(event) => setPullRequestTitle(event.target.value)}
                        placeholder={`Merge ${selectedBranch} into ${selectedRepository.repository.defaultBranch}`}
                        className="glass border-border/50 focus:border-primary/50 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pr-body">Pull request summary</Label>
                      <Textarea
                        id="pr-body"
                        value={pullRequestBody}
                        onChange={(event) => setPullRequestBody(event.target.value)}
                        placeholder="Describe the change set and anything reviewers should know."
                        className="glass min-h-[110px] resize-none border-border/50 focus:border-primary/50"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={createPullRequest}
                        disabled={isPullRequestPending || !workspace.writeEnabled}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        <GitPullRequest className="w-4 h-4" />
                        Create Pull Request
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {(selectedRepository?.pullRequests ?? []).map((pullRequest) => (
                  <div key={pullRequest.number} className="rounded-2xl border border-border/40 bg-background/30 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-foreground">{pullRequest.title}</h4>
                          <Badge variant="secondary">#{pullRequest.number}</Badge>
                          {pullRequest.draft && <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/20">Draft</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {pullRequest.authorName} opened {pullRequest.headBranch} into {pullRequest.baseBranch} · updated {formatDateTime(pullRequest.updatedAt)}
                        </p>
                        {pullRequest.mergeableState && (
                          <p className="mt-2 text-xs text-primary/80">Merge state: {pullRequest.mergeableState}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={pullRequest.pullRequestUrl} target="_blank" className="inline-flex">
                          <Button type="button" variant="outline" size="sm" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                            <ExternalLink className="w-4 h-4" />
                            View on GitHub
                          </Button>
                        </Link>
                        {canMergePullRequests && pullRequest.state === "open" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => mergePullRequest(pullRequest.number)}
                            disabled={isPullRequestPending || !workspace.writeEnabled}
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Merge
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(selectedRepository?.pullRequests.length ?? 0) === 0 && (
                  <div className="rounded-xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                    No open pull requests were returned for this repository.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="workspace" className="space-y-4">
              <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-border/40 bg-background/25 p-4 xl:min-h-[680px]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-primary/80">Repository Files</p>
                      <p className="text-sm text-muted-foreground">
                        {currentPath || "Repository root"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="glass h-8 w-8 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                        onClick={() => loadDirectory("")}
                        disabled={isLoadingDirectory}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="glass h-8 w-8 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                        onClick={handleDirectoryBack}
                        disabled={isLoadingDirectory || !currentPath}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {directoryBreadcrumbs.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <button type="button" className="hover:text-primary" onClick={() => loadDirectory("")}>root</button>
                      {directoryBreadcrumbs.map((segment, index) => {
                        const path = directoryBreadcrumbs.slice(0, index + 1).join("/")
                        return (
                          <button key={path} type="button" className="hover:text-primary" onClick={() => loadDirectory(path)}>
                            / {segment}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <ScrollArea className="h-[560px] pr-3 xl:h-[620px]">
                    <div className="grid gap-2">
                      {sortDirectoryEntries(entries).map((entry) => (
                        <button
                          key={entry.path}
                          type="button"
                          onClick={() => entry.type === "dir" ? loadDirectory(entry.path) : openFile(entry.path)}
                          className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/35 px-3 py-2 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
                        >
                          {entry.type === "dir"
                            ? <Folder className="h-4 w-4 flex-shrink-0 text-primary" />
                            : <FileCode2 className="h-4 w-4 flex-shrink-0 text-primary" />}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                            <p className="text-[11px] text-muted-foreground">{entry.type === "dir" ? "Directory" : `${Math.max(entry.size, 0)} bytes`}</p>
                          </div>
                        </button>
                      ))}
                      {entries.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                          This folder is empty.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex rounded-2xl border border-border/40 bg-background/25 p-4 xl:min-h-[680px]">
                  {!openedFile && (
                    <div className="flex min-h-[560px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/30 p-8 text-center xl:min-h-[640px]">
                      <FileCode2 className="h-12 w-12 text-primary/70" />
                      <h4 className="mt-4 text-lg font-semibold text-foreground">Open a file to start editing</h4>
                      <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        Pick a repository file from the left to inspect the code, edit it in-place, and commit it back to the current branch.
                      </p>
                    </div>
                  )}

                  {openedFile && (
                    <div className="flex min-h-[640px] flex-1 flex-col space-y-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.14em] text-primary/80">Editing file</p>
                          <p className="truncate text-base font-semibold text-foreground">{openedFile.path}</p>
                          <p className="text-xs text-muted-foreground">Branch: {selectedBranch} · SHA: {openedFile.sha.slice(0, 12)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={reviewOpenFile}
                            disabled={isReviewPending || !openedFile}
                            className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                          >
                            {isReviewPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                            AI Review
                          </Button>
                          {openedFile.htmlUrl && (
                            <Link href={openedFile.htmlUrl} target="_blank" className="inline-flex">
                              <Button type="button" variant="outline" size="sm" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                                <ExternalLink className="w-4 h-4" />
                                View on GitHub
                              </Button>
                            </Link>
                          )}
                          <Badge variant="secondary">{getEditorLanguage(openedFile.path)}</Badge>
                          {isDirty && <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/20">Unsaved</Badge>}
                        </div>
                      </div>

                      {selectedRepository && selectedBranch === selectedRepository.repository.defaultBranch && (
                        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                          You are editing the default branch. Create or select a work branch first when this change should go through pull request review.
                        </div>
                      )}

                      {codeReview && (
                        <div className="rounded-2xl border border-primary/15 bg-background/30 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-primary/80">
                                <Bug className="h-4 w-4" />
                                AI Code Review
                              </div>
                              <h4 className="mt-1 text-base font-semibold text-foreground">{codeReview.summary}</h4>
                            </div>
                            <Badge className={cn("border capitalize", reviewRiskClass(codeReview.risk))}>
                              {codeReview.risk} risk
                            </Badge>
                          </div>

                          <div className="mt-4 grid gap-3">
                            {codeReview.findings.map((finding, index) => (
                              <div key={`${finding.title}-${index}`} className="rounded-xl border border-border/40 bg-background/35 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={cn("border capitalize", reviewSeverityClass(finding.severity))}>
                                    {finding.severity}
                                  </Badge>
                                  {finding.line && (
                                    <span className="font-mono text-xs text-primary">line {finding.line}</span>
                                  )}
                                  <p className="text-sm font-semibold text-foreground">{finding.title}</p>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{finding.detail}</p>
                                <div className="mt-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-primary/90">
                                  <span className="font-semibold text-primary">Suggested fix: </span>
                                  {finding.suggestedFix}
                                </div>
                              </div>
                            ))}

                            {codeReview.findings.length === 0 && (
                              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                                No obvious bug findings. Use the suggested tests before merging.
                              </div>
                            )}
                          </div>

                          <div className="mt-4 rounded-xl border border-border/40 bg-background/35 p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-primary" />
                              <p className="text-sm font-semibold text-foreground">Verification suggestions</p>
                            </div>
                            <ul className="grid gap-1 text-xs text-muted-foreground">
                              {codeReview.testSuggestions.map((suggestion) => (
                                <li key={suggestion}>- {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="min-h-[520px] flex-1 overflow-hidden rounded-xl border border-border/40">
                        <MonacoEditor
                          height="100%"
                          language={getEditorLanguage(openedFile.path)}
                          theme="vs-dark"
                          value={editorValue}
                          onChange={(value) => {
                            setEditorValue(value ?? "")
                            setCodeReview(null)
                          }}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: "on",
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-2">
                          <Label htmlFor="commit-message">Commit message</Label>
                          <Input
                            id="commit-message"
                            value={commitMessage}
                            onChange={(event) => setCommitMessage(event.target.value)}
                            placeholder="Describe the code change you are about to push"
                            className="glass border-border/50 focus:border-primary/50 h-11"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            onClick={saveFile}
                            disabled={isSavingFile || !workspace.writeEnabled || !isDirty}
                            className="h-11 w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 lg:w-auto"
                          >
                            <Save className="w-4 h-4" />
                            {isSavingFile ? "Saving..." : "Commit to GitHub"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  )
}
