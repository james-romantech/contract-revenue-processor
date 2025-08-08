import { NextResponse } from 'next/server'

export async function GET() {
  const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
  const key = process.env.AZURE_COMPUTER_VISION_KEY
  
  // Simple status check
  if (!endpoint || !key) {
    return NextResponse.json({
      status: 'NOT_CONFIGURED',
      message: 'Azure Computer Vision is NOT configured',
      instructions: [
        '1. Add AZURE_COMPUTER_VISION_KEY to Vercel Environment Variables',
        '2. Add AZURE_COMPUTER_VISION_ENDPOINT to Vercel Environment Variables', 
        '3. Redeploy your application from Vercel dashboard',
        '4. Visit this endpoint again to verify'
      ]
    })
  }
  
  // Check if they look valid
  const keyLooksValid = key.length === 32 && /^[a-f0-9]+$/i.test(key)
  const endpointLooksValid = endpoint.startsWith('https://') && endpoint.includes('cognitiveservices.azure.com')
  
  if (!keyLooksValid || !endpointLooksValid) {
    return NextResponse.json({
      status: 'POSSIBLY_INVALID',
      message: 'Azure credentials are set but may be invalid',
      details: {
        keyLength: key.length,
        keyFormat: keyLooksValid ? 'Valid format' : 'Invalid format (should be 32 hex characters)',
        endpointFormat: endpointLooksValid ? 'Valid format' : 'Invalid format (should be https://YOUR-RESOURCE.cognitiveservices.azure.com/)',
        endpointValue: endpoint.substring(0, 30) + '...'
      }
    })
  }
  
  // Try to actually call Azure
  try {
    const testUrl = `${endpoint.replace(/\/+$/, '')}/vision/v3.2/read/analyze`
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream'
      },
      body: Buffer.from('test')
    })
    
    if (response.status === 401) {
      return NextResponse.json({
        status: 'INVALID_KEY',
        message: 'Azure API key is invalid',
        instructions: 'Get the correct key from Azure Portal → Computer Vision → Keys'
      })
    }
    
    if (response.status === 404) {
      return NextResponse.json({
        status: 'INVALID_ENDPOINT',
        message: 'Azure endpoint URL is incorrect',
        instructions: 'Get the correct endpoint from Azure Portal → Computer Vision → Keys and Endpoint'
      })
    }
    
    // 400 is expected for invalid image data, but it means the API is working
    if (response.status === 400) {
      return NextResponse.json({
        status: 'WORKING',
        message: '✅ Azure Computer Vision is properly configured and working!',
        details: {
          endpoint: endpoint.substring(0, 30) + '...',
          keyLength: key.length,
          apiResponse: 'Connection successful'
        }
      })
    }
    
    return NextResponse.json({
      status: 'UNKNOWN',
      message: 'Unexpected response from Azure',
      statusCode: response.status,
      statusText: response.statusText
    })
    
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      message: 'Failed to test Azure connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}