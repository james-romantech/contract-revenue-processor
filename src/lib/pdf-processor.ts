import mammoth from 'mammoth'

// OCR function for scanned PDFs using Azure Computer Vision
async function performOCRWithAzure(buffer: Buffer): Promise<string> {
  try {
    console.log('Starting OCR with Azure Computer Vision...')
    
    // Check for Azure credentials
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY
    
    if (!endpoint || !apiKey) {
      throw new Error('Azure Computer Vision credentials not configured')
    }
    
    // Azure Computer Vision Read API for better document OCR
    const readUrl = `${endpoint}/vision/v3.2/read/analyze`
    
    console.log('Sending document to Azure Computer Vision...')
    
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
      const error = await analyzeResponse.text()
      throw new Error(`Azure API error: ${analyzeResponse.status} - ${error}`)
    }
    
    // Get the operation location from headers
    const operationLocation = analyzeResponse.headers.get('Operation-Location')
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure')
    }
    
    console.log('Document submitted, waiting for OCR to complete...')
    
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
        throw new Error(`Failed to get OCR results: ${resultResponse.status}`)
      }
      
      result = await resultResponse.json()
      
      if (result.status === 'succeeded') {
        break
      } else if (result.status === 'failed') {
        throw new Error('OCR processing failed')
      }
      
      attempts++
    }
    
    if (!result || result.status !== 'succeeded') {
      throw new Error('OCR processing timed out')
    }
    
    // Step 3: Extract text from results
    let fullText = ''
    
    if (result.analyzeResult && result.analyzeResult.readResults) {
      for (const page of result.analyzeResult.readResults) {
        for (const line of page.lines || []) {
          fullText += line.text + '\n'
        }
      }
    }
    
    console.log('Azure Computer Vision OCR completed, text length:', fullText.length)
    return fullText.trim()
    
  } catch (error) {
    console.error('Azure Computer Vision OCR failed:', error)
    throw error
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    try {
      console.log('Processing PDF document with pdf2json...')
      console.log('Buffer length:', buffer.length)
      
      // Dynamic import to avoid build issues
      const PDFParser = await import('pdf2json')
      const PDFParserClass = PDFParser.default || PDFParser
      
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParserClass(null, 1)
        
        // Add timeout handler (10 seconds)
        const timeout = setTimeout(() => {
          console.error('PDF parsing timeout - taking too long')
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
        }, 9000) // 9 seconds (Vercel limit is 10)
        
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
            
            let fullText = ''
            
            if (pdfData.Pages && pdfData.Pages.length > 0) {
              pdfData.Pages.forEach((page: any, pageIndex: number) => {
                if (page.Texts && page.Texts.length > 0) {
                  const pageText = page.Texts
                    .map((text: any) => {
                      if (text.R && text.R.length > 0) {
                        return text.R.map((run: any) => decodeURIComponent(run.T)).join('')
                      }
                      return ''
                    })
                    .join(' ')
                  fullText += pageText + '\n'
                }
              })
            }
            
            console.log('PDF text extraction completed, text length:', fullText.length)
            
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
    milestones: /milestone|deliverable|phase|stage/gi,
    paymentTerms: /payment|invoice|billing|due/gi
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