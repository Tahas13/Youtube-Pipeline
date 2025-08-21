# YouTube Content Pipeline MVP

A comprehensive AI-powered system that transforms a simple video topic into complete YouTube metadata using three specialized AI agents.

## Features

- **Research Agent**: Analyzes trends, keywords, and competitor content
- **Planning Agent**: Creates production checklists and content structure  
- **Production Agent**: Generates titles, descriptions, tags, captions, and thumbnail prompts

## Generated Files

For each video topic, the system generates:
- `metadata.md` - Copy-paste ready YouTube metadata
- `captions.srt` - SRT subtitle file for first 60-90 seconds
- `thumbnail_prompt.txt` - AI thumbnail generation prompt
- `youtube.json` - Complete metadata in JSON format
- `researcher.json` - SEO research data
- `planner.json` - Content planning data

## Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   - Copy `.env.local` and add your OpenAI API key
   - Get your API key from: https://platform.openai.com/api-keys

3. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open Application**
   - Navigate to `http://localhost:3000`
   - Enter a video topic and generate content!

## Usage

1. Enter your video topic (e.g., "AI demo: RAG agent build")
2. Add optional context or requirements
3. Click "Generate YouTube Content"
4. Download the generated files
5. Copy-paste `metadata.md` content into YouTube Studio

## Project Structure

\`\`\`
/
├── app/
│   ├── api/youtube/route.ts          # Main API endpoint
│   ├── api/download/[...]/route.ts   # File download endpoint
│   └── page.tsx                      # Main application page
├── components/
│   └── youtube-pipeline.tsx          # Main UI component
├── lib/
│   ├── openai-client.ts             # OpenAI API wrapper
│   ├── file-utils.ts                # File system utilities
│   ├── prompts.ts                   # AI agent prompts
│   └── youtube-pipeline.ts          # Main pipeline orchestrator
└── artifacts/                       # Generated files (created at runtime)
\`\`\`

## API Endpoints

- `POST /api/youtube` - Generate YouTube content
- `GET /api/download/[jobId]/[filename]` - Download generated files

## Requirements

- Node.js 18+
- OpenAI API key
- Next.js 14+

## License

MIT License

