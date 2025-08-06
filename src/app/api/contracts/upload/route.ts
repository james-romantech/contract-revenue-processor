import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTextFromFile, extractBasicContractInfo } from '@/lib/pdf-processor'
import { extractContractDataWithAI, validateExtractedData } from '@/lib/ai-extractor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const useAI = formData.get('useAI') === 'true'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Extract text from the file
    const extractedText = await extractTextFromFile(file)
    
    let contractData
    let validation = { isValid: true, errors: [], warnings: [] }

    if (useAI && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        // Use AI extraction
        const aiExtractedData = await extractContractDataWithAI(extractedText)
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
          }
        })

      } catch (aiError) {
        console.error('AI extraction failed, falling back to basic extraction:', aiError)
        // Fall through to basic extraction
      }
    }

    // Fallback to basic pattern matching extraction
    const basicInfo = extractBasicContractInfo(extractedText)
    
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
      }
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' }, 
      { status: 500 }
    )
  }
}