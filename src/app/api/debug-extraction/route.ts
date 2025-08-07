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
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      extraction: {
        textLength: extractedText.length,
        // First 5000 chars to see what was extracted
        textPreview: extractedText.substring(0, 5000),
        fullText: extractedText,
        // What the AI saw
        aiExtraction
      },
      debug: {
        hasText: extractedText.length > 0,
        looksLikeTable: extractedText.includes('|') || extractedText.includes('\t'),
        hasNumbers: /\$[\d,]+/.test(extractedText),
        hasDates: /\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{4}/.test(extractedText)
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}