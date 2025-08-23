import { google } from "googleapis"
import path from "path";
import fs from "fs";


const youtube = google.youtube("v3")

export interface YouTubeCredentials {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  expiry_date: number
}

export class YouTubeUploader {
  private oauth2Client: any

  constructor(credentials: YouTubeCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    this.oauth2Client.setCredentials(credentials)
  }

  async createVideoDraft(metadata: {
    title: string
    description: string
    tags?: string[] | string
    categoryId?: string
    privacyStatus?: "private" | "public" | "unlisted"
  }) {
    try {
      let title = metadata.title?.trim() || "Untitled Video"
      if (title.length > 100) title = title.substring(0, 100)

      let description = metadata.description?.trim() || ""

      // convert escaped "\n" into real newlines
      description = description.replace(/\\n/g, "\n")

      // enforce YouTube 5000 char limit
      if (description.length > 5000) {
        description = description.substring(0, 5000)
      }


      let safeTags: string[] = []
      if (metadata.tags) {
        if (Array.isArray(metadata.tags)) {
          safeTags = metadata.tags
        } else if (typeof metadata.tags === "string") {
          safeTags = metadata.tags.split(/[,|\n]/)
        }

        safeTags = safeTags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0 && tag.length <= 30)
          .map((tag) => tag.replace(/[^a-zA-Z0-9 \-_]/g, ""))
          .filter((tag) => tag.length > 0)
          .slice(0, 15)
      }

      const snippet: any = {
        title,
        description,
        categoryId: metadata.categoryId || "22",
      }

      if (safeTags.length > 0) {
        snippet.tags = safeTags
      }

      const status: any = {
        privacyStatus: metadata.privacyStatus || "private",
      }

      console.log("[v0] YouTube API Request:", {
        part: "snippet,status",
        snippet,
        status,
      })

      // ✅ Path to your constant placeholder video
      const videoPath = path.resolve("public/draft.mp4")

      const response = await youtube.videos.insert({
        auth: this.oauth2Client,
        part: "snippet,status",
        requestBody: {
          snippet,
          status,
        },
        media: {
          body: fs.createReadStream(videoPath), // ✅ attach file stream
        },
      })

      return {
        success: true,
        videoId: response.data.id,
        url: `https://studio.youtube.com/video/${response.data.id}/edit`,
      }
    } catch (error: any) {
      console.error("[v0] YouTube API Error:", {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.response?.data || error.details,
        errors: error.response?.data?.error?.errors || [],
        fullError: error,
      })
      return { success: false, error: error.message }
    }
  }

  async uploadCaptions(videoId: string, srtContent: string, language = "en") {
    try {
      const response = await youtube.captions.insert({
        auth: this.oauth2Client,
        part: "snippet",
        resource: {
          snippet: {
            videoId,
            language,
            name: "Auto-generated captions",
            isDraft: false,
          },
        },
        media: {
          mimeType: "text/plain",
          body: srtContent,
        },
      })

      return { success: true, captionId: response.data.id }
    } catch (error: any) {
      console.error("[v0] Caption Upload Error:", {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.response?.data || error.details,
      })
      return { success: false, error: error.message }
    }
  }
}

export function getAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  const scopes = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"]

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)

    return { success: true, tokens }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
