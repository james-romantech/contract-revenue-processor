import mammoth from 'mammoth'

// Note: PDF processing is temporarily simplified due to serverless compatibility issues
// Will implement proper OCR in future updates

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
            
            if (fullText.trim().length === 0) {
              resolve(`PDF file uploaded: ${file.name}

This PDF appears to contain no extractable text (likely a scanned document).
For scanned PDFs, please:

1. Convert to a searchable PDF with OCR
2. Convert to a Word document (.docx)
3. Copy and paste the contract text manually

File size: ${(file.size / 1024).toFixed(1)} KB
Upload date: ${new Date().toLocaleDateString()}`)
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