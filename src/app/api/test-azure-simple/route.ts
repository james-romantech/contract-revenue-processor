import { NextResponse } from 'next/server'

export async function GET() {
  const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
  const key = process.env.AZURE_COMPUTER_VISION_KEY
  
  // First, check if credentials exist
  if (!endpoint || !key) {
    return NextResponse.json({
      status: 'NOT_CONFIGURED',
      error: 'Azure credentials missing'
    })
  }
  
  // Try a simple health check to Azure
  try {
    const testUrl = `${endpoint.replace(/\/+$/, '')}/vision/v3.2/read/analyze`
    
    // Set a 5 second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream'
      },
      body: Buffer.from('test'),
      signal: controller.signal
    }).catch(err => {
      if (err.name === 'AbortError') {
        throw new Error('Azure connection timed out after 5 seconds - endpoint may be blocked by firewall')
      }
      throw err
    })
    
    clearTimeout(timeoutId)
    
    // We expect a 400 error for invalid image data - that's fine, it means Azure is reachable
    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Azure is reachable',
      httpStatus: response.status,
      azureEndpoint: endpoint.substring(0, 40) + '...',
      diagnosis: response.status === 400 ? '✅ Azure OCR is working (400 is expected for test data)' :
                 response.status === 401 ? '❌ Invalid API key' :
                 response.status === 404 ? '❌ Invalid endpoint URL' :
                 `Status ${response.status}`
    })
    
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis: error instanceof Error && error.message.includes('timed out') 
        ? '🔥 Azure endpoint is likely blocked by your network firewall'
        : '❌ Cannot connect to Azure'
    })
  }
}