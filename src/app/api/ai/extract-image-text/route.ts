import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

/**
 * POST /api/ai/extract-image-text
 * Body: { base64Image: string, mimeType: string }
 * Returns: { text: string }
 */
export async function POST(req: Request) {
  try {
    const { base64Image, mimeType } = await req.json()

    if (!base64Image || !mimeType) {
      return NextResponse.json(
        { error: 'base64Image and mimeType are required' },
        { status: 400 }
      )
    }

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
                data: base64Image,
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

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('[extract-image-text] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract text from image' },
      { status: 500 }
    )
  }
}
