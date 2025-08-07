import { NextResponse } from 'next/server'

export async function GET() {
  const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
  const azureEndpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
  const azureKey = process.env.AZURE_COMPUTER_VISION_KEY
  
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
    azure: {
      hasEndpoint: !!azureEndpoint,
      hasKey: !!azureKey,
      endpointFormat: azureEndpoint ? azureEndpoint.includes('cognitiveservices.azure.com') : false,
      keyLength: azureKey ? azureKey.length : 0
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    }
  })
}