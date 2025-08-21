import { generateWithGPT } from "./openai-client"
import { writeJSONFile, writeTextFile, getArtifactsPath } from "./file-utils"
import { RESEARCHER_PROMPT, PLANNER_PROMPT, PRODUCER_PROMPT } from "./prompts"
import path from "path"

export interface YouTubeJobResult {
  jobId: string
  artifactsPath: string
  files: {
    researcher: string
    planner: string
    youtube: string
    metadata: string
    captions: string
    thumbnailPrompt: string
  }
  downloadableFiles: Array<{
    name: string
    description: string
    size?: number
  }>
}

export type ProgressCallback = (stage: string, message: string) => void

export async function runYouTubeContentPipeline(
  topic: string,
  notes = "",
  duration = 10,
  onProgress?: ProgressCallback,
): Promise<YouTubeJobResult> {
  const jobId = Date.now().toString()
  const artifactsPath = getArtifactsPath(jobId)

  try {
    // Step 1: Research Phase
    onProgress?.("research", "Analyzing trends and keywords...")
    console.log("[v0] Starting research phase...")
    const researcherData = await generateWithGPT(
      "You are a helpful assistant that returns valid JSON.",
      RESEARCHER_PROMPT + `\n\nTopic: ${topic}`,
      true,
    )

    const researcherFile = path.join(artifactsPath, "researcher.json")
    writeJSONFile(researcherFile, researcherData)

    // Step 2: Planning Phase
    onProgress?.("planning", "Creating content structure and production plan...")
    console.log("[v0] Starting planning phase...")
    const plannerData = await generateWithGPT(
      "You are a helpful assistant that returns valid JSON.",
      PLANNER_PROMPT + `\n\nResearch Data: ${JSON.stringify(researcherData)}`,
      true,
    )

    const plannerFile = path.join(artifactsPath, "planner.json")
    writeJSONFile(plannerFile, plannerData)

    // Step 3: Production Phase
    onProgress?.("production", "Generating titles, descriptions, and captions...")
    console.log("[v0] Starting production phase...")
    const producerPrompt = PRODUCER_PROMPT.replace("<TOPIC>", topic)
      .replace("<DURATION>", duration.toString())
      .replace("<NOTES>", notes || "No additional notes provided")

    const contextData = {
      research: researcherData,
      planning: plannerData,
    }

    const youtubeData = await generateWithGPT(
      "You are a helpful assistant that returns valid JSON.",
      producerPrompt + `\n\nContext Data: ${JSON.stringify(contextData)}`,
      true,
    )

    onProgress?.("finalizing", "Saving files and preparing downloads...")

    // Save all output files
    const youtubeFile = path.join(artifactsPath, "youtube.json")
    writeJSONFile(youtubeFile, youtubeData)

    const captionsFile = path.join(artifactsPath, "captions.srt")
    writeTextFile(captionsFile, youtubeData.srt || "")

    const thumbnailFile = path.join(artifactsPath, "thumbnail_prompt.txt")
    writeTextFile(thumbnailFile, youtubeData.thumbnail_prompt || "")

    // Generate human-friendly metadata
    const metadataContent = generateMetadataMarkdown(youtubeData, duration)
    const metadataFile = path.join(artifactsPath, "metadata.md")
    writeTextFile(metadataFile, metadataContent)

    console.log("[v0] Pipeline completed successfully!")

    const downloadableFiles = [
      { name: "metadata.md", description: "Copy-paste ready YouTube metadata" },
      { name: "captions.srt", description: `SRT subtitle file for ${duration}-minute video` },
      { name: "thumbnail_prompt.txt", description: "AI thumbnail generation prompt" },
      { name: "youtube.json", description: "Complete metadata in JSON format" },
      { name: "researcher.json", description: "SEO research data" },
      { name: "planner.json", description: "Content planning data" },
    ]

    onProgress?.("complete", "All files generated successfully!")

    return {
      jobId,
      artifactsPath,
      files: {
        researcher: researcherFile,
        planner: plannerFile,
        youtube: youtubeFile,
        metadata: metadataFile,
        captions: captionsFile,
        thumbnailPrompt: thumbnailFile,
      },
      downloadableFiles,
    }
  } catch (error) {
    console.error("[v0] Pipeline error:", error)
    onProgress?.("error", `Pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    throw new Error(`YouTube pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

function generateMetadataMarkdown(youtubeData: any, duration: number): string {
  const title = youtubeData.titles?.[0] || "Generated Title"
  const description = youtubeData.description || "Generated description"
  const tags = youtubeData.tags?.join(", ") || ""
  const hashtags = youtubeData.hashtags?.map((tag: string) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ") || ""

  const generateTimestamps = (durationMinutes: number): string => {
    if (durationMinutes <= 3) {
      return `00:00 Intro
00:30 Main content
${Math.floor(durationMinutes * 0.8)
  .toString()
  .padStart(2, "0")}:00 Wrap-up`
    } else if (durationMinutes <= 10) {
      return `00:00 Intro
01:00 Setup/Context
${Math.floor(durationMinutes * 0.3)
  .toString()
  .padStart(2, "0")}:00 Main content
${Math.floor(durationMinutes * 0.7)
  .toString()
  .padStart(2, "0")}:00 Advanced topics
${Math.floor(durationMinutes * 0.9)
  .toString()
  .padStart(2, "0")}:00 Wrap-up`
    } else {
      return `00:00 Intro
01:30 Overview
03:00 Part 1
${Math.floor(durationMinutes * 0.4)
  .toString()
  .padStart(2, "0")}:00 Part 2
${Math.floor(durationMinutes * 0.7)
  .toString()
  .padStart(2, "0")}:00 Part 3
${Math.floor(durationMinutes * 0.9)
  .toString()
  .padStart(2, "0")}:00 Conclusion`
    }
  }

  return `# ${title}

## Description
${description}

**Tags:** ${tags}

**Hashtags:** ${hashtags}

---
**Timestamps (${duration} minutes - paste and edit):**
${generateTimestamps(duration)}

---
**Additional Files Generated:**
- captions.srt (SRT subtitle file for ${duration}-minute video)
- thumbnail_prompt.txt (AI thumbnail generation prompt)
- youtube.json (Complete metadata in JSON format)
- researcher.json (SEO research data)
- planner.json (Content planning data)`
}
