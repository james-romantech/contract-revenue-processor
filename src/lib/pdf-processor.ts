import mammoth from 'mammoth'

// OCR function for scanned PDFs using AWS Textract
async function performOCRWithTextract(buffer: Buffer): Promise<string> {
  try {
    console.log('Starting OCR with AWS Textract...')
    
    // Dynamic imports for serverless compatibility
    const { TextractClient, AnalyzeDocumentCommand } = await import('@aws-sdk/client-textract')
    
    // Check for AWS credentials
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION || 'us-east-1'
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required)')
    }
    
    // Create Textract client
    const client = new TextractClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
    
    console.log('Sending document to AWS Textract...')
    
    // Textract can process PDFs directly (up to 5MB synchronously)
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: buffer
      },
      FeatureTypes: ['TABLES', 'FORMS'] // Extract structured data too
    })
    
    const result = await client.send(command)
    
    let fullText = ''
    
    // Process blocks returned by Textract
    if (result.Blocks) {
      console.log(`Textract returned ${result.Blocks.length} blocks`)
      
      // Extract all LINE blocks (actual text content)
      const textBlocks = result.Blocks
        .filter(block => block.BlockType === 'LINE')
        .sort((a, b) => {
          // Sort by vertical position to maintain reading order
          const aTop = a.Geometry?.BoundingBox?.Top || 0
          const bTop = b.Geometry?.BoundingBox?.Top || 0
          return aTop - bTop
        })
      
      textBlocks.forEach(block => {
        if (block.Text) {
          fullText += block.Text + ' '
        }
      })
      
      // Also extract key-value pairs (great for contracts)
      const keyValuePairs = result.Blocks
        .filter(block => block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY'))
      
      if (keyValuePairs.length > 0) {
        fullText += '\n\nExtracted Key Information:\n'
        keyValuePairs.forEach(kvp => {
          if (kvp.Text) {
            fullText += kvp.Text + '\n'
          }
        })
      }
    }
    
    console.log('AWS Textract OCR completed, total text length:', fullText.length)
    return fullText.trim()
    
  } catch (error) {
    console.error('AWS Textract OCR failed:', error)
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
              // PDF appears to be scanned, attempt OCR with Google Vision
              console.log('PDF appears to be scanned, attempting OCR with AWS Textract...')
              
              performOCRWithTextract(buffer)
                .then(ocrText => {
                  if (ocrText.trim().length > 0) {
                    console.log('AWS Textract OCR successful!')
                    resolve(ocrText)
                  } else {
                    resolve(`PDF file uploaded: ${file.name}

This PDF appears to be a scanned document, but OCR could not extract text.
This may be due to:

1. Poor image quality or resolution
2. Handwritten text (not supported)
3. Complex layouts or graphics
4. Non-English text (configure language if needed)

Please try:
1. Using a higher quality scan
2. Converting to a Word document (.docx)
3. Manual text entry

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}`)
                  }
                })
                .catch(ocrError => {
                  console.error('AWS Textract OCR failed:', ocrError)
                  resolve(`PDF file uploaded: ${file.name}

This PDF appears to be scanned, but OCR processing failed.
Error: ${ocrError.message}

Please try:
1. Converting to a Word document (.docx)
2. Ensuring AWS credentials are properly configured
3. Manual text entry for critical contract details

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}`)
                })
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