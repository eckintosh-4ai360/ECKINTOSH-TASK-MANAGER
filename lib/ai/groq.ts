import Groq from "groq-sdk"

let groqClient: Groq | null = null

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return null
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey })
  }

  return groqClient
}

export async function generateGroqJson<T>({
  system,
  prompt,
  fallback,
  maxTokens = 1600,
}: {
  system: string
  prompt: string
  fallback: T
  maxTokens?: number
}): Promise<T> {
  const groq = getGroqClient()
  if (!groq) return fallback

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: maxTokens,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallback

    return JSON.parse(content) as T
  } catch (error) {
    console.error("Groq JSON generation failed:", error)
    return fallback
  }
}
