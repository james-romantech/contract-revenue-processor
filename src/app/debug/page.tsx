'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

export default function DebugPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/debug-extraction', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Upload failed' })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Contract Extraction Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload PDF or Word document</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>
          </label>
          
          {loading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Processing document...</p>
            </div>
          )}
        </div>
        
        {result && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">File Information</h2>
              <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                {JSON.stringify(result.file, null, 2)}
              </pre>
            </div>
            
            {/* Debug Info */}
            {result.debug && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Analysis</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result.debug, null, 2)}
                </pre>
              </div>
            )}
            
            {/* AI Extraction */}
            {result.extraction?.aiExtraction && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">AI Extraction Result</h2>
                <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto max-h-96">
                  {JSON.stringify(result.extraction.aiExtraction, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Table Detection */}
            {result.extraction?.extractedText?.includes('[TABLE DETECTED]') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-yellow-800">📊 Tables Detected in Document</h2>
                <p className="text-sm text-yellow-700">The document contains structured table data which has been preserved for AI extraction.</p>
              </div>
            )}
            
            {/* Extraction Stats - Always show if we have extraction data */}
            {result.extraction && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">📊 Extraction Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Pages Extracted</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.extraction.pageCount}
                      {result.extraction.pageCount === 1 && result.extraction.estimatedPages > 1 && (
                        <span className="text-sm text-gray-500 block">~{result.extraction.estimatedPages} est.</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Total Characters</p>
                    <p className="text-2xl font-bold text-green-600">{result.extraction.textLength.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Avg Chars/Page</p>
                    <p className="text-2xl font-bold text-purple-600">{result.debug?.charactersPerPage?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600">File Size</p>
                    <p className="text-2xl font-bold text-orange-600">{(result.file?.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                
                {/* Warning or success message about processing method */}
                {result.extraction.is7562Limit && (
                  <div className={`mt-4 p-3 rounded ${
                    result.extraction.hasOCRMarkers || result.extraction.usedAzureOCR
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <p className={`text-sm font-semibold mb-1 ${
                      result.extraction.hasOCRMarkers || result.extraction.usedAzureOCR ? 'text-green-800' : 'text-amber-800'
                    }`}>
                      {result.extraction.hasOCRMarkers || result.extraction.usedAzureOCR
                        ? '✅ Azure OCR Successfully Processed Document' 
                        : '⚠️ PDF Extraction Hit 7,562 Character Limit - Azure OCR Processing...'}
                    </p>
                    <p className={`text-xs ${
                      result.extraction.hasOCRMarkers || result.extraction.usedAzureOCR ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {result.extraction.hasOCRMarkers || result.extraction.usedAzureOCR
                        ? `Azure OCR extracted ${result.extraction.textLength.toLocaleString()} characters from ${result.extraction.pageCount || result.extraction.estimatedPages} pages. All content should be complete.`
                        : 'PDF extraction hit the 7,562 character limit. The system should automatically use Azure OCR for complete extraction. If this persists, check Azure credentials.'}
                    </p>
                  </div>
                )}
                
                {/* Show processing method */}
                {result.extraction.processingMethod && (
                  <div className="mt-2 text-xs text-gray-600">
                    Processing Method: <span className="font-semibold">{result.extraction.processingMethod}</span>
                  </div>
                )}
                
                {result.extraction.pageBreakPatterns && result.extraction.pageBreakPatterns.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Page Indicators Found:</p>
                    <p className="text-xs text-blue-700">{result.extraction.pageBreakPatterns.join(', ')}</p>
                  </div>
                )}
                
                {result.extraction.pagesDetected && result.extraction.pagesDetected.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Page Markers:</p>
                    <p className="text-xs text-yellow-700">{result.extraction.pagesDetected.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Extracted Text */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                Extracted Text ({result.extraction?.textLength || 0} characters)
                {result.extraction?.extractedText?.includes('\t') && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Contains Tab-Separated Data</span>
                )}
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-xs text-gray-600 mb-2">First 5000 characters:</p>
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96">
                    {result.extraction?.textPreview || 'No text extracted'}
                  </pre>
                </div>
                
                {result.extraction?.lastTextPreview && (
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-xs text-gray-600 mb-2">Last 1000 characters (to verify all pages extracted):</p>
                    <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-48">
                      {result.extraction.lastTextPreview}
                    </pre>
                  </div>
                )}
              </div>
              
              {result.extraction?.fullText && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                    Show full extracted text
                  </summary>
                  <pre className="mt-2 text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap overflow-x-auto max-h-96">
                    {result.extraction.fullText}
                  </pre>
                </details>
              )}
            </div>
            
            {/* Error Display */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
                <p className="text-red-600">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}