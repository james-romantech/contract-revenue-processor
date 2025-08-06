import mammoth from 'mammoth'

async function performOCROnPDF(buffer: Buffer, pdfDocument: any): Promise<string> {
  try {
    console.log('Starting OCR processing for scanned PDF...')
    
    // Dynamic import to avoid build issues
    const { createWorker } = await import('tesseract.js')
    
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      }
    })
    
    let fullText = ''
    
    // Process each page (limit to first 5 pages for performance/cost)
    const pagesToProcess = Math.min(pdfDocument.numPages, 5)
    
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      try {
        console.log(`OCR processing page ${pageNum} of ${pagesToProcess}`)
        
        const page = await pdfDocument.getPage(pageNum)
        
        // Set up canvas for rendering
        const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better OCR
        
        // Create a canvas element
        const canvas = new OffscreenCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')
        
        if (!context) {
          console.error('Could not get canvas context')
          continue
        }
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
        
        // Convert canvas to image data for OCR
        const imageData = canvas.convertToBlob({ type: 'image/png' })
        const arrayBuffer = await (await imageData).arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        
        // Perform OCR on the rendered page
        const { data: { text } } = await worker.recognize(buffer)
        fullText += text + '\n'
        console.log(`Page ${pageNum} OCR text length:`, text.length)
        
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError)
        // Continue with other pages
      }
    }
    
    await worker.terminate()
    
    console.log('OCR completed, total text length:', fullText.length)
    return fullText.trim()
    
  } catch (error) {
    console.error('OCR processing failed:', error)
    throw error
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    try {
      console.log('Processing PDF document with PDF.js...')
      console.log('Buffer length:', buffer.length)
      
      // Dynamic import to avoid build issues
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      
      // Configure PDF.js worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`
      
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        verbosity: 0 // Reduce console noise
      })
      
      const pdf = await loadingTask.promise
      console.log('PDF loaded, pages:', pdf.numPages)
      
      let fullText = ''
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }
      
      console.log('PDF extraction successful, text length:', fullText.length)
      
      if (fullText.trim().length === 0 || fullText.trim().length < 50) {
        // PDF appears to be scanned/image-based, attempt OCR
        console.log('PDF appears to be scanned, attempting OCR...')
        try {
          const ocrText = await performOCROnPDF(buffer, pdf)
          if (ocrText.trim().length > 0) {
            console.log('OCR successful, text length:', ocrText.length)
            return ocrText
          }
        } catch (ocrError) {
          console.error('OCR failed:', ocrError)
        }
        
        return `PDF file uploaded: ${file.name}

This PDF appears to be a scanned document. OCR processing was attempted but may not have extracted complete text.

Please try:
1. Using a higher quality scan if possible
2. Converting to a Word document (.docx)
3. Manual entry for critical contract details

File size: ${(file.size / 1024).toFixed(1)} KB
Pages: ${pdf.numPages}
Upload date: ${new Date().toLocaleDateString()}`
      }
      
      return fullText.trim()
      
    } catch (error) {
      console.error('PDF parsing error:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      })
      
      // Fallback: return placeholder text and let AI handle manual input
      return `PDF file uploaded: ${file.name}

PDF text extraction failed. This can happen with:
1. Scanned PDFs (image-based documents)
2. Password-protected PDFs
3. Corrupted or complex PDF layouts

For best results with AI extraction, please:
1. Convert to a searchable PDF with OCR
2. Convert to a Word document (.docx) 
3. Copy and paste contract text manually if needed

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}

Error details: ${error instanceof Error ? error.message : 'Unknown error'}`
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