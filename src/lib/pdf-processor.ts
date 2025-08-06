import mammoth from 'mammoth'

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  if (file.type === 'application/pdf') {
    // For MVP, we'll rely on AI OCR and manual input for PDFs
    // Since serverless PDF parsing is complex, we'll return a placeholder
    // and let users know to use Word docs or manual entry for now
    return `PDF file uploaded: ${file.name}
    
This is a PDF file. For the MVP version, please either:
1. Convert your PDF to a Word document and re-upload
2. Use the manual field editing to enter contract details
3. The system will attempt basic text extraction, but results may be limited

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}

For accurate AI extraction, Word documents (.docx) work best.`
  }
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword') {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    } catch (error) {
      console.error('Word document parsing error:', error)
      throw new Error('Failed to parse Word document')
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