import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromFile } from '@/lib/pdf-processor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Log environment variables status
    const azureEndpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
    const azureKey = process.env.AZURE_COMPUTER_VISION_KEY
    
    console.log('=== DEBUG EXTRACTION V2 ===')
    console.log('File:', file.name, 'Size:', file.size)
    console.log('Azure Config:', {
      hasEndpoint: !!azureEndpoint,
      endpointPreview: azureEndpoint ? azureEndpoint.substring(0, 40) + '...' : 'NOT SET',
      hasKey: !!azureKey,
      keyLength: azureKey?.length || 0
    })
    
    // Extract text - this should trigger Azure if at 7562 limit
    console.log('Calling extractTextFromFile...')
    const extractedText = await extractTextFromFile(file)
    console.log('Extraction complete, length:', extractedText.length)
    
    // Check if we hit the limit
    const is7562Limit = extractedText.length >= 7557 && extractedText.length <= 7567
    
    // If we hit the limit and Azure is configured, force OCR
    let finalText = extractedText
    let usedAzure = false
    
    if (is7562Limit && azureEndpoint && azureKey) {
      console.log('7562 limit detected - forcing Azure OCR...')
      
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const cleanEndpoint = azureEndpoint.replace(/\/+$/, '')
        const readUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`
        
        // Submit for OCR
        const analyzeResponse = await fetch(readUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
            'Content-Type': 'application/octet-stream'
          },
          body: buffer
        })
        
        if (analyzeResponse.ok) {
          const operationLocation = analyzeResponse.headers.get('Operation-Location')
          
          if (operationLocation) {
            // Wait for results
            let result
            for (let i = 0; i < 10; i++) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              const resultResponse = await fetch(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': azureKey }
              })
              
              if (resultResponse.ok) {
                result = await resultResponse.json()
                if (result.status === 'succeeded') break
              }
            }
            
            if (result?.status === 'succeeded' && result.analyzeResult?.readResults) {
              let ocrText = ''
              for (const page of result.analyzeResult.readResults) {
                ocrText += `--- Page ${page.page} ---\n`
                for (const line of page.lines || []) {
                  ocrText += line.text + '\n'
                }
              }
              
              if (ocrText.length > extractedText.length) {
                finalText = ocrText
                usedAzure = true
                console.log('Azure OCR successful, extracted:', ocrText.length, 'chars')
              }
            }
          }
        } else {
          console.log('Azure OCR failed:', analyzeResponse.status)
        }
      } catch (error) {
        console.error('Azure OCR error:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      extraction: {
        textLength: finalText.length,
        originalLength: extractedText.length,
        is7562Limit: is7562Limit,
        usedAzure: usedAzure,
        azureConfigured: !!(azureEndpoint && azureKey),
        textPreview: finalText.substring(0, 500),
        fullText: finalText
      },
      debug: {
        azureEndpoint: azureEndpoint ? 'Configured' : 'Missing',
        azureKey: azureKey ? `Set (${azureKey.length} chars)` : 'Missing',
        environment: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    })
    
  } catch (error) {
    console.error('Debug extraction error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}