import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey.startsWith('your-')) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing or has default value',
        apiKeyStatus: apiKey ? 'Has default placeholder value' : 'Not set'
      })
    }
    
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key format',
        details: 'OpenAI API keys should start with "sk-"',
        apiKeyPrefix: apiKey.substring(0, 3)
      })
    }
    
    // Test the API key with a simple request
    const openai = new OpenAI({ apiKey })
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: "Say 'API key test successful'" }
      ],
      max_tokens: 10
    })
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API key is working correctly',
      testResponse: response.choices[0]?.message?.content,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 7) + '...'
    })
    
  } catch (error) {
    console.error('OpenAI test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'OpenAI API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}