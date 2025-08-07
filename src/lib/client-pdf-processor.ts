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
    
    // Set up worker - use local file from public directory
    if (typeof window !== 'undefined') {
      // Use the worker file from public directory (no CORS issues)
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      console.log('PDF.js worker configured with local file')
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    console.log(`PDF has ${pdf.numPages} pages`)
    
    let fullText = ''
    const pageTexts: string[] = []
    
    // Process all pages (no timeout in browser)
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}...`)
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Extract text with better handling
      let pageText = ''
      let lastY = 0
      
      textContent.items.forEach((item: any) => {
        if ('str' in item && item.str) {
          // Add newline if Y position changed significantly (new line)
          if (lastY !== 0 && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n'
          }
          pageText += item.str + ' '
          lastY = item.transform[5]
        }
      })
      
      pageTexts.push(pageText.trim())
      console.log(`Page ${pageNum} extracted: ${pageText.length} characters`)
      fullText += `\n\n--- Page ${pageNum} ---\n${pageText}\n`
    }
    
    console.log(`Client-side extraction complete: ${fullText.length} characters from ${pdf.numPages} pages`)
    console.log('Page character counts:', pageTexts.map(p => p.length))
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
    
    // Set up worker - use local file from public directory
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
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