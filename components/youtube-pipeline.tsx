"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Download, CheckCircle, AlertCircle, Play, FileText, Clock, Youtube, ExternalLink } from "lucide-react"
import { YouTubeAuth } from "./youtube-auth"

interface DownloadableFile {
  name: string
  description: string
  size?: number
}

interface ProgressUpdate {
  stage: string
  message: string
  timestamp: number
}

interface GenerationResult {
  jobId: string
  downloadableFiles: DownloadableFile[]
  progressUpdates: ProgressUpdate[]
}

export default function YouTubePipeline() {
  const [topic, setTopic] = useState("")
  const [notes, setNotes] = useState("")
  const [duration, setDuration] = useState("10")
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null)
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({})
  const [youtubeCredentials, setYoutubeCredentials] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a video topic")
      return
    }

    const durationNum = Number.parseInt(duration)
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 60) {
      setError("Video duration must be between 1 and 60 minutes")
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)
    setCurrentProgress(null)
    setDownloadErrors({})

    try {
      const progressStages = [
        { stage: "research", message: "Analyzing trends and keywords...", progress: 25 },
        { stage: "planning", message: "Creating content structure...", progress: 50 },
        { stage: "production", message: "Generating titles and captions...", progress: 75 },
        { stage: "finalizing", message: "Saving files...", progress: 90 },
        { stage: "complete", message: "All files generated!", progress: 100 },
      ]

      let currentStageIndex = 0
      const progressInterval = setInterval(() => {
        if (currentStageIndex < progressStages.length) {
          setCurrentProgress({
            stage: progressStages[currentStageIndex].stage,
            message: progressStages[currentStageIndex].message,
            timestamp: Date.now(),
          })
          currentStageIndex++
        }
      }, 1500)

      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          notes: notes.trim(),
          duration: durationNum,
        }),
      })

      clearInterval(progressInterval)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content")
      }

      setResult({
        jobId: data.jobId,
        downloadableFiles: data.downloadableFiles || [],
        progressUpdates: data.progressUpdates || [],
      })

      setCurrentProgress({ stage: "complete", message: "Generation completed successfully!", timestamp: Date.now() })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setCurrentProgress({ stage: "error", message: "Generation failed", timestamp: Date.now() })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (filename: string) => {
    if (!result) return

    setDownloadErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[filename]
      return newErrors
    })

    try {
      const response = await fetch(`/api/download/${result.jobId}/${filename}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Download failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get("content-disposition")
      const suggestedFilename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || filename

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = suggestedFilename
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Download failed"
      setDownloadErrors((prev) => ({
        ...prev,
        [filename]: errorMessage,
      }))
    }
  }

  const handleYouTubeUpload = async (titleIndex = 0) => {
    if (!result || !youtubeCredentials) return

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch("/api/youtube-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: result.jobId,
          credentials: youtubeCredentials,
          titleIndex,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload to YouTube")
      }

      setUploadResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const getProgressPercentage = () => {
    if (!currentProgress) return 0
    const stageProgress: Record<string, number> = {
      research: 25,
      planning: 50,
      production: 75,
      finalizing: 90,
      complete: 100,
      error: 0,
    }
    return stageProgress[currentProgress.stage] || 0
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">YouTube Content Pipeline</h1>
        <p className="text-muted-foreground">
          Transform your video topic into complete YouTube metadata using AI agents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Generate Content
          </CardTitle>
          <CardDescription>
            Enter your video topic, duration, and optional context to generate titles, descriptions, tags, captions, and
            more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="topic" className="text-sm font-medium">
              Video Topic *
            </label>
            <Input
              id="topic"
              placeholder="e.g., AI demo: RAG agent build"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Expected Video Duration (minutes) *
            </label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="60"
              placeholder="10"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              This determines the length of captions and timestamp structure (1-60 minutes)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Additional Context (Optional)
            </label>
            <Textarea
              id="notes"
              placeholder="Optional context, links, target audience, specific requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isGenerating}
              rows={4}
            />
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Content...
              </>
            ) : (
              "Generate YouTube Content"
            )}
          </Button>

          {isGenerating && currentProgress && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{currentProgress.message}</span>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
              <p className="text-xs text-blue-600">
                Stage: {currentProgress.stage} • {getProgressPercentage()}% complete
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {!youtubeCredentials && <YouTubeAuth onAuthenticated={setYoutubeCredentials} />}

      {result && youtubeCredentials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              Upload to YouTube Studio
            </CardTitle>
            <CardDescription>Directly upload your generated content to YouTube as a private draft</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  Successfully uploaded to YouTube Studio!
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.open(uploadResult.studioUrl, "_blank")}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in YouTube Studio
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleYouTubeUpload(0)} disabled={isUploading} className="w-full">
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading to YouTube...
                  </>
                ) : (
                  <>
                    <Youtube className="mr-2 h-4 w-4" />
                    Upload to YouTube Studio
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Content Generated Successfully
            </CardTitle>
            <CardDescription>
              Job ID: <Badge variant="secondary">{result.jobId}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your YouTube content has been generated! Download the files below:
              </p>

              <div className="grid gap-2">
                {result.downloadableFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{file.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                      {downloadErrors[file.name] && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {downloadErrors[file.name]}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file.name)}
                      disabled={!!downloadErrors[file.name]}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Quick Start:</strong> Download <code>metadata.md</code> first - it contains copy-paste ready
                  content for YouTube Studio!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto font-semibold">
                1
              </div>
              <h3 className="font-medium">Research</h3>
              <p className="text-sm text-muted-foreground">AI analyzes trends, keywords, and competitor content</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto font-semibold">
                2
              </div>
              <h3 className="font-medium">Plan</h3>
              <p className="text-sm text-muted-foreground">Creates production checklist and content structure</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto font-semibold">
                3
              </div>
              <h3 className="font-medium">Produce</h3>
              <p className="text-sm text-muted-foreground">
                Generates titles, descriptions, tags, captions, and thumbnail prompts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
