import { NextRequest, NextResponse } from 'next/server'

// Force Azure OCR on any uploaded file to test if it works
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Check Azure credentials
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY
    
    console.log('Force Azure OCR - Credentials check:', {
      hasEndpoint: !!endpoint,
      endpointPreview: endpoint ? endpoint.substring(0, 40) + '...' : 'not set',
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0
    })
    
    if (!endpoint || !apiKey) {
      return NextResponse.json({
        error: 'Azure not configured',
        envVars: {
          AZURE_COMPUTER_VISION_ENDPOINT: endpoint ? 'Set' : 'Missing',
          AZURE_COMPUTER_VISION_KEY: apiKey ? 'Set' : 'Missing'
        }
      }, { status: 500 })
    }
    
    // Clean endpoint
    const cleanEndpoint = endpoint.replace(/\/+$/, '')
    const readUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`
    
    console.log('Attempting Azure OCR with:', {
      url: readUrl,
      fileSize: buffer.length
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
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text()
      return NextResponse.json({
        error: 'Azure API rejected request',
        status: analyzeResponse.status,
        statusText: analyzeResponse.statusText,
        errorDetail: errorText,
        diagnosis: getDiagnosis(analyzeResponse.status)
      }, { status: 500 })
    }
    
    // Get operation location
    const operationLocation = analyzeResponse.headers.get('Operation-Location') || 
                             analyzeResponse.headers.get('operation-location')
    
    if (!operationLocation) {
      return NextResponse.json({
        error: 'No operation location returned'
      }, { status: 500 })
    }
    
    console.log('Document submitted, waiting for results...')
    
    // Step 2: Wait for results
    let result
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
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
      
      result = await resultResponse.json()
      
      if (result.status === 'succeeded') {
        break
      } else if (result.status === 'failed') {
        return NextResponse.json({
          error: 'OCR processing failed',
          azureError: result
        }, { status: 500 })
      }
      
      attempts++
    }
    
    if (!result || result.status !== 'succeeded') {
      return NextResponse.json({
        error: 'OCR processing timed out',
        lastStatus: result?.status
      }, { status: 500 })
    }
    
    // Extract text
    let fullText = ''
    let pageCount = 0
    
    if (result.analyzeResult?.readResults) {
      pageCount = result.analyzeResult.readResults.length
      for (const page of result.analyzeResult.readResults) {
        fullText += `--- Page ${page.page} ---\n`
        for (const line of page.lines || []) {
          fullText += line.text + '\n'
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '✅ Azure OCR is working!',
      textLength: fullText.length,
      pageCount: pageCount,
      preview: fullText.substring(0, 500),
      fullText: fullText
    })
    
  } catch (error) {
    console.error('Force Azure OCR error:', error)
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
      return 'API Key is invalid. Check AZURE_COMPUTER_VISION_KEY in Vercel.'
    case 403:
      return 'Subscription quota exceeded or region not supported.'
    case 404:
      return 'Endpoint URL is incorrect. Check AZURE_COMPUTER_VISION_ENDPOINT.'
    case 413:
      return 'File too large (max 50MB).'
    case 429:
      return 'Rate limit exceeded. Wait and try again.'
    default:
      return `HTTP ${status} error`
  }
}