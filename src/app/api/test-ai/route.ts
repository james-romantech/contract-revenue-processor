import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      })
    }

    const openai = new OpenAI({ apiKey })
    
    // Simple test prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "AI is working" in exactly 3 words'
        }
      ],
      max_tokens: 10,
      temperature: 0
    })

    return NextResponse.json({
      success: true,
      response: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    })
  }
}