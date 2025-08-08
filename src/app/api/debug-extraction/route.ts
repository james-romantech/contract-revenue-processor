import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromFile } from '@/lib/pdf-processor'
import { extractContractDataWithAI } from '@/lib/ai-extractor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Extract text from file
    const extractedText = await extractTextFromFile(file)
    
    // Try AI extraction if API key is configured
    let aiExtraction = null
    const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    
    if (openaiKey && openaiKey !== 'your-openai-api-key-here') {
      try {
        aiExtraction = await extractContractDataWithAI(extractedText)
      } catch (error) {
        aiExtraction = { error: error instanceof Error ? error.message : 'AI extraction failed' }
      }
    }
    
    // Count pages in extracted text (looking for page markers we add)
    const pageMarkers = extractedText.match(/--- Page \d+ ---/g) || []
    const pageCount = pageMarkers.length || 1
    
    // Try to detect page breaks by looking for common patterns
    const formFeedCount = (extractedText.match(/\f/g) || []).length
    const pageBreakPatterns = (extractedText.match(/Page \d+|PAGE \d+|\d+ of \d+/gi) || [])
    
    // Estimate pages if we don't have markers (average PDF has ~3000 chars per page)
    const estimatedPages = pageMarkers.length > 0 ? pageCount : Math.max(1, Math.ceil(extractedText.length / 3000))
    
    // Get last 1000 chars to see if we got end of document
    const lastChars = extractedText.substring(Math.max(0, extractedText.length - 1000))
    
    // Check if we hit the suspicious 7562 character limit
    const is7562Limit = extractedText.length === 7562
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      extraction: {
        textLength: extractedText.length,
        pageCount: pageCount,
        estimatedPages: estimatedPages,
        pagesDetected: pageMarkers,
        formFeedCount: formFeedCount,
        pageBreakPatterns: pageBreakPatterns,
        is7562Limit: is7562Limit,
        // First 5000 chars to see what was extracted
        textPreview: extractedText.substring(0, 5000),
        lastTextPreview: lastChars,
        fullText: extractedText,
        // What the AI saw
        aiExtraction
      },
      debug: {
        hasText: extractedText.length > 0,
        looksLikeTable: extractedText.includes('|') || extractedText.includes('\t'),
        hasNumbers: /\$[\d,]+/.test(extractedText),
        hasDates: /\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{4}/.test(extractedText),
        charactersPerPage: pageCount > 0 ? Math.round(extractedText.length / pageCount) : 0
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}