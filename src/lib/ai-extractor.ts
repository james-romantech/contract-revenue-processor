import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
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

const EXTRACTION_PROMPT = `You are an expert contract analysis AI that extracts key commercial terms from consulting and professional services contracts. You excel at interpreting implicit language and inferring dates/amounts from context.

IMPORTANT: Contracts rarely state dates explicitly (like "1/1/2025 to 12/31/2025"). Instead they use phrases like:
- "during the months of August, September, October, November, and December 2025"
- "beginning in August 2025 and continuing through November 2025" 
- "four consecutive monthly installments of $25,000, beginning in August 2025"

Your task is to:
1. Parse implicit date ranges and convert to explicit start/end dates
2. Infer payment schedules from billing descriptions
3. Calculate milestone amounts and dates from payment terms
4. Extract total contract values even when stated indirectly

EXAMPLES:
- "support required during August, September, October 2025" → startDate: "2025-08-01", endDate: "2025-10-31"
- "four monthly installments of $25,000 beginning August 2025" → creates 4 milestones from Aug-Nov 2025
- "monthly rate continues beyond December 6, 2025" → endDate could extend past "2025-12-06"

Extract these specific fields:
- Contract Value: Total monetary value (calculate from payments if needed)
- Start Date: Project start date (infer from first payment/activity mention)
- End Date: Project end date (infer from last payment/activity mention)
- Client Name: The client/customer organization name
- Description: Brief project description (1-2 sentences)
- Milestones: Payment installments with calculated dates and amounts
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

// Helper function to add contextual date information to the prompt
function addDateContext(prompt: string): string {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const nextYear = currentYear + 1
  
  return prompt + `

CURRENT DATE CONTEXT:
- Today's date: ${currentDate.toISOString().split('T')[0]}
- Current year: ${currentYear}
- Next year: ${nextYear}
- When contracts mention months without years, assume they refer to the next occurrence of those months
- For relative dates like "next month" or "Q4", calculate based on current date

CONTRACT TEXT TO ANALYZE:`
}

export async function extractContractDataWithAI(contractText: string): Promise<ExtractedContractData> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: addDateContext(EXTRACTION_PROMPT)
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