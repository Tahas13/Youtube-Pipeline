import { type NextRequest, NextResponse } from "next/server"
import { runYouTubeContentPipeline } from "@/lib/youtube-pipeline"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Environment check - API key exists:", !!process.env.OPENAI_API_KEY)
    console.log("[v0] Environment check - API key starts with sk-:", process.env.OPENAI_API_KEY?.startsWith("sk-"))

    const body = await request.json()
    const { topic, notes, duration } = body

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "Topic is required and must be a non-empty string" }, { status: 400 })
    }

    const videoDuration = duration && typeof duration === "number" ? Math.max(1, Math.min(60, duration)) : 10

    console.log("[v0] Starting YouTube pipeline for topic:", topic)
    console.log(
      "[v0] Request details - topic length:",
      topic.length,
      "notes length:",
      notes?.length || 0,
      "duration:",
      videoDuration,
    )

    const progressUpdates: Array<{ stage: string; message: string; timestamp: number }> = []

    const result = await runYouTubeContentPipeline(
      topic.trim(),
      notes?.trim() || "",
      videoDuration,
      (stage, message) => {
        progressUpdates.push({ stage, message, timestamp: Date.now() })
        console.log(`[v0] Progress: ${stage} - ${message}`)
      },
    )

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: "YouTube content pipeline completed successfully",
      files: Object.keys(result.files),
      downloadableFiles: result.downloadableFiles, // Return dynamic file list
      progressUpdates, // Return progress history
    })
  } catch (error) {
    console.error("[v0] API error with full context:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      hasApiKey: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: "Failed to generate YouTube content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "YouTube Content Pipeline API",
    endpoints: {
      POST: "/api/youtube - Generate YouTube content",
      GET: "/api/download/[jobId]/[filename] - Download generated files",
    },
  })
}
