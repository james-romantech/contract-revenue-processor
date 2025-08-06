import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      deployment: {
        nodeVersion: process.version,
        platform: process.platform,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV
      },
      openaiConfig: {
        hasKey: !!openaiKey,
        keyLength: openaiKey ? openaiKey.length : 0,
        keyStart: openaiKey ? openaiKey.substring(0, 8) : 'none',
        isPlaceholder: openaiKey === 'your-openai-api-key-here',
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
      },
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}