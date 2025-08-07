import { NextResponse } from 'next/server'

export async function GET() {
  const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
  const awsKey = process.env.AWS_ACCESS_KEY_ID
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY
  const awsRegion = process.env.AWS_REGION
  
  return NextResponse.json({
    openai: {
      hasKey: !!openaiKey,
      keyLength: openaiKey ? openaiKey.length : 0,
      startsWithSk: openaiKey ? openaiKey.startsWith('sk-') : false,
      isPlaceholder: openaiKey === 'your-openai-api-key-here',
      envVarNames: {
        OPENAI_KEY: !!process.env.OPENAI_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
      }
    },
    aws: {
      hasAccessKey: !!awsKey,
      hasSecretKey: !!awsSecret,
      hasRegion: !!awsRegion,
      region: awsRegion || 'not set'
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    }
  })
}