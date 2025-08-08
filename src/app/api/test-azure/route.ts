import { NextResponse } from 'next/server'

export async function GET() {
  const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
  const key = process.env.AZURE_COMPUTER_VISION_KEY
  
  return NextResponse.json({
    azure_configured: !!(endpoint && key),
    has_endpoint: !!endpoint,
    endpoint_length: endpoint?.length || 0,
    endpoint_starts_with: endpoint?.substring(0, 8),
    has_key: !!key,
    key_length: key?.length || 0,
    key_starts_with: key?.substring(0, 4),
    message: endpoint && key 
      ? 'Azure Computer Vision is configured' 
      : 'Azure Computer Vision is NOT configured - please add AZURE_COMPUTER_VISION_ENDPOINT and AZURE_COMPUTER_VISION_KEY to Vercel environment variables'
  })
}