'use client'

import { useState } from 'react'
import { Calendar, DollarSign, Building, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

interface ContractData {
  id: string
  filename: string
  status: string
  contractValue: number | null
  startDate: string | null
  endDate: string | null
  clientName: string | null
  description: string | null
  aiExtractedData?: {
    contractValue: number | null
    workStartDate?: string | null
    workEndDate?: string | null
    billingStartDate?: string | null
    billingEndDate?: string | null
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

interface ContractEditorProps {
  contractData: ContractData
  onSave?: (data: ContractData) => void
}

export function ContractEditor({ contractData, onSave }: ContractEditorProps) {
  const [editedData, setEditedData] = useState(contractData)
  const [isEditing, setIsEditing] = useState(false)

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMilestoneChange = (index: number, field: string, value: any) => {
    if (!editedData.aiExtractedData) return
    
    const updatedMilestones = [...editedData.aiExtractedData.milestones]
    updatedMilestones[index] = { ...updatedMilestones[index], [field]: value }
    
    setEditedData(prev => ({
      ...prev,
      aiExtractedData: {
        ...prev.aiExtractedData!,
        milestones: updatedMilestones
      }
    }))
  }

  const addMilestone = () => {
    if (!editedData.aiExtractedData) return
    
    setEditedData(prev => ({
      ...prev,
      aiExtractedData: {
        ...prev.aiExtractedData!,
        milestones: [
          ...prev.aiExtractedData!.milestones,
          { name: '', amount: 0, dueDate: '' }
        ]
      }
    }))
  }

  const removeMilestone = (index: number) => {
    if (!editedData.aiExtractedData) return
    
    const updatedMilestones = editedData.aiExtractedData.milestones.filter((_, i) => i !== index)
    setEditedData(prev => ({
      ...prev,
      aiExtractedData: {
        ...prev.aiExtractedData!,
        milestones: updatedMilestones
      }
    }))
  }

  const handleSave = () => {
    onSave?.(editedData)
    setIsEditing(false)
  }

  const aiData = editedData.aiExtractedData
  const validation = editedData.validation

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contract Analysis
          </h2>
          <p className="text-gray-600 text-sm mt-1">{contractData.filename}</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Validation Status */}
      {validation && (
        <div className="space-y-2">
          {validation.errors.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="font-medium text-red-700">Validation Errors:</p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-700">Warnings:</p>
                <ul className="text-sm text-yellow-600 list-disc list-inside">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {validation.isValid && validation.errors.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="font-medium text-green-700">Contract data validated successfully</p>
            </div>
          )}
        </div>
      )}

      {/* Contract Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <Building className="h-4 w-4" />
            Contract Information
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            {isEditing ? (
              <input
                type="text"
                value={aiData?.clientName || ''}
                onChange={(e) => handleFieldChange('clientName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter client name"
              />
            ) : (
              <p className="text-gray-900">{aiData?.clientName || 'Not detected'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Contract Value
            </label>
            {isEditing ? (
              <input
                type="number"
                value={aiData?.contractValue || ''}
                onChange={(e) => handleFieldChange('contractValue', parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter contract value"
              />
            ) : (
              <p className="text-gray-900">
                {aiData?.contractValue ? `$${aiData.contractValue.toLocaleString()}` : 'Not detected'}
              </p>
            )}
          </div>

          {/* Work Period Dates */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Work Period (for Straight-line Revenue)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Work Start
                </label>
                <p className="text-gray-900 text-sm">
                  {aiData?.workStartDate || aiData?.startDate || 'Not detected'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Work End
                </label>
                <p className="text-gray-900 text-sm">
                  {aiData?.workEndDate || aiData?.endDate || 'Not detected'}
                </p>
              </div>
            </div>
          </div>

          {/* Billing Period Dates */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Billing Period (for Billed-basis Revenue)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Billing Start
                </label>
                <p className="text-gray-900 text-sm">
                  {aiData?.billingStartDate || aiData?.startDate || 'Not detected'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Billing End
                </label>
                <p className="text-gray-900 text-sm">
                  {aiData?.billingEndDate || aiData?.endDate || 'Not detected'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            {isEditing ? (
              <textarea
                value={aiData?.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project description"
              />
            ) : (
              <p className="text-gray-900">{aiData?.description || 'Not detected'}</p>
            )}
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Milestones</h3>
            {isEditing && (
              <button
                onClick={addMilestone}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200"
              >
                Add Milestone
              </button>
            )}
          </div>
          
          {aiData?.milestones && aiData.milestones.length > 0 ? (
            <div className="space-y-3">
              {aiData.milestones.map((milestone, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-md">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
                        placeholder="Milestone name"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={milestone.amount}
                          onChange={(e) => handleMilestoneChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(e) => handleMilestoneChange(index, 'dueDate', e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => removeMilestone(index)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-sm">{milestone.name}</p>
                      <p className="text-sm text-gray-600">
                        ${milestone.amount.toLocaleString()} • Due: {milestone.dueDate}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No milestones detected</p>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {aiData && (
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-700 mb-2">AI Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-medium">Confidence:</span> {(aiData.confidence <= 1 ? aiData.confidence * 100 : aiData.confidence).toFixed(1)}%</p>
              <p><span className="font-medium">Payment Terms:</span> {aiData.paymentTerms || 'Not detected'}</p>
            </div>
            <div>
              <p><span className="font-medium">Deliverables:</span></p>
              <ul className="list-disc list-inside text-gray-600 ml-2">
                {aiData.deliverables.length > 0 ? 
                  aiData.deliverables.map((deliverable, index) => (
                    <li key={index}>{deliverable}</li>
                  )) : 
                  <li>None detected</li>
                }
              </ul>
            </div>
          </div>
          {aiData.reasoning && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm"><span className="font-medium">AI Reasoning:</span> {aiData.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}