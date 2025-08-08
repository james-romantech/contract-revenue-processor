import { NextRequest, NextResponse } from 'next/server'

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
    
    console.log(`Processing ${file.name}, size: ${buffer.length} bytes`)
    
    // Submit to Azure
    const cleanEndpoint = endpoint.replace(/\/+$/, '')
    const readUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`
    
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
        error: 'Azure API error',
        status: analyzeResponse.status,
        detail: errorText
      }, { status: 500 })
    }
    
    const operationLocation = analyzeResponse.headers.get('Operation-Location')
    if (!operationLocation) {
      return NextResponse.json({ error: 'No operation location' }, { status: 500 })
    }
    
    // Wait for results - longer wait for multi-page docs
    let result
    let attempts = 0
    const maxAttempts = 60
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second wait
      
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
      console.log(`Attempt ${attempts + 1}: Status = ${result.status}`)
      
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
        lastStatus: result?.status
      }, { status: 500 })
    }
    
    // Analyze the results
    let pageDetails = []
    let fullText = ''
    let totalCharacters = 0
    
    if (result.analyzeResult?.readResults) {
      for (const page of result.analyzeResult.readResults) {
        let pageText = ''
        
        // Add page marker
        pageText += `\n--- Page ${page.page} ---\n`
        
        // Add all lines
        for (const line of page.lines || []) {
          pageText += line.text + '\n'
        }
        
        pageDetails.push({
          pageNumber: page.page,
          width: page.width,
          height: page.height,
          angle: page.angle,
          unit: page.unit,
          lineCount: page.lines?.length || 0,
          characterCount: pageText.length
        })
        
        fullText += pageText
        totalCharacters += pageText.length
      }
    }
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        sizeKB: (file.size / 1024).toFixed(2)
      },
      azure: {
        status: result.status,
        pageCount: result.analyzeResult?.readResults?.length || 0,
        modelVersion: result.analyzeResult?.modelVersion,
        readTime: result.analyzeResult?.readTime
      },
      extraction: {
        totalCharacters: totalCharacters,
        totalPages: pageDetails.length,
        charactersPerPage: pageDetails.length > 0 ? Math.round(totalCharacters / pageDetails.length) : 0,
        pageDetails: pageDetails
      },
      textPreview: fullText.substring(0, 1000),
      lastTextPreview: fullText.substring(Math.max(0, fullText.length - 500)),
      fullText: fullText,
      rawAzureResult: result // Include raw Azure response for debugging
    })
    
  } catch (error) {
    console.error('Azure OCR debug error:', error)
    return NextResponse.json({
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}