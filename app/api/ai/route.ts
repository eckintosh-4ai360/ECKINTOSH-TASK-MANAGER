import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { getAIWorkspaceContext } from "@/lib/actions/ai-actions"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// ─── Tool Definitions ────────────────────────────────────────────────────────

const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project in the Eckintosh workspace. Use when the user wants to create a project, Kanban board, or development initiative.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Project description" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Project priority" },
          dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" },
          teamLeaderId: { type: "string", description: "User ID of the team leader (from teamMembers list)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task in a project. Use when user wants to add a task, to-do item, or work item.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          projectId: { type: "string", description: "Project ID the task belongs to" },
          sprintId: { type: "string", description: "Optional sprint ID" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Task priority" },
          dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" },
          tags: { type: "string", description: "Comma-separated tags" },
        },
        required: ["title", "projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Add an event, meeting, deadline, or reminder to the calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          description: { type: "string", description: "Event description" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          startTime: { type: "string", description: "Start time in HH:mm format (24h)" },
          endTime: { type: "string", description: "End time in HH:mm format (24h)" },
          type: {
            type: "string",
            enum: ["meeting", "call", "presentation", "workshop", "review", "deadline", "sprint", "task"],
            description: "Event type",
          },
          location: { type: "string", description: "Location or meeting link" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_sprint",
      description: "Create a new sprint for a project. Sprints are time-boxed iterations for agile development.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Sprint name (e.g. 'Sprint 1', 'Alpha Release Sprint')" },
          goal: { type: "string", description: "Sprint goal describing what should be achieved" },
          projectId: { type: "string", description: "Project ID this sprint belongs to" },
          status: { type: "string", enum: ["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"], description: "Sprint status" },
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
        },
        required: ["name", "projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note in Jot-it. Use for documentation, meeting notes, ideas, or summaries.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          content: { type: "string", description: "Note content in plain text or HTML" },
          color: { type: "string", description: "Color hex code for the note (e.g. #00d4ff, #a855f7, #10b981, #f59e0b, #ef4444)" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_notes",
      description: "Summarize all notes in the workspace or provide insights about them.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", description: "What to focus on in the summary" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_week",
      description: "Help the user plan their week based on tasks, sprints, and calendar events.",
      parameters: {
        type: "object",
        properties: {
          weekStart: { type: "string", description: "Start of the week in YYYY-MM-DD format" },
        },
        required: [],
      },
    },
  },
]

// ─── System Prompt Builder ───────────────────────────────────────────────────

function buildSystemPrompt(context: Awaited<ReturnType<typeof getAIWorkspaceContext>>) {
  const today = new Date().toISOString().split("T")[0]

  if (!context) {
    return `You are the Eckintosh AI Assistant — a powerful workspace intelligence for the Eckintosh Task Manager platform. Today is ${today}. You help developers plan, organize, and act on their projects and tasks. Be concise, practical, and friendly.`
  }

  const projectsList = context.projects.map(p =>
    `  - [${p.id}] "${p.name}" (status: ${p.status}, priority: ${p.priority}, tasks: ${p.taskCount})`
  ).join("\n") || "  (no projects yet)"

  const tasksList = context.tasks.slice(0, 15).map(t =>
    `  - [${t.id}] "${t.title}" | status: ${t.status} | priority: ${t.priority} | project: ${t.project ?? "none"}${t.dueDate ? ` | due: ${t.dueDate.split("T")[0]}` : ""}`
  ).join("\n") || "  (no tasks yet)"

  const calendarList = context.calendarEvents.slice(0, 8).map(e =>
    `  - [${e.id}] "${e.title}" | type: ${e.type} | at: ${new Date(e.startTime).toLocaleString()}`
  ).join("\n") || "  (no upcoming events)"

  const sprintsList = context.sprints.map(s =>
    `  - [${s.id}] "${s.name}" | project: ${s.project ?? "none"} | status: ${s.status} | tasks: ${s.taskCount}${s.goal ? ` | goal: ${s.goal}` : ""}`
  ).join("\n") || "  (no sprints yet)"

  const notesList = context.notes.map(n =>
    `  - [${n.id}] "${n.title}"${n.pinned ? " 📌" : ""}: ${n.content.slice(0, 100)}...`
  ).join("\n") || "  (no notes yet)"

  const teamList = context.teamMembers.map(m =>
    `  - [${m.id}] ${m.name} (${m.role})`
  ).join("\n") || "  (no team members)"

  return `You are the Eckintosh AI Assistant — the most powerful and intelligent workspace AI for the Eckintosh Task Manager platform, built for an elite software development team.

Today's date: ${today}
Current user: ${context.user.name} (${context.user.role})

## Platform Overview
Eckintosh Task Manager is a full-featured developer workspace with:
- **Projects** — Development initiatives with team leaders, priorities, status tracking
- **Tasks** — Work items with statuses: TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, BACKLOG
- **Sprints** — Agile sprints with statuses: PLANNING, ACTIVE, COMPLETED, CANCELLED
- **Calendar** — Scheduling for meetings, calls, presentations, workshops, reviews, deadlines, sprints
- **Jot-it** — Rich text notes for documentation, ideas, meeting notes
- **Team** — Multi-role workspace: ADMIN, MANAGER, DEVELOPER, GUEST
- **Code Ops** — GitHub integration for commit tracking and deployment feeds
- **Standups** — Daily standup submissions
- **Analytics** — Project analytics and reporting
- **Messages** — Internal team messaging

## Current Workspace State

### Projects (${context.projects.length} total)
${projectsList}

### Recent Tasks (showing ${Math.min(context.tasks.length, 15)} of ${context.tasks.length})
${tasksList}

### Upcoming Calendar Events (${context.calendarEvents.length})
${calendarList}

### Sprints (${context.sprints.length} total)
${sprintsList}

### Notes (${context.notes.length} total)
${notesList}

### Team Members
${teamList}

## Your Capabilities
You can take ACTIONS on the workspace using tools. When a user asks you to create, schedule, or manage anything:
1. Understand their intent from natural language
2. Call the appropriate tool with the right parameters
3. Present a clear confirmation preview before saving
4. Always be helpful and proactive

## Behavior Rules
- Be concise and professional — you're a dev tool, not a chatbot
- When creating items, infer missing details intelligently (e.g. if no projectId given for a task, ask which project or pick the most relevant one)
- For dates, interpret natural language (e.g. "tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split("T")[0]}, "next Monday", "end of week")
- Always use real IDs from the workspace state above when calling tools
- For calendar events without a time, default to 09:00-10:00
- When summarizing notes, reference actual note content
- Be encouraging and motivating about the team's progress
- **Formatting & Layout**: Always structure your responses with clean, readable markdown. Do not use raw asterisks as bullet points or separators in-line. Instead, use proper nested bullet points with 4-space indentation for sub-items. Bold key items like task/project names, due dates, and priorities. Arrange lists, schedules, and summaries using numbered sections and clean paragraphs to make details stand out clearly.`
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, executeAction } = await req.json()

    // If this is an action execution request (confirmed by user)
    if (executeAction) {
      const { toolName, toolArgs } = executeAction

      // Import action executors
      const {
        aiCreateProject,
        aiCreateTask,
        aiCreateCalendarEvent,
        aiCreateSprint,
        aiCreateNote,
      } = await import("@/lib/actions/ai-actions")

      let result: { success: boolean; error?: string; [key: string]: unknown } = { success: false, error: "Unknown action" }

      switch (toolName) {
        case "create_project":
          result = await aiCreateProject(toolArgs)
          break
        case "create_task":
          result = await aiCreateTask(toolArgs)
          break
        case "create_calendar_event":
          result = await aiCreateCalendarEvent(toolArgs)
          break
        case "create_sprint":
          result = await aiCreateSprint(toolArgs)
          break
        case "create_note":
          result = await aiCreateNote(toolArgs)
          break
        default:
          result = { success: false, error: `Unknown tool: ${toolName}` }
      }

      return NextResponse.json(result)
    }

    // Normal chat — fetch context and call Groq
    const context = await getAIWorkspaceContext()
    const systemPrompt = buildSystemPrompt(context)

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 2048,
    })

    const message = response.choices[0].message
    const toolCalls = message.tool_calls ?? []

    // Check if AI wants to execute a tool
    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0]
      const toolName = toolCall.function.name
      const toolArgs = JSON.parse(toolCall.function.arguments)

      // For read-only tools, execute immediately
      if (toolName === "summarize_notes" || toolName === "plan_week") {
        // Generate a text response about this
        const followUp = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            {
              role: "assistant",
              content: null,
              tool_calls: toolCalls,
            },
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                status: "ready",
                notes: context?.notes ?? [],
                tasks: context?.tasks ?? [],
                events: context?.calendarEvents ?? [],
              }),
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        })

        return NextResponse.json({
          type: "text",
          content: followUp.choices[0].message.content ?? "I've analyzed your workspace.",
        })
      }

      // For write actions, return pending confirmation
      const confirmationText = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the Eckintosh AI Assistant. The user has requested a workspace action. 
Write ONE brief sentence (max 20 words) asking for confirmation about what you're about to create/save. 
Be specific about what you will create.`,
          },
          {
            role: "user",
            content: `Tool: ${toolName}, Args: ${JSON.stringify(toolArgs)}. Write a confirmation message.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      })

      return NextResponse.json({
        type: "action_pending",
        toolName,
        toolArgs,
        message: confirmationText.choices[0].message.content ?? "Please confirm this action.",
      })
    }

    // Plain text response
    return NextResponse.json({
      type: "text",
      content: message.content ?? "I'm here to help with your workspace.",
    })
  } catch (error) {
    console.error("AI route error:", error)
    return NextResponse.json(
      { error: "Failed to process AI request. Make sure GROQ_API_KEY is set in your .env file." },
      { status: 500 }
    )
  }
}
