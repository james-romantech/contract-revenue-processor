import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to verify full PDF is being sent to Azure
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
    
    if (!endpoint || !apiKey) {
      return NextResponse.json({ error: 'Azure not configured' }, { status: 500 })
    }
    
    console.log('Testing full PDF extraction with Azure S1 tier')
    console.log('File details:', {
      name: file.name,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB',
      bufferLength: buffer.length
    })
    
    // Try different API versions and parameters
    const cleanEndpoint = endpoint.replace(/\/+$/, '')
    
    // Test 1: Default Read API
    const defaultUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`
    
    // Test 2: With explicit page range
    const withPagesUrl = `${cleanEndpoint}/vision/v3.2/read/analyze?pages=1-100`
    
    // Test 3: Latest API version
    const latestUrl = `${cleanEndpoint}/vision/v4.0/read/analyze`
    
    // Use the default URL (can switch to test others)
    const testUrl = defaultUrl
    
    console.log('Using URL:', testUrl)
    
    const analyzeResponse = await fetch(testUrl, {
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
        error: 'Azure API error',
        status: analyzeResponse.status,
        detail: errorText,
        url: testUrl
      }, { status: 500 })
    }
    
    const operationLocation = analyzeResponse.headers.get('Operation-Location')
    if (!operationLocation) {
      return NextResponse.json({ error: 'No operation location' }, { status: 500 })
    }
    
    console.log('Operation location:', operationLocation)
    
    // Wait for results with longer timeout for S1 tier
    let result
    let attempts = 0
    const maxAttempts = 120 // 4 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const resultResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      })
      
      if (!resultResponse.ok) {
        return NextResponse.json({
          error: 'Failed to get results',
          status: resultResponse.status
        }, { status: 500 })
      }
      
      result = await resultResponse.json()
      
      console.log(`Attempt ${attempts + 1}: Status = ${result.status}, Pages found = ${result.analyzeResult?.readResults?.length || 0}`)
      
      if (result.status === 'succeeded') {
        break
      } else if (result.status === 'failed') {
        return NextResponse.json({
          error: 'OCR failed',
          azureError: result
        }, { status: 500 })
      }
      
      attempts++
    }
    
    if (!result || result.status !== 'succeeded') {
      return NextResponse.json({
        error: 'OCR timed out',
        lastStatus: result?.status,
        attempts: attempts
      }, { status: 500 })
    }
    
    // Extract detailed page information
    let pageInfo = []
    let fullText = ''
    
    if (result.analyzeResult?.readResults) {
      console.log(`Azure returned ${result.analyzeResult.readResults.length} pages`)
      
      for (const page of result.analyzeResult.readResults) {
        const pageText = page.lines?.map((line: any) => line.text).join('\n') || ''
        
        pageInfo.push({
          pageNumber: page.page,
          lineCount: page.lines?.length || 0,
          characterCount: pageText.length,
          width: page.width,
          height: page.height,
          unit: page.unit
        })
        
        fullText += `\n--- Page ${page.page} ---\n${pageText}\n`
      }
    }
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        sizeKB: (file.size / 1024).toFixed(2) + ' KB'
      },
      azure: {
        url: testUrl,
        tier: 'S1 (Developer)',
        pagesProcessed: pageInfo.length,
        totalCharacters: fullText.length
      },
      pages: pageInfo,
      extraction: {
        firstPage: fullText.substring(0, 500),
        lastPage: fullText.substring(Math.max(0, fullText.length - 500))
      },
      debug: {
        operationLocation: operationLocation,
        attempts: attempts,
        modelVersion: result.analyzeResult?.modelVersion
      }
    })
    
  } catch (error) {
    console.error('Test full PDF error:', error)
    return NextResponse.json({
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}