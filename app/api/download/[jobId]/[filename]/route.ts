import { type NextRequest, NextResponse } from "next/server"
import { getArtifactsPath, fileExists, readTextFile } from "@/lib/file-utils"
import path from "path"

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string; filename: string }> }) {
  try {
    const { jobId, filename } = await params

    if (!jobId || !filename) {
      return NextResponse.json({ error: "Job ID and filename are required" }, { status: 400 })
    }

    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    const artifactsPath = getArtifactsPath(jobId)
    const filePath = path.join(artifactsPath, filename)

    if (!fileExists(filePath)) {
      return NextResponse.json(
        {
          error: "File not found",
          details: `The file "${filename}" does not exist for job ${jobId}`,
        },
        { status: 404 },
      )
    }

    let fileContent: string
    try {
      fileContent = readTextFile(filePath)
    } catch (readError) {
      console.error("[v0] File read error:", readError)
      return NextResponse.json(
        {
          error: "Failed to read file",
          details: "The file exists but could not be read",
        },
        { status: 500 },
      )
    }

    const fileExtension = path.extname(filename).toLowerCase()

    // Determine content type based on file extension
    let contentType = "text/plain"
    if (fileExtension === ".json") {
      contentType = "application/json"
    } else if (fileExtension === ".md") {
      contentType = "text/markdown"
    } else if (fileExtension === ".srt") {
      contentType = "text/plain"
    }

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(fileContent, "utf8").toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[v0] Download error:", error)
    return NextResponse.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    )
  }
}
