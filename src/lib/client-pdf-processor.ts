// Client-side PDF processing to avoid server timeout
// This runs in the browser with no time limits

// Fallback function for legacy PDF processing
async function extractWithLegacyPDF(file: File, pdfjsLib: any): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
    fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`
  }
  
  return fullText
}

export async function extractTextFromPDFClient(file: File): Promise<string> {
  try {
    console.log('Processing PDF client-side (no timeout limits)...')
    
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set up worker - try multiple approaches
    if (typeof window !== 'undefined') {
      try {
        // Option 1: Try to use the worker from unpkg CDN (more reliable)
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
      } catch (error) {
        console.warn('Failed to set worker URL, PDF processing may be slower')
        // Worker will run in main thread as fallback (slower but works)
      }
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    console.log(`PDF has ${pdf.numPages} pages`)
    
    let fullText = ''
    
    // Process all pages (no timeout in browser)
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}...`)
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Extract text with position info for table preservation
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .join(' ')
      
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`
    }
    
    console.log(`Client-side extraction complete: ${fullText.length} characters from ${pdf.numPages} pages`)
    return fullText
    
  } catch (error) {
    console.error('Client-side PDF processing failed:', error)
    throw error
  }
}

// Alternative: Process PDF in chunks and send to server
export async function processPDFInChunks(file: File, chunkSize: number = 2): Promise<string[]> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set up worker
    if (typeof window !== 'undefined') {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
      } catch (error) {
        console.warn('Failed to set worker URL, PDF processing may be slower')
      }
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    const chunks: string[] = []
    
    for (let i = 0; i < pdf.numPages; i += chunkSize) {
      let chunkText = ''
      const endPage = Math.min(i + chunkSize, pdf.numPages)
      
      for (let pageNum = i + 1; pageNum <= endPage; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
        chunkText += pageText + '\n'
      }
      
      chunks.push(chunkText)
    }
    
    return chunks
  } catch (error) {
    console.error('Chunk processing failed:', error)
    throw error
  }
}