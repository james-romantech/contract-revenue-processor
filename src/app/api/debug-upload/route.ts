import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const useAI = formData.get('useAI')
    
    const openaiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
    
    // Detailed debugging info
    const debugInfo = {
      file: {
        received: !!file,
        name: file?.name,
        size: file?.size,
        type: file?.type
      },
      useAI: {
        rawValue: useAI,
        stringValue: useAI?.toString(),
        isTrue: useAI === 'true',
        booleanCheck: useAI?.toString() === 'true'
      },
      openaiKey: {
        exists: !!openaiKey,
        length: openaiKey?.length,
        startsWithSk: openaiKey?.startsWith('sk-'),
        isNotPlaceholder: openaiKey !== 'your-openai-api-key-here'
      },
      condition: {
        useAICheck: useAI === 'true',
        hasKeyCheck: !!openaiKey,
        notPlaceholderCheck: openaiKey !== 'your-openai-api-key-here',
        allConditionsMet: (useAI === 'true') && !!openaiKey && (openaiKey !== 'your-openai-api-key-here')
      },
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(debugInfo)
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}