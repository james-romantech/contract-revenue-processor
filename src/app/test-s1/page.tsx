'use client'

import { useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

export default function TestS1Page() {
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
      
      const response = await fetch('/api/test-full-pdf', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ 
        error: 'Request failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Azure S1 Tier Full PDF Test</h1>
          <p className="text-gray-600">Test if Azure S1 (Developer) tier processes all 6 pages of your PDF</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Upload your 6-page PDF to test S1 tier extraction</p>
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
              <p className="mt-3 text-gray-600">Processing with Azure S1 tier... (30-60 seconds)</p>
            </div>
          )}
        </div>
        
        {result && !loading && (
          <div className="space-y-6">
            {/* Main Status */}
            {result.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-green-800 mb-3">
                      Azure S1 Processed {result.azure?.pagesProcessed || 0} Pages
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">File Size</p>
                        <p className="text-lg font-medium">{result.file?.sizeKB} KB</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Characters</p>
                        <p className="text-lg font-medium">{result.azure?.totalCharacters || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                  <div>
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Processing Failed</h2>
                    <p className="text-red-700">{result.error}</p>
                    {result.message && <p className="text-sm text-red-600 mt-1">{result.message}</p>}
                  </div>
                </div>
              </div>
            )}
            
            {/* Critical Issue Detection */}
            {result.success && result.azure?.pagesProcessed < 6 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-amber-800 mb-2">
                      ⚠️ Only {result.azure.pagesProcessed} of 6 Pages Processed
                    </h3>
                    <p className="text-amber-700 mb-3">
                      Azure S1 tier should process all pages. Possible issues:
                    </p>
                    <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                      <li>Pages 3-6 might be images (not text-based)</li>
                      <li>PDF might be corrupted after page 2</li>
                      <li>Azure region might have undocumented limits</li>
                      <li>File might be truncated during upload</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Page-by-Page Analysis */}
            {result.pages && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Page-by-Page Analysis
                </h2>
                <div className="space-y-2">
                  {result.pages.map((page: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3 rounded ${
                        page.characterCount > 0 ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Page {page.pageNumber}</span>
                        {page.characterCount === 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Empty</span>
                        )}
                      </div>
                      <div className="flex gap-6 text-sm">
                        <span>{page.lineCount} lines</span>
                        <span className="font-medium">{page.characterCount} characters</span>
                        <span className="text-gray-500">{page.width}x{page.height} {page.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Expected vs Actual Pages */}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm">
                    <strong>Expected:</strong> 6 pages | 
                    <strong className="ml-2">Actual:</strong> {result.pages.length} pages | 
                    <strong className="ml-2">Status:</strong> {
                      result.pages.length === 6 ? '✅ All pages processed' : 
                      `⚠️ Missing ${6 - result.pages.length} pages`
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Debug Information */}
            <details className="bg-white rounded-lg shadow-md p-6">
              <summary className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700">
                View Complete Response Data
              </summary>
              <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}