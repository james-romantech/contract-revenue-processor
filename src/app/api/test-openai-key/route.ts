import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    
    console.log('Testing OpenAI API key...')
    console.log('Key check:', {
      hasKey: !!openaiKey,
      keyLength: openaiKey ? openaiKey.length : 0,
      keyStart: openaiKey ? openaiKey.substring(0, 8) : 'none',
      isPlaceholder: openaiKey === 'your-openai-api-key-here'
    })
    
    if (!openaiKey || openaiKey === 'your-openai-api-key-here') {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        details: {
          hasKey: !!openaiKey,
          isPlaceholder: openaiKey === 'your-openai-api-key-here'
        }
      }, { status: 400 })
    }
    
    const openai = new OpenAI({
      apiKey: openaiKey,
    })
    
    // Simple test call
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'API key works!'" }],
      max_tokens: 10
    })
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API key is working',
      response: completion.choices[0]?.message?.content,
      keyInfo: {
        keyLength: openaiKey.length,
        keyStart: openaiKey.substring(0, 8)
      }
    })
    
  } catch (error) {
    console.error('OpenAI test error:', error)
    return NextResponse.json({
      error: 'OpenAI API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}