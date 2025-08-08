'use client'

import { useState } from 'react'
import { FileUploadEnhanced } from '@/components/file-upload-enhanced'
import { ContractEditor } from '@/components/contract-editor'
import { RevenueCalculator } from '@/components/revenue-calculator'
import { ExportButtons } from '@/components/export-buttons'
import type { RevenueAllocation } from '@/lib/revenue-calculator'

interface ContractData {
  id: string
  filename: string
  status: string
  contractValue: number | null
  startDate?: string | null
  endDate?: string | null
  clientName?: string | null
  description?: string | null
  extractedInfo?: {
    amounts: string[]
    dates: string[]
    emails: string[]
    wordCount: number
  }
  aiExtractedData?: {
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
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [contractData, setContractData] = useState<ContractData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revenueAllocations, setRevenueAllocations] = useState<RevenueAllocation[]>([])

  const handleProcessComplete = async (extractedText: string, file: File) => {
    console.log('=== handleProcessComplete called ===')
    console.log('File:', file.name, file.type, file.size)
    console.log('ExtractedText length:', extractedText?.length || 0)
    
    setIsProcessing(true)
    setError(null)
    setContractData(null)

    try {
      const formData = new FormData()
      
      // If we have extracted text (from PDF), send it directly
      if (extractedText) {
        console.log('Sending extracted text to server:', {
          length: extractedText.length,
          firstChars: extractedText.substring(0, 100),
          lastChars: extractedText.substring(extractedText.length - 100)
        })
        formData.append('extractedText', extractedText)
        formData.append('fileName', file.name)
        formData.append('fileType', file.type)
      } else {
        // For Word docs, send the file for server processing
        formData.append('file', file)
      }
      formData.append('useAI', 'true') // Always use AI extraction

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      console.log('Upload response:', result)
      
      if (!response.ok && !result.contract) {
        throw new Error(result.error || 'Failed to upload file')
      }

      if (result.contract) {
        setContractData(result.contract)
      }
      
      // Show warnings if AI extraction failed
      if (!result.success && result.debug?.error) {
        setError(`AI extraction issue: ${result.debug.error}. Text was extracted (${result.debug.textLength} chars) but AI couldn't parse contract details.`)
      } else if (result.contract?.validation?.warnings?.length > 0) {
        setError('Warning: ' + result.contract.validation.warnings.join(', '))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ContractSync AI v2.0
          </h1>
          <p className="text-gray-600 mb-6">
            AI-powered contract analysis for revenue recognition and milestone tracking
            <br />
            <span className="text-sm text-blue-600">Supports Word docs, PDFs, and scanned contracts with OCR</span>
          </p>
          
        </div>

        <FileUploadEnhanced onProcessComplete={handleProcessComplete} isProcessing={isProcessing} />

        {isProcessing && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-blue-800 font-medium">Processing your contract...</p>
                <p className="text-blue-600 text-sm mt-1">
                  Extracting text • Running AI analysis • Calculating revenue allocations
                </p>
                <p className="text-blue-500 text-xs mt-2">
                  This may take 10-30 seconds depending on document size
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        {contractData && (
          <div className="mt-8 space-y-6">
            <ContractEditor contractData={contractData} />
            <RevenueCalculator 
              contractData={contractData} 
              onAllocationsChange={(allocations) => {
                console.log('Revenue allocations updated:', allocations)
                setRevenueAllocations(allocations)
              }}
            />
            <ExportButtons 
              contractData={contractData} 
              revenueAllocations={revenueAllocations}
            />
          </div>
        )}
      </div>
    </div>
  )
}
