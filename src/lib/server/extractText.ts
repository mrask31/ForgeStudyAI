import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'

// Lazy-initialize OpenAI client for embeddings only
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

// Lazy-initialize Anthropic client for vision OCR
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

const parseStorageUrl = (fileUrl: string) => {
  const trimmed = fileUrl.replace(/^\/+/, '')
  const [bucket, ...rest] = trimmed.split('/')
  return { bucket, path: rest.join('/') }
}

const extractPdfText = async (buffer: ArrayBuffer) => {
  const data = new Uint8Array(buffer)
  const pdf = await pdfjsLib.getDocument({ data }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += `${pageText}\n`
  }
  return fullText.trim()
}

const extractImageText = async (buffer: ArrayBuffer, mimeType: string) => {
  const base64 = Buffer.from(buffer).toString('base64')
  
  const anthropic = getAnthropicClient()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Extract all visible text from this image exactly as written. Return only the text content, no additional commentary.',
          },
        ],
      },
    ],
  })
  
  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}

export async function extractTextFromBuffer(buffer: ArrayBuffer, mimeType: string | null) {
  if (!mimeType) {
    return Buffer.from(buffer).toString('utf-8').trim()
  }
  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer)
  }
  if (mimeType === 'text/plain') {
    return Buffer.from(buffer).toString('utf-8').trim()
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
    return result.value.trim()
  }
  if (mimeType.startsWith('image/')) {
    return extractImageText(buffer, mimeType)
  }
  return Buffer.from(buffer).toString('utf-8').trim()
}

export async function fetchStorageFile(
  supabase: any,
  fileUrl: string
): Promise<{ buffer: ArrayBuffer; mimeType: string | null }> {
  const { bucket, path } = parseStorageUrl(fileUrl)
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) {
    throw new Error('Failed to access file')
  }
  const response = await fetch(data.signedUrl)
  if (!response.ok) {
    throw new Error('Failed to download file')
  }
  const mimeType = response.headers.get('content-type')
  const buffer = await response.arrayBuffer()
  return { buffer, mimeType }
}
