'use client'

import { useState } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'

export default function AzureDebugPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setResult(null)
    setStatus('Processing... This may take up to 60 seconds for multi-page PDFs...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/azure-ocr-debug', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        setStatus('✅ Azure OCR Processed Successfully')
      } else {
        setStatus(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setStatus(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Azure OCR Deep Debug</h1>
        <p className="text-gray-600 mb-6">Upload a PDF to see exactly what Azure OCR is extracting</p>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload your multi-page PDF</p>
              <p className="text-sm text-gray-500 mt-1">We\'ll analyze exactly what Azure OCR extracts</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>
          </label>
          
          {loading && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-3 text-gray-600">{status}</p>
            </div>
          )}
        </div>
        
        {result && !loading && (
          <div className="space-y-6">
            {/* Summary Card */}
            {result.success && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Azure OCR Results Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded p-3">
                    <p className="text-sm text-gray-600">Total Pages</p>
                    <p className="text-2xl font-bold text-blue-600">{result.azure?.pageCount || 0}</p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-sm text-gray-600">Total Characters</p>
                    <p className="text-2xl font-bold text-green-600">{result.extraction?.totalCharacters || 0}</p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-sm text-gray-600">Avg Chars/Page</p>
                    <p className="text-2xl font-bold text-purple-600">{result.extraction?.charactersPerPage || 0}</p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-sm text-gray-600">File Size</p>
                    <p className="text-2xl font-bold text-orange-600">{result.file?.sizeKB || 0} KB</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Critical Issue Alert */}
            {result.success && result.extraction?.totalCharacters < 10000 && result.azure?.pageCount > 1 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-6">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  ⚠️ Potential Issue Detected
                </h3>
                <p className="text-red-700">
                  Azure processed {result.azure.pageCount} pages but only extracted {result.extraction.totalCharacters} characters total.
                  This suggests Azure might be hitting a character limit or the PDF has minimal text content.
                </p>
              </div>
            )}
            
            {/* Page Details */}
            {result.extraction?.pageDetails && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Page-by-Page Analysis</h2>
                <div className="space-y-2">
                  {result.extraction.pageDetails.map((page: any) => (
                    <div key={page.pageNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">Page {page.pageNumber}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">{page.lineCount} lines</span>
                        <span className="text-blue-600 font-medium">{page.characterCount} characters</span>
                        <span className="text-gray-500">{page.width}x{page.height} {page.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Check if only first page has content */}
                {result.extraction.pageDetails.length > 1 && 
                 result.extraction.pageDetails[0]?.characterCount > 1000 &&
                 result.extraction.pageDetails.slice(1).every((p: any) => p.characterCount < 100) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Issue:</strong> Only page 1 has significant content. Other pages appear empty or nearly empty.
                      This might indicate the PDF is corrupted or Azure is having issues reading beyond page 1.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Text Previews */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Extracted Text Preview</h2>
              
              <div className="mb-4">
                <h3 className="font-medium mb-2">First 1000 characters:</h3>
                <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {result.textPreview || 'No text extracted'}
                </pre>
              </div>
              
              {result.lastTextPreview && (
                <div>
                  <h3 className="font-medium mb-2">Last 500 characters (to verify all pages extracted):</h3>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {result.lastTextPreview}
                  </pre>
                </div>
              )}
            </div>
            
            {/* Full Response */}
            <details className="bg-white rounded-lg shadow-md p-6">
              <summary className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700">
                View Complete Azure Response (Technical Details)
              </summary>
              <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
            
            {/* Error Display */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-2">Error Details</h2>
                <p className="text-red-600">{result.error}</p>
                {result.message && (
                  <p className="text-sm text-red-500 mt-2">{result.message}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}