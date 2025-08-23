import { type NextRequest, NextResponse } from "next/server"
import { getAuthUrl, getTokensFromCode } from "@/lib/youtube-api"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (code) {
      console.log("[v0] Processing OAuth callback with code:", code.substring(0, 20) + "...")

      // Instead of exchanging tokens here, just send the code back to the opener window
      // The frontend will handle calling POST /api/youtube-auth with the code
      const html = `
        <script>
          window.opener.postMessage(
            { type: "YOUTUBE_AUTH_CODE", code: "${code}" },
            window.location.origin
          );
          window.close();
        </script>
      `
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      })
    }

    if (error) {
      console.error("[v0] OAuth error from Google:", error)
      const html = `
        <script>
          window.opener.postMessage(
            { type: "YOUTUBE_AUTH_ERROR", error: "${error}" },
            window.location.origin
          );
          window.close();
        </script>
      `
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Step 1: return Google OAuth URL
    const authUrl = getAuthUrl()
    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error("[v0] Auth Error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Authorization code required" }, { status: 400 })
    }

    const result = await getTokensFromCode(code)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Return tokens to the frontend
    return NextResponse.json({ tokens: result.tokens })
  } catch (error: any) {
    console.error("[v0] Token Exchange Error:", error)
    return NextResponse.json({ error: "Failed to exchange code for tokens" }, { status: 500 })
  }
}
