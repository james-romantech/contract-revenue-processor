'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle, Sparkles, FileUp, FilePlus } from 'lucide-react'

interface FileUploadEnhancedProps {
  onProcessComplete: (extractedText: string, file: File) => void
  isProcessing?: boolean
}

export function FileUploadEnhanced({ onProcessComplete, isProcessing: externalProcessing = false }: FileUploadEnhancedProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Clear processing states when external processing completes
  useEffect(() => {
    if (!externalProcessing && isProcessing) {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }, [externalProcessing, isProcessing])

  const processFile = async (file: File) => {
    console.log('=== processFile called ===')
    console.log('File:', file.name, file.type, file.size)
    
    setError(null)
    setIsProcessing(true)
    
    try {
      // Always use server-side processing for all file types
      if (file.type === 'application/pdf') {
        setProcessingStatus('Processing PDF with AI extraction...')
        console.log('PDF detected, sending to server')
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        setProcessingStatus('Processing Word document with AI...')
        console.log('Word doc detected, sending to server')
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or Word document.')
      }
      
      // Always pass empty string for extractedText to force server processing
      console.log('Calling onProcessComplete with empty string and file')
      onProcessComplete('', file)
      setProcessingStatus('Analyzing contract with AI...')
      // The parent component will set externalProcessing to false when done,
      // which will trigger our useEffect to clear the local states
      
    } catch (err) {
      console.error('File processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setProcessingStatus('')
      setIsProcessing(false)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        setSelectedFile(file)
        // Always auto-process all files now
        await processFile(file)
      } else {
        setError('Please upload a PDF or Word document')
      }
    }
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      // Always auto-process all files now
      await processFile(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError(null)
    setProcessingStatus('')
  }

  return (
    <div className="w-full">
      <form
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative rounded-2xl p-10
          transition-all duration-300 transform
          ${dragActive 
            ? 'scale-105 border-2 border-indigo-500 bg-indigo-50/50 shadow-2xl' 
            : 'border-2 border-dashed border-gray-300/50 hover:border-indigo-400/50 hover:shadow-xl'}
          ${isProcessing || externalProcessing 
            ? 'cursor-not-allowed' 
            : 'cursor-pointer'}
        `}
        style={{
          background: dragActive 
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)' 
            : 'transparent'
        }}
      >
        <input
          type="file"
          id="file-upload"
          className="sr-only"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          disabled={isProcessing || externalProcessing}
        />
        
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          {selectedFile ? (
            <div className="text-center">
              {/* File Icon with Gradient Background */}
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                {processingStatus && (isProcessing || externalProcessing) && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                    </div>
                  </div>
                )}
                {processingStatus && !isProcessing && !externalProcessing && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
              {processingStatus && (
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {(isProcessing || externalProcessing) && (
                      <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                    )}
                    <p className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {processingStatus}
                    </p>
                  </div>
                  {(isProcessing || externalProcessing) && (
                    <div className="w-48 mx-auto bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shimmer" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {isProcessing || externalProcessing ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
                    <Upload className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Processing your contract...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Please wait while we extract and analyze
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  {/* Upload Icon with Animation */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Drop your contract here
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    or <span className="text-indigo-600 dark:text-indigo-400 font-medium">browse</span> to select
                  </p>
                  
                  {/* Supported Formats */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                      PDF
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                      Word
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                      OCR Ready
                    </span>
                  </div>
                  
                  {/* Features */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    <span>AI-powered extraction with 99% accuracy</span>
                  </div>
                </div>
              )}
            </>
          )}
        </label>

        {selectedFile && !isProcessing && !externalProcessing && (
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </form>

      {error && (
        <div className="mt-6 slide-up">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-200">Processing Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}