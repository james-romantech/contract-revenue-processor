'use client'

import { useState, useEffect } from 'react'
import { FileUploadEnhanced } from '@/components/file-upload-enhanced'
import { ContractEditor } from '@/components/contract-editor'
import { RevenueCalculator } from '@/components/revenue-calculator'
import { ExportButtons } from '@/components/export-buttons'
import { NavigationHeader } from '@/components/navigation-header'
import type { RevenueAllocation } from '@/lib/revenue-calculator'
import { FileText, Sparkles, Shield, Zap, CheckCircle, TrendingUp, Award } from 'lucide-react'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <>
      <NavigationHeader />
      
      {/* Hero Section with Gradient Background */}
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        
        {/* Floating Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        
        <div className="relative z-10 w-full">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
            {/* Hero Content */}
            <div className={`text-center mb-16 ${mounted ? 'slide-up' : 'opacity-0'}`}>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl">
                  <FileText className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="gradient-text">ContractSync AI</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Transform your contracts into actionable insights with 
                <span className="font-semibold text-gray-900"> AI-powered extraction</span> and 
                <span className="font-semibold text-gray-900"> intelligent revenue recognition</span>
              </p>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium">AI-Powered</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Enterprise Secure</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">5,000 Pages Free</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">99% Accuracy</span>
                </div>
              </div>
              
              {/* Stats Section */}
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12">
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text">10s</div>
                  <div className="text-sm text-gray-600">Avg. Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text">OCR</div>
                  <div className="text-sm text-gray-600">Scanned PDFs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text">4+</div>
                  <div className="text-sm text-gray-600">Revenue Methods</div>
                </div>
              </div>
            </div>

            {/* Upload Section with Glass Effect */}
            <div className="max-w-4xl mx-auto">
              <div className="glass-effect rounded-2xl p-8 shadow-2xl">
                <FileUploadEnhanced onProcessComplete={handleProcessComplete} isProcessing={isProcessing} />
              </div>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mt-8 max-w-4xl mx-auto">
                <div className="card-modern bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
                      <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">AI Analysis in Progress</p>
                      <p className="text-white/90 text-sm mt-1">
                        Extracting contract details • Identifying milestones • Calculating revenue schedules
                      </p>
                      <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-white rounded-full shimmer" style={{ width: '60%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-8 max-w-4xl mx-auto slide-up">
                <div className="card-modern border-l-4 border-red-500 bg-red-50">
                  <p className="text-red-800 font-medium">⚠️ {error}</p>
                </div>
              </div>
            )}

            {/* Contract Data Display */}
            {contractData && (
              <div className="mt-12 space-y-8 w-full max-w-6xl mx-auto slide-up">
                {/* Success Notification */}
                <div className="card-modern bg-gradient-to-r from-green-500 to-emerald-600 text-white max-w-4xl mx-auto">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8" />
                    <div>
                      <p className="font-semibold text-lg">Contract Successfully Analyzed!</p>
                      <p className="text-white/90 text-sm">
                        {contractData.aiExtractedData?.confidence ? 
                          `AI Confidence: ${contractData.aiExtractedData.confidence > 1 ? 
                            contractData.aiExtractedData.confidence.toFixed(1) : 
                            (contractData.aiExtractedData.confidence * 100).toFixed(1)}%` : 
                          'Processing complete'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Contract Editor with Modern Card */}
                <div className="card-modern hover-lift">
                  <ContractEditor contractData={contractData} />
                </div>
                
                {/* Revenue Calculator with Modern Card */}
                <div className="card-modern hover-lift">
                  <RevenueCalculator 
                    contractData={contractData} 
                    onAllocationsChange={(allocations) => {
                      console.log('Revenue allocations updated:', allocations)
                      setRevenueAllocations(allocations)
                    }}
                  />
                </div>
                
                {/* Export Buttons with Modern Card */}
                <div className="card-modern hover-lift">
                  <ExportButtons 
                    contractData={contractData} 
                    revenueAllocations={revenueAllocations}
                  />
                </div>
              </div>
            )}
            
            {/* Features Section */}
            {!contractData && !isProcessing && (
              <div className="mt-24 mb-20 grid md:grid-cols-3 gap-10 max-w-6xl mx-auto px-4">
                <div className="card-modern text-center hover-lift p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Smart Extraction</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    AI understands implicit contract language and extracts key terms automatically
                  </p>
                </div>
                
                <div className="card-modern text-center hover-lift p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Revenue Recognition</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Multiple methods including straight-line, milestone-based, and percentage complete
                  </p>
                </div>
                
                <div className="card-modern text-center hover-lift p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Enterprise Ready</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Secure processing with OCR support for scanned documents
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  )
}