import { NextRequest, NextResponse } from 'next/server'

// Direct test of S1 tier with explicit page parameters
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const buffer = Buffer.from(await file.arrayBuffer())
    
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY
    
    if (!endpoint || !apiKey) {
      return NextResponse.json({ error: 'Azure not configured' }, { status: 500 })
    }
    
    console.log('Testing S1 tier with file:', {
      name: file.name,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB',
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    })
    
    const cleanEndpoint = endpoint.replace(/\/+$/, '')
    
    // Test different API calls
    const tests = []
    
    // Test 1: Default call (what we've been using)
    tests.push({
      name: 'Default v3.2',
      url: `${cleanEndpoint}/vision/v3.2/read/analyze`
    })
    
    // Test 2: With explicit pages parameter
    tests.push({
      name: 'v3.2 with pages=*',
      url: `${cleanEndpoint}/vision/v3.2/read/analyze?pages=*`
    })
    
    // Test 3: With explicit page range
    tests.push({
      name: 'v3.2 with pages=1-50',
      url: `${cleanEndpoint}/vision/v3.2/read/analyze?pages=1-50`
    })
    
    // Test 4: Try newer API version
    tests.push({
      name: 'v4.0',
      url: `${cleanEndpoint}/vision/v4.0/read/analyze`
    })
    
    const results = []
    
    for (const test of tests) {
      console.log(`Testing: ${test.name}`)
      console.log(`URL: ${test.url}`)
      
      try {
        const analyzeResponse = await fetch(test.url, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/octet-stream'
          },
          body: buffer
        })
        
        if (!analyzeResponse.ok) {
          const errorText = await analyzeResponse.text()
          results.push({
            test: test.name,
            status: 'failed',
            error: `HTTP ${analyzeResponse.status}`,
            details: errorText.substring(0, 200)
          })
          continue
        }
        
        const operationLocation = analyzeResponse.headers.get('Operation-Location')
        if (!operationLocation) {
          results.push({
            test: test.name,
            status: 'failed',
            error: 'No operation location'
          })
          continue
        }
        
        // Wait for results
        let result
        let attempts = 0
        const maxAttempts = 30
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const resultResponse = await fetch(operationLocation, {
            headers: { 'Ocp-Apim-Subscription-Key': apiKey }
          })
          
          if (resultResponse.ok) {
            result = await resultResponse.json()
            if (result.status === 'succeeded') break
            if (result.status === 'failed') {
              results.push({
                test: test.name,
                status: 'failed',
                error: 'OCR failed',
                details: result
              })
              break
            }
          }
          
          attempts++
        }
        
        if (result?.status === 'succeeded') {
          const pageCount = result.analyzeResult?.readResults?.length || 0
          const totalChars = result.analyzeResult?.readResults?.reduce((sum: number, page: any) => {
            return sum + (page.lines?.reduce((pageSum: number, line: any) => 
              pageSum + (line.text?.length || 0), 0) || 0)
          }, 0) || 0
          
          results.push({
            test: test.name,
            status: 'success',
            pagesProcessed: pageCount,
            totalCharacters: totalChars,
            modelVersion: result.analyzeResult?.modelVersion
          })
        } else {
          results.push({
            test: test.name,
            status: 'timeout',
            attempts: attempts
          })
        }
        
      } catch (error) {
        results.push({
          test: test.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Find the best result
    const bestResult = results.find(r => r.status === 'success' && r.pagesProcessed > 2) ||
                       results.find(r => r.status === 'success') ||
                       results[0]
    
    return NextResponse.json({
      file: {
        name: file.name,
        sizeKB: (file.size / 1024).toFixed(2),
        sizeMB: (file.size / (1024 * 1024)).toFixed(2)
      },
      tier: 'S1 (confirmed)',
      testResults: results,
      recommendation: bestResult?.pagesProcessed > 2 
        ? `Use ${results.find(r => r === bestResult)?.test} - processes all pages`
        : 'All methods limited to 2 pages - chunking required',
      bestResult: bestResult
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}