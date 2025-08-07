import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    version: '2.0.0',
    timestamp: '2025-01-07T15:30:00Z',
    features: [
      'AI extraction always enabled',
      'No checkbox required',
      'AWS Textract OCR for scanned PDFs',
      'No fallback to basic extraction'
    ],
    commit: '80a7146'
  })
}