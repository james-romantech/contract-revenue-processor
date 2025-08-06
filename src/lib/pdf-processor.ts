import mammoth from 'mammoth'

// OCR function for scanned PDFs using Google Cloud Vision API
async function performOCRWithGoogleVision(buffer: Buffer): Promise<string> {
  try {
    console.log('Starting OCR with Google Cloud Vision API...')
    
    // Dynamic imports for serverless compatibility
    const vision = await import('@google-cloud/vision')
    const pdf = await import('pdf-poppler')
    const sharp = await import('sharp')
    
    const client = new vision.ImageAnnotatorClient()
    
    // Convert PDF to images first
    console.log('Converting PDF pages to images...')
    
    // Create temporary file path for PDF processing
    const tempDir = '/tmp'
    const tempPdfPath = `${tempDir}/contract_${Date.now()}.pdf`
    
    // Write buffer to temporary file (pdf-poppler needs file path)
    const fs = await import('fs')
    fs.writeFileSync(tempPdfPath, buffer)
    
    // Convert PDF pages to images
    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: `contract_${Date.now()}`,
      page: null, // Convert all pages
      scale: 2048 // High resolution for better OCR
    }
    
    const imagePaths = await pdf.convert(tempPdfPath, options)
    console.log(`Converted ${imagePaths.length} pages to images`)
    
    let fullText = ''
    
    // Process each page with Google Vision
    for (let i = 0; i < Math.min(imagePaths.length, 10); i++) { // Limit to 10 pages
      try {
        console.log(`Processing page ${i + 1} with Vision API...`)
        
        // Read image buffer
        const imagePath = imagePaths[i]
        const imageBuffer = fs.readFileSync(imagePath)
        
        // Perform OCR with Google Vision
        const [result] = await client.textDetection({
          image: { content: imageBuffer }
        })
        
        const detections = result.textAnnotations
        if (detections && detections.length > 0) {
          // First annotation contains the full text
          const pageText = detections[0].description || ''
          fullText += pageText + '\n'
          console.log(`Page ${i + 1} OCR completed, text length: ${pageText.length}`)
        }
        
        // Clean up image file
        fs.unlinkSync(imagePath)
        
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError)
        // Continue with other pages
      }
    }
    
    // Clean up temporary PDF file
    fs.unlinkSync(tempPdfPath)
    
    console.log('Google Vision OCR completed, total text length:', fullText.length)
    return fullText.trim()
    
  } catch (error) {
    console.error('Google Vision OCR failed:', error)
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
        
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          console.error('PDF parsing error:', errData)
          reject(new Error(`PDF parsing failed: ${errData.parserError}`))
        })
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
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
              console.log('PDF appears to be scanned, attempting OCR with Google Vision...')
              
              performOCRWithGoogleVision(buffer)
                .then(ocrText => {
                  if (ocrText.trim().length > 0) {
                    console.log('Google Vision OCR successful!')
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
                  console.error('Google Vision OCR failed:', ocrError)
                  resolve(`PDF file uploaded: ${file.name}

This PDF appears to be scanned, but OCR processing failed.
Error: ${ocrError.message}

Please try:
1. Converting to a Word document (.docx)
2. Ensuring Google Cloud Vision API is properly configured
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