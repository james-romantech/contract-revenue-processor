import { NextRequest, NextResponse } from 'next/server'

// Test Azure OCR directly with a simple image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Check credentials
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY
    
    if (!endpoint || !apiKey) {
      return NextResponse.json({
        error: 'Azure credentials not configured',
        hasEndpoint: !!endpoint,
        hasKey: !!apiKey
      }, { status: 500 })
    }
    
    // Clean endpoint
    const cleanEndpoint = endpoint.replace(/\/+$/, '')
    const readUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`
    
    console.log('Testing Azure OCR with:', {
      url: readUrl,
      fileSize: buffer.length,
      keyPreview: apiKey.substring(0, 4) + '...'
    })
    
    // Step 1: Submit for analysis
    const analyzeResponse = await fetch(readUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    })
    
    const responseHeaders = Object.fromEntries(analyzeResponse.headers.entries())
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text()
      return NextResponse.json({
        error: 'Azure API error',
        status: analyzeResponse.status,
        statusText: analyzeResponse.statusText,
        errorDetail: errorText,
        headers: responseHeaders,
        diagnosis: getDiagnosis(analyzeResponse.status)
      }, { status: 500 })
    }
    
    // Get operation location
    const operationLocation = analyzeResponse.headers.get('Operation-Location') || 
                             analyzeResponse.headers.get('operation-location')
    
    if (!operationLocation) {
      return NextResponse.json({
        error: 'No operation location',
        headers: responseHeaders
      }, { status: 500 })
    }
    
    // Step 2: Wait and get results
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
    
    const resultResponse = await fetch(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    })
    
    if (!resultResponse.ok) {
      const errorText = await resultResponse.text()
      return NextResponse.json({
        error: 'Failed to get results',
        status: resultResponse.status,
        errorDetail: errorText
      }, { status: 500 })
    }
    
    const result = await resultResponse.json()
    
    // Extract text
    let extractedText = ''
    if (result.analyzeResult?.readResults) {
      for (const page of result.analyzeResult.readResults) {
        for (const line of page.lines || []) {
          extractedText += line.text + '\n'
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      status: result.status,
      textLength: extractedText.length,
      pageCount: result.analyzeResult?.readResults?.length || 0,
      preview: extractedText.substring(0, 500),
      operationLocation,
      azureResponse: result
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

function getDiagnosis(status: number): string {
  switch (status) {
    case 401:
      return 'API Key is invalid. Check AZURE_COMPUTER_VISION_KEY in Vercel environment variables.'
    case 403:
      return 'Subscription quota exceeded or region not supported. Check Azure portal.'
    case 404:
      return 'Endpoint URL is incorrect. Should be like: https://YOUR-RESOURCE.cognitiveservices.azure.com/'
    case 413:
      return 'File too large (max 50MB for Azure OCR).'
    case 429:
      return 'Rate limit exceeded. Wait a moment and try again.'
    default:
      return 'Unknown error. Check Azure service status.'
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST a file to test Azure OCR',
    endpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT ? 'configured' : 'missing',
    key: process.env.AZURE_COMPUTER_VISION_KEY ? 'configured' : 'missing'
  })
}