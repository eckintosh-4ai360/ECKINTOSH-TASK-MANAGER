import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getGroqClient } from "@/lib/ai/groq"

const MAX_PROMPT_LENGTH = 2000

export async function POST(req: NextRequest) {
  try {
    // Model calls cost money — never serve them to anonymous callers.
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const groq = getGroqClient()
    if (!groq) {
      return NextResponse.json(
        { error: "AI diagram generation is unavailable — GROQ_API_KEY is not configured." },
        { status: 503 },
      )
    }

    const { prompt } = await req.json()

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).` },
        { status: 413 },
      )
    }

    const systemPrompt = `You are a system architect and diagram designer. 
Generate a structural diagram matching the user's request. 
Your output MUST be a valid JSON object containing "nodes" and "edges" keys. Do NOT include any markdown code blocks, explanations, or text outside the JSON.

JSON Structure:
{
  "nodes": [
    {
      "id": "unique_node_id_1",
      "type": "rectangle" | "diamond" | "circle",
      "label": "Brief Node Label",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "color": "blue" | "green" | "red" | "orange" | "purple" | "yellow" | "gray"
    }
  ],
  "edges": [
    {
      "from": "unique_node_id_1",
      "to": "unique_node_id_2",
      "label": "optional link label"
    }
  ]
}

Layout Guidelines:
- Spread nodes out nicely. Do not overlap. Use coordinates spaced by 150-300 pixels.
- Use 'diamond' for decisions or gateways.
- Use 'circle' for start/end or simple actors.
- Use 'rectangle' for services, components, or databases.
- Choose 'color' themes to match the node's function (e.g. databases red, UI blue, logic orange).
- Width should be around 140-180 and height 70-90 to fit the labels.
- Make sure all node IDs referenced in edges are present in the nodes list.

Example User Prompt: "three tier web application"
Example Response:
{
  "nodes": [
    { "id": "client", "type": "circle", "label": "Client Browser", "x": 100, "y": 200, "width": 140, "height": 80, "color": "blue" },
    { "id": "web", "type": "rectangle", "label": "Web Server", "x": 300, "y": 200, "width": 150, "height": 80, "color": "orange" },
    { "id": "db", "type": "rectangle", "label": "Database PostgreSQL", "x": 550, "y": 200, "width": 160, "height": 80, "color": "red" }
  ],
  "edges": [
    { "from": "client", "to": "web", "label": "HTTP/HTTPS" },
    { "from": "web", "to": "db", "label": "SQL queries" }
  ]
}`

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a diagram for: ${prompt}` },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    })

    const rawContent = response.choices[0].message.content
    if (!rawContent) {
      throw new Error("Empty response from AI model")
    }

    const data = JSON.parse(rawContent)
    return NextResponse.json(data)
  } catch (error) {
    console.error("AI Diagram generation error:", error)
    return NextResponse.json({ error: "Failed to generate diagram." }, { status: 500 })
  }
}
