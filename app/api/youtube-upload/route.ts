import { type NextRequest, NextResponse } from "next/server"
import { YouTubeUploader } from "@/lib/youtube-api"
import { readJSON, readText } from "@/lib/file-utils"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const { jobId, credentials, titleIndex = 0 } = await request.json()

    if (!jobId || !credentials) {
      return NextResponse.json({ error: "Job ID and credentials required" }, { status: 400 })
    }

    const artifactsPath = path.join(process.cwd(), "artifacts", jobId)

    // Read generated content
    const youtubeData = await readJSON(path.join(artifactsPath, "youtube.json"))
    const srtContent = await readText(path.join(artifactsPath, "captions.srt"))

    const uploader = new YouTubeUploader(credentials)

    // Create video draft
    const videoResult = await uploader.createVideoDraft({
      title: youtubeData.titles[titleIndex],
      description: youtubeData.description,
      tags: youtubeData.tags,
      privacyStatus: "private",
    })

    if (!videoResult.success) {
      return NextResponse.json({ error: videoResult.error }, { status: 400 })
    }

    // Upload captions
    const captionResult = await uploader.uploadCaptions(videoResult.videoId!, srtContent)

    return NextResponse.json({
      success: true,
      videoId: videoResult.videoId,
      studioUrl: videoResult.url,
      captionsUploaded: captionResult.success,
    })
  } catch (error: any) {
    console.error("[v0] Upload Error:", error)
    return NextResponse.json({ error: "Failed to upload to YouTube" }, { status: 500 })
  }
}
