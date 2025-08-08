'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'

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

  const processFile = async (file: File) => {
    console.log('=== processFile called ===')
    console.log('File:', file.name, file.type, file.size)
    
    setError(null)
    setIsProcessing(true)
    
    try {
      // Always use server-side processing for all file types
      if (file.type === 'application/pdf') {
        setProcessingStatus('Processing PDF on server...')
        console.log('PDF detected, sending to server')
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        setProcessingStatus('Processing Word document on server...')
        console.log('Word doc detected, sending to server')
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or Word document.')
      }
      
      // Always pass empty string for extractedText to force server processing
      console.log('Calling onProcessComplete with empty string and file')
      onProcessComplete('', file)
      setProcessingStatus('Upload complete - processing on server...')
      
    } catch (err) {
      console.error('File processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setProcessingStatus('')
      setIsProcessing(false)
    }
    // Don't set isProcessing to false here - let the parent component handle it
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
  }, [processFile])

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
          relative border-2 border-dashed rounded-lg p-8
          transition-colors duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isProcessing || externalProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
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
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {processingStatus && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <p className="text-sm text-blue-600">{processingStatus}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {isProcessing || externalProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
                  <p className="text-sm font-medium text-gray-900">Processing your contract...</p>
                  <p className="text-xs text-gray-500 mt-1">Please wait while we extract and analyze</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm font-medium text-gray-900">Drop your contract here</p>
                  <p className="text-xs text-gray-500 mt-1">or click to select</p>
                  <p className="text-xs text-gray-400 mt-2">Supports PDF and Word documents</p>
                  <p className="text-xs text-green-600 mt-1 font-semibold">
                    ✨ AI-powered extraction with OCR support
                  </p>
                </>
              )}
            </>
          )}
        </label>

        {selectedFile && !isProcessing && !externalProcessing && (
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Processing Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {processingStatus && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 font-medium">
            {processingStatus}
          </p>
        </div>
      )}
    </div>
  )
}