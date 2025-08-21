import fs from "fs"
import path from "path"

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function writeTextFile(filePath: string, content: string) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, "utf8")
}

export function writeJSONFile(filePath: string, data: any) {
  const jsonContent = JSON.stringify(data, null, 2)
  writeTextFile(filePath, jsonContent)
}

export function readTextFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, "utf8")
}

export function readJSONFile(filePath: string): any {
  const content = readTextFile(filePath)
  return JSON.parse(content)
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

export function getArtifactsPath(jobId: string): string {
  return path.join(process.cwd(), "artifacts", jobId)
}
