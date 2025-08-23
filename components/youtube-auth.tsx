"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Youtube, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface YouTubeAuthProps {
  onAuthenticated: (credentials: any) => void
}

export function YouTubeAuth({ onAuthenticated }: YouTubeAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async () => {
    setIsAuthenticating(true)
    setError(null)

    try {
      const response = await fetch("/api/youtube-auth")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to get auth URL")
      }

      const { authUrl } = data
      setAuthUrl(authUrl)

      const popup = window.open(authUrl, "youtube-auth", "width=500,height=600,scrollbars=yes,resizable=yes")

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        // Popup blocked - show manual redirect option
        setError("Popup blocked. Please click the link below to authenticate manually.")
        setIsAuthenticating(false)
        return
      }

      // Listen for auth code from popup
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === "YOUTUBE_AUTH_CODE") {
          const code = event.data.code
          popup.close()

          try {
            const tokenResponse = await fetch("/api/youtube-auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            })

            const tokenData = await tokenResponse.json()

            if (!tokenResponse.ok) {
              throw new Error(tokenData.error || "Failed to exchange code for tokens")
            }

            onAuthenticated(tokenData.tokens)
            setIsAuthenticating(false)
            setAuthUrl(null)
          } catch (error: any) {
            console.error("[v0] Token Error:", error)
            setError(error.message)
            setIsAuthenticating(false)
          }

          window.removeEventListener("message", messageHandler)
        }
      }

      window.addEventListener("message", messageHandler)

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setIsAuthenticating(false)
          window.removeEventListener("message", messageHandler)
        }
      }, 1000)
    } catch (error: any) {
      console.error("[v0] Auth Error:", error)
      setError(error.message)
      setIsAuthenticating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          Connect to YouTube
        </CardTitle>
        <CardDescription>Authenticate with YouTube to directly upload your generated content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAuth} disabled={isAuthenticating} className="w-full">
          {isAuthenticating ? (
            "Authenticating..."
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect YouTube Account
            </>
          )}
        </Button>

        {error && authUrl && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Click here to authenticate manually
              </a>
              <p className="text-xs text-muted-foreground">
                After authenticating, copy the authorization code and paste it back here.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {error && !authUrl && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
