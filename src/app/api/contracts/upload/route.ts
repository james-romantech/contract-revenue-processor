import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTextFromFile, extractBasicContractInfo } from '@/lib/pdf-processor'
import { extractContractDataWithAI, validateExtractedData } from '@/lib/ai-extractor'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    console.log('🚀 Upload API called at:', new Date().toISOString())
    console.log('🕐 Cold start check - execution start time:', startTime)
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const useAI = true // Always use AI extraction
    
    console.log('File:', file?.name, 'Size:', file?.size, 'Type:', file?.type)
    
    if (!file) {
      console.log('No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Extract text from the file
    console.log('Extracting text from file...')
    let extractedText
    try {
      extractedText = await extractTextFromFile(file)
      console.log('Extracted text length:', extractedText.length)
    } catch (textExtractionError) {
      console.error('Text extraction failed:', textExtractionError)
      return NextResponse.json(
        { 
          error: 'Failed to extract text from file',
          details: textExtractionError instanceof Error ? textExtractionError.message : 'Unknown error',
          type: 'TextExtractionError'
        }, 
        { status: 400 }
      )
    }
    
    let contractData
    let validation = { isValid: true, errors: [], warnings: [] }

    const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    console.log('⚙️ OpenAI API key check:', {
      hasOpenAIKey: !!openaiKey,
      keyLength: openaiKey ? openaiKey.length : 0,
      isPlaceholder: openaiKey === 'your-openai-api-key-here',
      keyStart: openaiKey ? openaiKey.substring(0, 8) : 'none',
      envVars: {
        OPENAI_KEY: !!process.env.OPENAI_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
      }
    })
    
    if (openaiKey && openaiKey !== 'your-openai-api-key-here') {
      console.log('✅ OpenAI API key found, proceeding with AI extraction...')
      try {
        console.log('Calling extractContractDataWithAI with text length:', extractedText.length)
        const aiExtractedData = await extractContractDataWithAI(extractedText)
        console.log('✅ AI extraction successful:', aiExtractedData)
        validation = await validateExtractedData(aiExtractedData)
        
        // Create contract with AI-extracted data
        contractData = await prisma.contract.create({
          data: {
            filename: file.name,
            originalText: extractedText,
            status: validation.isValid ? 'completed' : 'needs_review',
            contractValue: aiExtractedData.contractValue,
            startDate: aiExtractedData.startDate ? new Date(aiExtractedData.startDate) : null,
            endDate: aiExtractedData.endDate ? new Date(aiExtractedData.endDate) : null,
            clientName: aiExtractedData.clientName,
            description: aiExtractedData.description,
          }
        })

        // Create milestones
        if (aiExtractedData.milestones.length > 0) {
          await prisma.milestone.createMany({
            data: aiExtractedData.milestones.map(milestone => ({
              contractId: contractData.id,
              name: milestone.name,
              value: milestone.amount,
              dueDate: new Date(milestone.dueDate)
            }))
          })
        }

        return NextResponse.json({
          success: true,
          contract: {
            id: contractData.id,
            filename: contractData.filename,
            status: contractData.status,
            contractValue: contractData.contractValue,
            startDate: contractData.startDate,
            endDate: contractData.endDate,
            clientName: contractData.clientName,
            description: contractData.description,
            aiExtractedData,
            validation
          },
          debug: {
            textLength: extractedText.length,
            aiSuccess: true
          }
        })

      } catch (aiError) {
        console.error('❌ AI extraction failed, falling back to basic extraction:', aiError)
        console.error('AI Error details:', {
          message: aiError instanceof Error ? aiError.message : 'Unknown error',
          name: aiError instanceof Error ? aiError.name : 'Unknown',
          stack: aiError instanceof Error ? aiError.stack : 'No stack',
          extractedTextPreview: extractedText.substring(0, 100)
        })
        
        // Store the error for debugging
        validation.warnings.push(`AI extraction failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`)
        // Fall through to basic extraction
      }
    } else {
      console.log('❌ OpenAI API key not configured properly:', {
        hasOpenAIKey: !!openaiKey,
        isNotPlaceholder: openaiKey !== 'your-openai-api-key-here'
      })
      // Return error instead of falling back to basic extraction
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
          details: 'AI extraction is required for contract processing.'
        }, 
        { status: 500 }
      )
    }

    // Fallback to basic pattern matching extraction if AI wasn't used
    if (!contractData) {
      console.log('Using basic extraction...')
      const basicInfo = extractBasicContractInfo(extractedText)
      
      console.log('Attempting database save...')
      try {
        contractData = await prisma.contract.create({
          data: {
            filename: file.name,
            originalText: extractedText,
            status: 'completed',
            contractValue: basicInfo.amounts.length > 0 
              ? parseFloat(basicInfo.amounts[0].replace(/[$,]/g, ''))
              : null,
          }
        })
        console.log('Database save successful:', contractData.id)
      } catch (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }

      return NextResponse.json({
        success: true,
        contract: {
          id: contractData.id,
          filename: contractData.filename,
          status: contractData.status,
          contractValue: contractData.contractValue,
          extractedInfo: basicInfo,
          aiExtractedData: null,
          validation: { isValid: true, errors: [], warnings: ['AI extraction not available - using basic pattern matching'] }
        },
        debug: {
          textLength: extractedText.length,
          fallbackUsed: true
        }
      })
    }
    
  } catch (error) {
    console.error('Upload error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Unknown'
      }, 
      { status: 500 }
    )
  }
}