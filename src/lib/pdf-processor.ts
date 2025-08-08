import mammoth from 'mammoth'

// OCR function for scanned PDFs using Azure Computer Vision
async function performOCRWithAzure(buffer: Buffer): Promise<string> {
  try {
    console.log('Starting OCR with Azure Computer Vision...')
    console.log('Buffer size:', buffer.length, 'bytes')
    
    // Check for Azure credentials
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY
    
    console.log('Azure credential check:', {
      hasEndpoint: !!endpoint,
      endpointLength: endpoint?.length || 0,
      endpointFormat: endpoint?.includes('cognitiveservices.azure.com') || false,
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0
    })
    
    if (!endpoint || !apiKey) {
      console.error('Azure credentials missing:', { endpoint: !!endpoint, apiKey: !!apiKey })
      throw new Error('Azure Computer Vision credentials not configured')
    }
    
    // Clean up endpoint URL
    const cleanEndpoint = endpoint.replace(/\/+$/, '') // Remove trailing slashes
    console.log('Using endpoint:', cleanEndpoint)
    
    // Azure Computer Vision Read API for better document OCR
    const readUrl = `${cleanEndpoint}/vision/v3.2/read/analyze`
    
    console.log('Sending document to Azure Computer Vision...')
    console.log('Request URL:', readUrl)
    console.log('Using API Key starting with:', apiKey.substring(0, 4) + '...')
    
    // Step 1: Submit the document for analysis
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
      console.error('Azure API error response:', {
        status: analyzeResponse.status,
        statusText: analyzeResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(analyzeResponse.headers.entries())
      })
      
      // Common error scenarios
      if (analyzeResponse.status === 401) {
        throw new Error('Azure API Key is invalid or expired. Check AZURE_COMPUTER_VISION_KEY in Vercel.')
      } else if (analyzeResponse.status === 403) {
        throw new Error('Azure subscription quota exceeded or region not supported.')
      } else if (analyzeResponse.status === 404) {
        throw new Error('Azure endpoint URL is incorrect. Check AZURE_COMPUTER_VISION_ENDPOINT.')
      } else if (analyzeResponse.status === 413) {
        throw new Error('PDF file too large for Azure OCR (max 50MB).')
      } else if (analyzeResponse.status === 429) {
        throw new Error('Azure rate limit exceeded. Wait a moment and try again.')
      }
      
      throw new Error(`Azure API error: ${analyzeResponse.status} - ${errorText}`)
    }
    
    // Get the operation location from headers
    const operationLocation = analyzeResponse.headers.get('Operation-Location') || 
                             analyzeResponse.headers.get('operation-location') // Try lowercase
    
    console.log('Response headers:', Object.fromEntries(analyzeResponse.headers.entries()))
    
    if (!operationLocation) {
      console.error('No operation location in headers:', Object.fromEntries(analyzeResponse.headers.entries()))
      throw new Error('No operation location returned from Azure - API may have changed')
    }
    
    console.log('Document submitted, operation location:', operationLocation)
    console.log('Waiting for OCR to complete...')
    
    // Step 2: Poll for results
    let result
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        }
      })
      
      if (!resultResponse.ok) {
        const errorText = await resultResponse.text()
        console.error('Failed to get OCR results:', {
          status: resultResponse.status,
          error: errorText
        })
        throw new Error(`Failed to get OCR results: ${resultResponse.status} - ${errorText}`)
      }
      
      result = await resultResponse.json()
      
      if (result.status === 'succeeded') {
        break
      } else if (result.status === 'failed') {
        console.error('OCR processing failed:', result)
        throw new Error(`OCR processing failed: ${JSON.stringify(result)}`)
      }
      
      console.log(`OCR status: ${result.status} (attempt ${attempts + 1}/${maxAttempts})`)
      
      attempts++
    }
    
    if (!result || result.status !== 'succeeded') {
      throw new Error('OCR processing timed out')
    }
    
    // Step 3: Extract text from results
    let fullText = ''
    
    if (result.analyzeResult && result.analyzeResult.readResults) {
      for (const page of result.analyzeResult.readResults) {
        // First, check if there are tables detected
        if (result.analyzeResult.pageResults && result.analyzeResult.pageResults.length > 0) {
          const pageResult = result.analyzeResult.pageResults.find((pr: any) => pr.page === page.page)
          if (pageResult && pageResult.tables) {
            // Process tables
            for (const table of pageResult.tables) {
              fullText += '\n[TABLE DETECTED]\n'
              for (const cell of table.cells || []) {
                if (cell.text) {
                  fullText += `Row ${cell.rowIndex}, Col ${cell.columnIndex}: ${cell.text}\t`
                  if (cell.columnIndex === (table.columns - 1)) {
                    fullText += '\n'
                  }
                }
              }
              fullText += '[END TABLE]\n\n'
            }
          }
        }
        
        // Then add regular lines
        for (const line of page.lines || []) {
          fullText += line.text + '\n'
        }
      }
    }
    
    console.log('Azure Computer Vision OCR completed, text length:', fullText.length)
    
    if (fullText.length === 0) {
      console.warn('Azure OCR returned no text - document might be blank or unreadable')
    }
    
    return fullText.trim()
    
  } catch (error) {
    console.error('Azure Computer Vision OCR failed with error:', error)
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Azure OCR Error: ${error.message}`)
    }
    throw error
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    try {
      console.log('Processing PDF document with unpdf...')
      console.log('Buffer length:', buffer.length)
      
      // Try unpdf first (no character limits!)
      try {
        const { extractText, getDocumentProxy } = await import('unpdf')
        
        // Convert buffer to Uint8Array for unpdf
        const uint8Array = new Uint8Array(buffer)
        
        // Load the PDF
        const pdf = await getDocumentProxy(uint8Array)
        console.log('PDF loaded successfully with unpdf')
        
        // Extract text with page information
        const { totalPages, text } = await extractText(pdf, { mergePages: false })
        
        console.log('unpdf result:', { 
          totalPages, 
          textType: typeof text, 
          isArray: Array.isArray(text),
          textLength: Array.isArray(text) ? text.length : (text?.length || 0)
        })
        
        // Format the text with page markers
        let fullText = ''
        let totalChars = 0
        
        if (Array.isArray(text)) {
          // text is an array when mergePages is false
          console.log(`unpdf found ${totalPages} pages, processing each page...`)
          for (let i = 0; i < text.length; i++) {
            const pageText = text[i] || ''
            console.log(`  Page ${i + 1}: ${pageText.length} characters`)
            totalChars += pageText.length
            
            // Add page marker before text
            fullText += `--- Page ${i + 1} ---\n`
            if (pageText.trim()) {
              fullText += pageText + '\n'
            } else {
              fullText += '[No text on this page]\n'
            }
          }
        } else if (typeof text === 'string') {
          // Single text string (shouldn't happen with mergePages: false)
          fullText = text || ''
          totalChars = fullText.length
        } else {
          console.log('Unexpected text format from unpdf:', text)
          totalChars = 0
        }
        
        console.log(`PDF text extraction completed with unpdf: ${totalPages} pages, ${totalChars} total characters`)
        
        // Check for the suspicious 7562 character limit (with wider range for variation)
        if (totalChars >= 7557 && totalChars <= 7567) {
          console.warn('⚠️ WARNING: unpdf extracted ~7562 characters - suspicious limit detected!')
          console.log(`unpdf got exactly ${totalChars} chars - this is likely truncated. Using Azure OCR instead...`)
          
          // Try Azure OCR to get the COMPLETE text
          const azureEndpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
          const azureKey = process.env.AZURE_COMPUTER_VISION_KEY
          
          console.log('Azure credentials check at 7562 limit:', {
            hasEndpoint: !!azureEndpoint,
            endpointValue: azureEndpoint ? azureEndpoint.substring(0, 40) + '...' : 'not set',
            hasKey: !!azureKey,
            keyLength: azureKey?.length || 0,
            keyPreview: azureKey ? azureKey.substring(0, 4) + '...' : 'not set'
          })
          
          if (azureEndpoint && azureKey) {
            try {
              console.log('Calling Azure OCR to get complete document text...')
              const ocrText = await performOCRWithAzure(buffer)
              const ocrLength = ocrText ? ocrText.trim().length : 0
              console.log(`Azure OCR extracted: ${ocrLength} characters`)
              
              if (ocrText && ocrLength > 0) {
                // ALWAYS use Azure when we hit the 7562 limit, even if counts are similar
                console.log(`✅ Using Azure OCR (${ocrLength} chars) instead of truncated unpdf (${totalChars} chars)`)
                return ocrText
              } else {
                console.log('Azure OCR returned no text, keeping unpdf result')
              }
            } catch (ocrError) {
              console.error('Azure OCR failed at 7562 limit check:', ocrError)
              console.error('Error details:', {
                message: ocrError instanceof Error ? ocrError.message : 'Unknown',
                name: ocrError instanceof Error ? ocrError.name : 'Unknown',
                stack: ocrError instanceof Error ? ocrError.stack : 'No stack'
              })
              // Keep unpdf result if Azure fails
            }
          } else {
            console.log('⚠️ Azure credentials NOT configured in environment!')
            console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('AZURE')).join(', '))
          }
        }
        
        // If we got no text at all, try with mergePages: true
        if (totalChars === 0) {
          console.log('No text extracted with mergePages:false, trying with mergePages:true...')
          const mergedResult = await extractText(pdf, { mergePages: true })
          const mergedText = typeof mergedResult.text === 'string' ? mergedResult.text : ''
          console.log(`Merged extraction: ${mergedResult.totalPages} pages, ${mergedText.length} characters`)
          
          if (mergedText && mergedText.trim().length > 0) {
            // Add page count info even if we can't separate pages
            return `[Extracted from ${mergedResult.totalPages} pages]\n\n${mergedText}`
          }
          
          // unpdf found pages but no text - this is likely a scanned PDF
          console.log(`unpdf found ${mergedResult.totalPages} pages but extracted 0 characters - likely scanned PDF`)
          
          // Check if Azure credentials are configured
          const azureEndpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
          const azureKey = process.env.AZURE_COMPUTER_VISION_KEY
          
          console.log('Azure credentials check:', {
            hasEndpoint: !!azureEndpoint,
            endpointLength: azureEndpoint?.length || 0,
            hasKey: !!azureKey,
            keyLength: azureKey?.length || 0
          })
          
          if (azureEndpoint && azureKey) {
            console.log('Azure Computer Vision credentials found, attempting OCR...')
            console.log('Calling performOCRWithAzure with buffer length:', buffer.length)
            try {
              const ocrText = await performOCRWithAzure(buffer)
              console.log('OCR result:', ocrText ? `${ocrText.length} characters extracted` : 'null/empty')
              if (ocrText && ocrText.trim().length > 0) {
                console.log(`Azure OCR successful! Extracted ${ocrText.length} characters from ${mergedResult.totalPages} pages`)
                return ocrText
              } else {
                console.log('Azure OCR returned no text')
              }
            } catch (ocrError) {
              console.error('Azure OCR failed with error:', ocrError)
              console.error('Error details:', {
                message: ocrError instanceof Error ? ocrError.message : 'Unknown',
                stack: ocrError instanceof Error ? ocrError.stack : 'No stack'
              })
            }
          } else {
            console.log('Azure credentials NOT configured in environment')
          }
          
          // Fall back to pdf2json as last resort - it might extract something
          console.log('Falling back to pdf2json as final attempt...')
          throw new Error(`Scanned PDF detected: ${mergedResult.totalPages} pages but no text extracted by unpdf or Azure`)
        }
        
        // Only return if we got actual text
        if (fullText.trim().length > 0) {
          return fullText.trim()
        }
        
        // If we get here with no text, fall through to pdf2json
        throw new Error('unpdf extracted no text - trying pdf2json')
        
      } catch (unpdfError) {
        console.error('unpdf extraction issue, falling back to pdf2json:', unpdfError.message || unpdfError)
        
        // Fall back to pdf2json - it might handle certain PDF types better
        // Note: pdf2json has a 7562 character limit but it's better than nothing
        const PDFParser = await import('pdf2json')
        const PDFParserClass = PDFParser.default || PDFParser
        
        return new Promise((resolve, reject) => {
          console.log('Attempting extraction with pdf2json as fallback...')
          // Create parser with verbosity level 1 and no page limit
          const pdfParser = new PDFParserClass(null, 1)
        
        let pagesProcessedBeforeTimeout = 0
        let partialText = ''
        
        // Add timeout handler (55 seconds for Vercel Pro - 60 second limit)
        const timeout = setTimeout(() => {
          console.error(`PDF parsing timeout - processed ${pagesProcessedBeforeTimeout} pages before 55 second limit`)
          console.error(`Processing was interrupted. Returning partial text from ${pagesProcessedBeforeTimeout} pages.`)
          
          // If we have partial text, return it instead of error message
          if (partialText.length > 100) {
            console.log(`Returning partial text (${partialText.length} chars) from ${pagesProcessedBeforeTimeout} pages`)
            resolve(partialText)
          } else {
            resolve(`PDF file uploaded: ${file.name}

PDF processing timed out (serverless function limit).

This usually happens with:
1. Large PDF files
2. Complex multi-page documents
3. Scanned PDFs requiring OCR

For immediate results:
1. Convert to a Word document (.docx) - works instantly
2. Use a smaller/simpler PDF
3. Split large PDFs into smaller sections

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}`)
          }
        }, 55000) // 55 seconds (Vercel Pro limit is 60)
        
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          clearTimeout(timeout)
          console.error('PDF parsing error:', errData)
          console.error('PDF parser error details:', JSON.stringify(errData))
          
          // Don't reject, return fallback message
          resolve(`PDF file uploaded: ${file.name}

PDF text extraction encountered an issue.
Error: ${errData.parserError || 'Unknown parsing error'}

This often happens with:
1. Scanned PDFs (image-based documents)
2. Complex PDF layouts or forms
3. Password-protected PDFs

For best results:
1. Convert to a Word document (.docx)
2. Use a text-based (not scanned) PDF
3. Ensure PDF is not password-protected

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}`)
        })
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          clearTimeout(timeout) // Clear timeout on success
          try {
            console.log('PDF parsed successfully, extracting text...')
            console.log('Raw pdfData structure:', {
              hasPages: !!pdfData.Pages,
              pageCount: pdfData.Pages ? pdfData.Pages.length : 0,
              formImage: !!pdfData.formImage,
              Meta: pdfData.Meta
            })
            
            let fullText = ''
            let processedPages = 0
            let pageTextLengths: number[] = []
            
            if (pdfData.Pages && pdfData.Pages.length > 0) {
              console.log(`PDF has ${pdfData.Pages.length} pages total`)
              
              // Process each page
              for (let pageIndex = 0; pageIndex < pdfData.Pages.length; pageIndex++) {
                const page = pdfData.Pages[pageIndex]
                const pageTextStart = fullText.length
                console.log(`Processing page ${pageIndex + 1}/${pdfData.Pages.length}...`)
                console.log(`  - Page has ${page.Texts ? page.Texts.length : 0} text elements`)
                
                if (page.Texts && page.Texts.length > 0) {
                  // Group texts by Y position to preserve line structure (important for tables)
                  const textsByLine: { [key: string]: any[] } = {}
                  
                  page.Texts.forEach((text: any) => {
                    // Round Y position to group texts on same line
                    const yPos = Math.round(text.y * 10) / 10
                    if (!textsByLine[yPos]) {
                      textsByLine[yPos] = []
                    }
                    textsByLine[yPos].push(text)
                  })
                  
                  // Sort lines by Y position (top to bottom)
                  const sortedLines = Object.keys(textsByLine)
                    .sort((a, b) => parseFloat(a) - parseFloat(b))
                  
                  // Process each line
                  sortedLines.forEach(yPos => {
                    const lineTexts = textsByLine[yPos]
                    // Sort texts within line by X position (left to right)
                    lineTexts.sort((a: any, b: any) => a.x - b.x)
                    
                    // Extract text from each item on the line
                    const lineContent = lineTexts
                      .map((text: any) => {
                        if (text.R && text.R.length > 0) {
                          return text.R.map((run: any) => decodeURIComponent(run.T)).join('')
                        }
                        return ''
                      })
                      .filter((t: string) => t.length > 0)
                    
                    // Join with tabs to preserve table structure
                    if (lineContent.length > 1) {
                      // Likely a table row - use tabs to separate columns
                      fullText += lineContent.join('\t') + '\n'
                    } else if (lineContent.length === 1) {
                      // Regular text line
                      fullText += lineContent[0] + '\n'
                    }
                  })
                  
                  // Add page marker
                  fullText += `\n--- Page ${pageIndex + 1} ---\n`
                  processedPages++
                  pagesProcessedBeforeTimeout = processedPages // Update tracker for timeout handler
                  partialText = fullText // Save partial text in case of timeout
                  
                  const pageTextLength = fullText.length - pageTextStart
                  pageTextLengths.push(pageTextLength)
                  console.log(`Processed page ${pageIndex + 1}/${pdfData.Pages.length}:`)
                  console.log(`  - Page text length: ${pageTextLength} chars`)
                  console.log(`  - Total text length: ${fullText.length} chars`)
                  console.log(`  - Running total: ${pageTextLengths.join(', ')}`)
                } else {
                  console.log(`Page ${pageIndex + 1} has no text`)
                }
              }
            } else {
              console.log('No pages found in PDF data')
            }
            
            console.log(`PDF text extraction completed:`)
            console.log(`  - Pages in PDF data: ${pdfData.Pages ? pdfData.Pages.length : 0}`)
            console.log(`  - Pages processed: ${processedPages}`)
            console.log(`  - Total text length: ${fullText.length} chars`)
            console.log(`  - Text per page: ${pageTextLengths.join(', ')}`)
            console.log(`  - Average chars/page: ${processedPages > 0 ? Math.round(fullText.length / processedPages) : 0}`)
            
            // Check if we hit the 7562 character limit range
            if (fullText.length >= 7557 && fullText.length <= 7567) {
              console.warn('⚠️ WARNING: Extracted ~7562 characters - this indicates a pdf2json limit!')
              
              // Try Azure OCR to get the complete text
              const azureEndpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
              const azureKey = process.env.AZURE_COMPUTER_VISION_KEY
              
              if (azureEndpoint && azureKey) {
                console.log('Attempting Azure OCR to bypass 7562 character limit...')
                performOCRWithAzure(buffer)
                  .then(ocrText => {
                    if (ocrText && ocrText.trim().length > 0) {
                      console.log(`Azure OCR successful! Extracted ${ocrText.length} characters (pdf2json had ${fullText.length})`)
                      resolve(ocrText)
                    } else {
                      // Continue with pdf2json result if OCR returns nothing
                      resolve(fullText.trim())
                    }
                  })
                  .catch(ocrError => {
                    console.error('Azure OCR failed:', ocrError)
                    // Continue with pdf2json result on error
                    resolve(fullText.trim())
                  })
                return // Exit early - result will be resolved in the promise handlers above
              }
            }
            
            if (fullText.trim().length === 0 || fullText.trim().length < 50) {
              // PDF appears to be scanned
              console.log('PDF appears to be scanned (no text extracted)')
              
              // Check if Azure credentials are configured
              const hasAzureCredentials = process.env.AZURE_COMPUTER_VISION_ENDPOINT && process.env.AZURE_COMPUTER_VISION_KEY
              
              if (!hasAzureCredentials) {
                resolve(`This appears to be a scanned PDF that requires OCR.

To enable OCR for scanned documents:
1. Create a free Azure account
2. Set up Computer Vision service (5,000 pages/month free)
3. Add credentials to environment variables

For now, please:
• Convert the PDF to a Word document (.docx)
• Use a text-based PDF (not scanned)
• Or copy/paste the contract text directly

File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
              } else {
                // Try OCR with Azure Computer Vision
                console.log('Attempting OCR with Azure Computer Vision...')
                
                performOCRWithAzure(buffer)
                  .then(ocrText => {
                    if (ocrText.trim().length > 0) {
                      console.log('Azure Computer Vision OCR successful!')
                      resolve(ocrText)
                    } else {
                      resolve(`OCR completed but no text was extracted from the scanned PDF.

This may be due to:
• Poor scan quality
• Handwritten text
• Non-standard fonts
• Image-only PDF

Please try converting to a Word document (.docx) or using a text-based PDF.

File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
                    }
                  })
                  .catch(ocrError => {
                    console.error('Azure Computer Vision OCR failed:', ocrError)
                    resolve(`OCR processing failed: ${ocrError.message}

Please try:
• Converting to a Word document (.docx)
• Using a text-based PDF
• Checking Azure credentials configuration

File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
                  })
              }
            } else {
              resolve(fullText.trim())
            }
          } catch (parseError) {
            console.error('Error processing PDF data:', parseError)
            reject(parseError)
          }
        })
        
        // Parse the PDF buffer
        pdfParser.parseBuffer(buffer)
      })
      }
      
    } catch (error) {
      console.error('PDF processing failed:', error)
      return `PDF file uploaded: ${file.name}

PDF processing failed. This can happen with:
1. Password-protected PDFs
2. Corrupted or complex PDF layouts  
3. Scanned PDFs without text content

For best AI extraction results, please:
1. Convert to a Word document (.docx)
2. Ensure PDF is not password-protected
3. Use a text-based (not scanned) PDF

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}

Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword') {
    try {
      console.log('Processing Word document with mammoth...')
      console.log('Buffer length:', buffer.length)
      const result = await mammoth.extractRawText({ buffer })
      console.log('Mammoth extraction successful, text length:', result.value.length)
      return result.value
    } catch (error) {
      console.error('Word document parsing error:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      })
      throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  throw new Error('Unsupported file type')
}

export function extractBasicContractInfo(text: string) {
  const patterns = {
    amounts: /\$[\d,]+(?:\.\d{2})?/g,
    dates: /\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\w+ \d{1,2},? \d{4})\b/g,
    emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    milestones: /milestone|deliverable|phase|stage|scope of service|timing/gi,
    paymentTerms: /payment|invoice|billing|due|professional fees|fee schedule|compensation/gi
  }
  
  return {
    amounts: text.match(patterns.amounts) || [],
    dates: text.match(patterns.dates) || [],
    emails: text.match(patterns.emails) || [],
    milestoneKeywords: text.match(patterns.milestones) || [],
    paymentKeywords: text.match(patterns.paymentTerms) || [],
    wordCount: text.split(/\s+/).length,
    extractedAt: new Date()
  }
}