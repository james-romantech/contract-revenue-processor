import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ExtractedContractData {
  contractValue: number | null
  startDate: string | null
  endDate: string | null
  clientName: string | null
  description: string | null
  milestones: Array<{
    name: string
    amount: number
    dueDate: string
  }>
  paymentTerms: string | null
  deliverables: string[]
  confidence: number
  reasoning: string
}

const EXTRACTION_PROMPT = `You are a contract analysis AI that extracts key commercial terms from consulting and professional services contracts.

Analyze the following contract text and extract structured data. Be precise and conservative - only extract information you're confident about.

For each field, provide:
1. The extracted value
2. Your confidence level (0-1)
3. Brief reasoning for your extraction

Extract these specific fields:
- Contract Value: Total monetary value (number only, no currency symbols)
- Start Date: Project start date (ISO format YYYY-MM-DD)
- End Date: Project end date (ISO format YYYY-MM-DD)  
- Client Name: The client/customer organization name
- Description: Brief project description (1-2 sentences)
- Milestones: List of project milestones with amounts and dates
- Payment Terms: Payment schedule/terms summary
- Deliverables: List of key deliverables/outputs

Return ONLY a valid JSON object with this exact structure:
{
  "contractValue": number | null,
  "startDate": "YYYY-MM-DD" | null,
  "endDate": "YYYY-MM-DD" | null,
  "clientName": string | null,
  "description": string | null,
  "milestones": [
    {
      "name": string,
      "amount": number,
      "dueDate": "YYYY-MM-DD"
    }
  ],
  "paymentTerms": string | null,
  "deliverables": [string],
  "confidence": number,
  "reasoning": string
}

Contract text to analyze:`

export async function extractContractDataWithAI(contractText: string): Promise<ExtractedContractData> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: EXTRACTION_PROMPT
        },
        {
          role: "user", 
          content: contractText
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    let extractedData: ExtractedContractData
    try {
      extractedData = JSON.parse(response)
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse AI response as JSON')
      }
    }

    // Validate required structure
    if (typeof extractedData !== 'object') {
      throw new Error('AI response is not a valid object')
    }

    // Set defaults for missing fields
    const validatedData: ExtractedContractData = {
      contractValue: extractedData.contractValue || null,
      startDate: extractedData.startDate || null,
      endDate: extractedData.endDate || null,
      clientName: extractedData.clientName || null,
      description: extractedData.description || null,
      milestones: Array.isArray(extractedData.milestones) ? extractedData.milestones : [],
      paymentTerms: extractedData.paymentTerms || null,
      deliverables: Array.isArray(extractedData.deliverables) ? extractedData.deliverables : [],
      confidence: extractedData.confidence || 0,
      reasoning: extractedData.reasoning || 'No reasoning provided'
    }

    return validatedData

  } catch (error) {
    console.error('AI extraction error:', error)
    throw new Error(`Failed to extract contract data with AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function validateExtractedData(data: ExtractedContractData): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate contract value
  if (data.contractValue !== null && (data.contractValue <= 0 || data.contractValue > 10000000)) {
    warnings.push('Contract value seems unusually high or low')
  }

  // Validate dates
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    
    if (start >= end) {
      errors.push('Start date must be before end date')
    }
    
    if (end < new Date()) {
      warnings.push('End date is in the past')
    }
  }

  // Validate milestones
  if (data.milestones.length > 0) {
    let totalMilestoneValue = 0
    data.milestones.forEach((milestone, index) => {
      if (!milestone.name || milestone.name.trim().length === 0) {
        errors.push(`Milestone ${index + 1} is missing a name`)
      }
      if (milestone.amount <= 0) {
        errors.push(`Milestone ${index + 1} has invalid amount`)
      }
      totalMilestoneValue += milestone.amount
    })
    
    if (data.contractValue && Math.abs(totalMilestoneValue - data.contractValue) > data.contractValue * 0.1) {
      warnings.push('Total milestone value differs significantly from contract value')
    }
  }

  // Validate confidence
  if (data.confidence < 0.3) {
    warnings.push('Low confidence in extracted data - manual review recommended')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}