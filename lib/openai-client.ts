import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
})

function repairTruncatedJSON(content: string): string {
  try {
    JSON.parse(content)
    return content
  } catch (e) {
    console.log("[v0] Attempting to repair truncated JSON...")

    // Find the last complete field before truncation
    const lines = content.split("\n")
    let repairedContent = ""
    let braceCount = 0
    let inString = false
    let lastCompleteIndex = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"' && (j === 0 || line[j - 1] !== "\\")) {
          inString = !inString
        }
        if (!inString) {
          if (char === "{") braceCount++
          if (char === "}") braceCount--
        }
      }

      repairedContent += line + "\n"

      // If we have balanced braces and we're not in a string, this might be a good stopping point
      if (braceCount === 1 && !inString && line.trim().endsWith(",")) {
        lastCompleteIndex = i
      }
    }

    // If we found a good stopping point, truncate there and close the JSON
    if (lastCompleteIndex > -1) {
      const truncated = lines.slice(0, lastCompleteIndex + 1).join("\n")
      const repaired = truncated.replace(/,$/, "") + "\n}"

      try {
        JSON.parse(repaired)
        console.log("[v0] Successfully repaired JSON")
        return repaired
      } catch (e2) {
        console.log("[v0] JSON repair failed, returning original")
        return content
      }
    }

    return content
  }
}

export async function generateWithGPT(systemPrompt: string, userPrompt: string, schema?: any) {
  try {
    console.log("[v0] OpenAI API Key exists:", !!process.env.OPENAI_API_KEY)
    console.log("[v0] Making OpenAI request with model: gpt-4o")
    console.log("[v0] System prompt length:", systemPrompt.length)
    console.log("[v0] User prompt length:", userPrompt.length)

    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat-v3.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: schema ? { type: "json_object" } : undefined,
      temperature: 0.7,
      max_tokens: 2000, // increased from 4000 to handle longer responses
    })

    console.log("[v0] OpenAI response received, choices count:", response.choices?.length || 0)

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error("[v0] No content in OpenAI response:", response)
      throw new Error("No response from OpenAI")
    }

    console.log("[v0] Response content length:", content.length)

    if (schema) {
      try {
        const parsed = JSON.parse(content)
        console.log("[v0] Successfully parsed JSON response")
        return parsed
      } catch (e) {
        console.error("[v0] Failed to parse JSON response:", content.substring(0, 500) + "...")
        console.error("[v0] JSON parse error:", e)

        const repairedContent = repairTruncatedJSON(content)
        try {
          const parsed = JSON.parse(repairedContent)
          console.log("[v0] Successfully parsed repaired JSON")
          return parsed
        } catch (e2) {
          throw new Error("Invalid JSON response from OpenAI")
        }
      }
    }

    return content
  } catch (error) {
    console.error("[v0] OpenAI API error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : "No stack trace",
    })
    throw error
  }
}
