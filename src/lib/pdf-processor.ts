import mammoth from 'mammoth'

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    try {
      console.log('Processing PDF document with pdf-parse...')
      console.log('Buffer length:', buffer.length)
      
      // Dynamic import to avoid build issues
      const pdf = await import('pdf-parse')
      const pdfParser = pdf.default || pdf
      
      const pdfData = await pdfParser(buffer, {
        // Optimize for contract parsing
        normalizeWhitespace: true,
        disableCombineTextItems: false
      })
      
      console.log('PDF extraction successful, text length:', pdfData.text.length)
      console.log('PDF metadata:', pdfData.info)
      
      if (pdfData.text.trim().length === 0) {
        return `PDF file uploaded: ${file.name}

This PDF appears to contain no extractable text (possibly scanned images).
Please try:
1. Converting to a searchable PDF with OCR
2. Converting to a Word document (.docx)
3. Using manual entry for contract details

File size: ${(file.size / 1024).toFixed(1)} KB
Pages: ${pdfData.numpages}
Upload date: ${new Date().toLocaleDateString()}`
      }
      
      return pdfData.text
      
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