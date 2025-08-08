import { PDFDocument } from 'pdf-lib'

/**
 * Split a PDF into chunks of specified page size
 * Azure Free tier only processes 2 pages at a time
 */
export async function splitPDFIntoChunks(
  pdfBuffer: Buffer, 
  pagesPerChunk: number = 2
): Promise<Buffer[]> {
  try {
    console.log(`Splitting PDF into ${pagesPerChunk}-page chunks...`)
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const totalPages = pdfDoc.getPageCount()
    
    console.log(`PDF has ${totalPages} total pages`)
    
    if (totalPages <= pagesPerChunk) {
      // No need to split
      console.log('PDF has <= 2 pages, no splitting needed')
      return [pdfBuffer]
    }
    
    const chunks: Buffer[] = []
    
    // Split into chunks
    for (let start = 0; start < totalPages; start += pagesPerChunk) {
      const end = Math.min(start + pagesPerChunk, totalPages)
      console.log(`Creating chunk: pages ${start + 1} to ${end}`)
      
      // Create a new PDF with just these pages
      const newPdf = await PDFDocument.create()
      
      // Copy pages to new PDF
      const pagesToCopy = []
      for (let i = start; i < end; i++) {
        pagesToCopy.push(i)
      }
      
      const copiedPages = await newPdf.copyPages(pdfDoc, pagesToCopy)
      copiedPages.forEach(page => newPdf.addPage(page))
      
      // Save as buffer
      const chunkBuffer = await newPdf.save()
      chunks.push(Buffer.from(chunkBuffer))
      
      console.log(`Chunk created: ${chunkBuffer.length} bytes`)
    }
    
    console.log(`Split into ${chunks.length} chunks`)
    return chunks
    
  } catch (error) {
    console.error('Error splitting PDF:', error)
    // If splitting fails, return the original buffer
    return [pdfBuffer]
  }
}

/**
 * Process a PDF with Azure OCR by splitting it into 2-page chunks
 * This works around Azure Free tier's 2-page limit
 */
export async function processLargePDFWithAzure(
  pdfBuffer: Buffer,
  performOCRWithAzure: (buffer: Buffer) => Promise<string>
): Promise<string> {
  try {
    console.log('Processing large PDF with Azure OCR in chunks...')
    
    // Split PDF into 2-page chunks
    const chunks = await splitPDFIntoChunks(pdfBuffer, 2)
    
    if (chunks.length === 1) {
      // No splitting needed, process normally
      return await performOCRWithAzure(chunks[0])
    }
    
    console.log(`Processing ${chunks.length} chunks with Azure OCR...`)
    
    // Process each chunk
    const results: string[] = []
    let pageOffset = 0
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length} (pages ${pageOffset + 1}-${pageOffset + 2})...`)
      
      try {
        let chunkText = await performOCRWithAzure(chunks[i])
        
        // Fix page numbering in the chunk text
        // Azure always returns "Page 1" and "Page 2" for each chunk
        // We need to renumber them based on the actual page numbers
        if (i > 0) {
          // Replace "Page 1" with actual page number
          chunkText = chunkText.replace(/--- Page 1 ---/g, `--- Page ${pageOffset + 1} ---`)
          // Replace "Page 2" with actual page number  
          chunkText = chunkText.replace(/--- Page 2 ---/g, `--- Page ${pageOffset + 2} ---`)
        }
        
        results.push(chunkText)
        console.log(`Chunk ${i + 1} extracted: ${chunkText.length} characters`)
        
        pageOffset += 2 // Each chunk has 2 pages
        
        // Add a small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        }
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error)
        results.push(`[Error processing pages ${pageOffset + 1}-${pageOffset + 2}]`)
        pageOffset += 2
      }
    }
    
    // Combine results without duplicate markers
    const fullText = results.join('\n\n')
    console.log(`All ${chunks.length} chunks processed. Total text: ${fullText.length} characters`)
    
    return fullText
    
  } catch (error) {
    console.error('Error in processLargePDFWithAzure:', error)
    throw error
  }
}