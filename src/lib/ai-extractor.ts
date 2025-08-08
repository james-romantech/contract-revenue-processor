import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
})

export interface ExtractedContractData {
  contractValue: number | null
  // Work period dates (for straight-line revenue)
  workStartDate: string | null
  workEndDate: string | null
  // Billing period dates (for billed-basis revenue)
  billingStartDate: string | null
  billingEndDate: string | null
  // Legacy fields for backward compatibility
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
5. Parse tables and structured data (look for columnar data, pipes |, tabs, or aligned text)
6. Extract information from payment schedule tables, service tables, and deliverable tables
7. Handle multi-column layouts and preserve table relationships
8. Recognize common table headers like "Date", "Amount", "Description", "Phase", "Milestone", "Payment", "Invoice", "Scope of Service", "Professional Fees", "Timing", "Deliverable", "Task", "Fee", "Cost", "Budget", "Hours", "Rate", "Total", "Due Date", "Period", "Service", "Work", "Completion"
9. Extract data from pricing tables, rate cards, and fee schedules
10. Understand hierarchical structures in contracts (sections, subsections, exhibits)

DATE CONVENTIONS:
- For month-only references, use END of month dates
- "August 2025" → "2025-08-31" (not 08-01)
- "August through December 2025" → startDate: "2025-08-31", endDate: "2025-12-31"
- Milestones should use end-of-month dates for monthly payments

EXAMPLES:
- "support required during August, September, October 2025" → startDate: "2025-08-31", endDate: "2025-10-31"
- "four monthly installments of $25,000 beginning August 2025" → creates 4 milestones: Aug 31, Sep 30, Oct 31, Nov 30
- "August through December 2025" → startDate: "2025-08-31", endDate: "2025-12-31"

TABLE EXAMPLES:
- "Phase 1 | $50,000 | Aug 2025" → Extract as milestone: Phase 1, $50,000, 2025-08-31
- Payment Schedule table with columns [Date, Amount, Description] → Parse each row as a milestone
- Rate card showing "Senior Consultant: $250/hr" → Extract hourly rates and calculate totals if hours provided

SECTION EXAMPLES:
- "Scope of Service: Implementation of ERP system from August through December 2025" → Extract description and work period
- "Professional Fees: Total engagement fee of $100,000 payable in four installments" → Extract contract value and payment structure
- "Timing: Services to commence August 1, 2025 and conclude December 31, 2025" → Extract work start/end dates

Extract these specific fields:
- Contract Value: Total monetary value (calculate from payments if needed, look in "Professional Fees" sections)
- Work Start Date: When work/services begin (look for "support required", "services commence", "work begins", "Timing" sections)
- Work End Date: When work/services end (look for "through", "concluding", "services end", "Timing" sections)
- Billing Start Date: When billing begins (first payment/invoice date)
- Billing End Date: When billing ends (last payment/invoice date)
- Start Date: Same as Work Start Date (for backward compatibility)
- End Date: Same as Work End Date (for backward compatibility)
- Client Name: The client/customer organization name
- Description: Brief project description (1-2 sentences, often in "Scope of Service" sections)
- Milestones: Payment installments with calculated dates and amounts (often in "Professional Fees" or "Payment Schedule" sections)
- Payment Terms: Payment schedule/terms summary (look for "Professional Fees", "Payment Terms", "Billing" sections)
- Deliverables: List of key deliverables/outputs (often in "Scope of Service" or "Deliverables" sections)

CRITICAL DISTINCTION:
- Work Period: When services are performed ("support required during Aug-Dec")
- Billing Period: When payments are made ("billed Aug-Nov")
- These are often different! Extract both separately.

IMPORTANT: Return ONLY a valid JSON object. Do not include any text before or after the JSON. Do not wrap in markdown code blocks. Return this exact structure:
{
  "contractValue": number | null,
  "workStartDate": "YYYY-MM-DD" | null,
  "workEndDate": "YYYY-MM-DD" | null,
  "billingStartDate": "YYYY-MM-DD" | null,
  "billingEndDate": "YYYY-MM-DD" | null,
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
  "confidence": number between 0 and 1 (e.g., 0.95 for 95% confidence),
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
    console.log(`Sending contract to AI for extraction. Text length: ${contractText.length} characters`)
    
    // Rough token estimate (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(contractText.length / 4)
    console.log(`Estimated tokens: ${estimatedTokens}`)
    
    if (estimatedTokens > 100000) {
      console.warn(`⚠️ Contract may be too long (${estimatedTokens} estimated tokens). Consider truncating.`)
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: addDateContext(EXTRACTION_PROMPT) + "\n\nRemember: Output ONLY valid JSON, no other text."
        },
        {
          role: "user", 
          content: contractText
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    console.log('Raw AI response:', response)
    
    let extractedData: ExtractedContractData
    try {
      // First, try direct JSON parsing
      extractedData = JSON.parse(response)
    } catch (parseError) {
      console.log('Direct JSON parsing failed, attempting to extract JSON from text...')
      
      // Try to extract JSON from markdown code blocks
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        console.log('Found JSON in code block')
        extractedData = JSON.parse(codeBlockMatch[1])
      } else {
        // Try to extract JSON object from response
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          console.log('Found JSON object in response')
          extractedData = JSON.parse(jsonMatch[0])
        } else {
          console.error('No JSON found in response:', response)
          // Return default structure if AI fails to return JSON
          console.log('Using fallback extraction from text')
          extractedData = {
            contractValue: null,
            startDate: null,
            endDate: null,
            clientName: null,
            description: 'Contract uploaded but AI could not extract structured data',
            milestones: [],
            paymentTerms: null,
            deliverables: [],
            confidence: 0.1,
            reasoning: 'AI response was not in expected JSON format'
          }
        }
      }
    }

    // Validate required structure
    if (typeof extractedData !== 'object') {
      throw new Error('AI response is not a valid object')
    }

    // Set defaults for missing fields
    const validatedData: ExtractedContractData = {
      contractValue: extractedData.contractValue || null,
      workStartDate: extractedData.workStartDate || null,
      workEndDate: extractedData.workEndDate || null,
      billingStartDate: extractedData.billingStartDate || null,
      billingEndDate: extractedData.billingEndDate || null,
      // Use work dates as fallback for legacy fields
      startDate: extractedData.startDate || extractedData.workStartDate || null,
      endDate: extractedData.endDate || extractedData.workEndDate || null,
      clientName: extractedData.clientName || null,
      description: extractedData.description || null,
      milestones: Array.isArray(extractedData.milestones) ? extractedData.milestones : [],
      paymentTerms: extractedData.paymentTerms || null,
      deliverables: Array.isArray(extractedData.deliverables) ? extractedData.deliverables : [],
      confidence: (() => {
        const rawConfidence = extractedData.confidence || 0;
        console.log('Raw confidence from AI:', rawConfidence);
        // If > 1, assume it's a percentage and convert to decimal
        const normalized = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
        console.log('Normalized confidence:', normalized);
        // Ensure it's between 0 and 1
        return Math.min(1, Math.max(0, normalized));
      })(),
      reasoning: extractedData.reasoning || 'No reasoning provided'
    }

    return validatedData

  } catch (error) {
    console.error('AI extraction error:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('OpenAI API key is invalid or expired')
      } else if (error.message.includes('429')) {
        throw new Error('OpenAI rate limit exceeded - please try again in a moment')
      } else if (error.message.includes('timeout')) {
        throw new Error('AI extraction timed out - the document may be too long')
      } else if (error.message.includes('JSON')) {
        throw new Error('AI returned invalid response format - please try again')
      }
    }
    
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