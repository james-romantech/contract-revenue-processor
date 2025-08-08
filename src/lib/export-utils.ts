import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { format } from 'date-fns'

interface ExportData {
  contractInfo: {
    filename: string
    clientName: string | null
    contractValue: number | null
    startDate: Date | string | null
    endDate: Date | string | null
    description: string | null
  }
  milestones: Array<{
    name: string
    amount: number
    dueDate: Date | string
  }>
  revenueAllocations: Array<{
    description: string
    amount: number
    recognitionDate: Date | string
    type: string
  }>
}

function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '0.00'
  return amount.toFixed(2)
}

export function exportToCSV(data: ExportData, filename: string = 'contract-analysis') {
  console.log('exportToCSV called with:', { data, filename })
  
  // Prepare contract info data
  const contractData = [
    ['Contract Analysis Report'],
    ['Generated:', new Date().toISOString()],
    [],
    ['Contract Information'],
    ['Field', 'Value'],
    ['File Name', data.contractInfo.filename],
    ['Client Name', data.contractInfo.clientName || 'Not specified'],
    ['Contract Value', formatCurrency(data.contractInfo.contractValue)],
    ['Start Date', formatDate(data.contractInfo.startDate)],
    ['End Date', formatDate(data.contractInfo.endDate)],
    ['Description', data.contractInfo.description || 'Not specified'],
    []
  ]

  // Add milestones if any
  if (data.milestones && data.milestones.length > 0) {
    contractData.push(['Milestones'])
    contractData.push(['Name', 'Amount', 'Due Date'])
    data.milestones.forEach(milestone => {
      contractData.push([
        milestone.name,
        formatCurrency(milestone.amount),
        formatDate(milestone.dueDate)
      ])
    })
    contractData.push([])
  }

  // Add revenue allocations if any
  if (data.revenueAllocations && data.revenueAllocations.length > 0) {
    contractData.push(['Revenue Recognition Schedule'])
    contractData.push(['Description', 'Amount', 'Recognition Date', 'Type'])
    data.revenueAllocations.forEach(allocation => {
      contractData.push([
        allocation.description,
        formatCurrency(allocation.amount),
        formatDate(allocation.recognitionDate),
        allocation.type
      ])
    })
    
    // Add total
    const total = data.revenueAllocations.reduce((sum, a) => sum + a.amount, 0)
    contractData.push([])
    contractData.push(['Total', formatCurrency(total), '', ''])
  }

  // Convert to CSV
  const csv = Papa.unparse(contractData)
  console.log('CSV generated, length:', csv.length)
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToExcel(data: ExportData, filename: string = 'contract-analysis') {
  console.log('exportToExcel called with:', { data, filename })
  
  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Sheet 1: Contract Information
  const contractInfo = [
    ['Contract Analysis Report'],
    ['Generated:', new Date().toISOString()],
    [],
    ['Contract Information'],
    [],
    ['Field', 'Value'],
    ['File Name', data.contractInfo.filename],
    ['Client Name', data.contractInfo.clientName || 'Not specified'],
    ['Contract Value', data.contractInfo.contractValue ? `$${formatCurrency(data.contractInfo.contractValue)}` : ''],
    ['Start Date', formatDate(data.contractInfo.startDate)],
    ['End Date', formatDate(data.contractInfo.endDate)],
    ['Description', data.contractInfo.description || 'Not specified']
  ]
  
  const wsContract = XLSX.utils.aoa_to_sheet(contractInfo)
  
  // Set column widths
  wsContract['!cols'] = [
    { wch: 20 }, // Field column
    { wch: 50 }  // Value column
  ]
  
  XLSX.utils.book_append_sheet(wb, wsContract, 'Contract Info')

  // Sheet 2: Milestones (if any)
  if (data.milestones && data.milestones.length > 0) {
    const milestonesData = [
      ['Milestones'],
      [],
      ['Name', 'Amount', 'Due Date']
    ]
    
    data.milestones.forEach(milestone => {
      milestonesData.push([
        milestone.name,
        milestone.amount,
        formatDate(milestone.dueDate)
      ])
    })
    
    // Add total
    const totalMilestones = data.milestones.reduce((sum, m) => sum + m.amount, 0)
    milestonesData.push([])
    milestonesData.push(['Total', totalMilestones, ''])
    
    const wsMilestones = XLSX.utils.aoa_to_sheet(milestonesData)
    
    // Format currency columns
    if (wsMilestones['B4']) {
      for (let i = 4; i <= milestonesData.length; i++) {
        const cell = wsMilestones[`B${i}`]
        if (cell && typeof cell.v === 'number') {
          cell.z = '$#,##0.00'
        }
      }
    }
    
    // Set column widths
    wsMilestones['!cols'] = [
      { wch: 30 }, // Name
      { wch: 15 }, // Amount
      { wch: 15 }  // Date
    ]
    
    XLSX.utils.book_append_sheet(wb, wsMilestones, 'Milestones')
  }

  // Sheet 3: Revenue Recognition Schedule (if any)
  if (data.revenueAllocations && data.revenueAllocations.length > 0) {
    const revenueData = [
      ['Revenue Recognition Schedule'],
      [],
      ['Description', 'Amount', 'Recognition Date', 'Type']
    ]
    
    data.revenueAllocations.forEach(allocation => {
      revenueData.push([
        allocation.description,
        allocation.amount,
        formatDate(allocation.recognitionDate),
        allocation.type
      ])
    })
    
    // Add total
    const totalRevenue = data.revenueAllocations.reduce((sum, a) => sum + a.amount, 0)
    revenueData.push([])
    revenueData.push(['Total', totalRevenue, '', ''])
    
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData)
    
    // Format currency columns
    if (wsRevenue['B4']) {
      for (let i = 4; i <= revenueData.length; i++) {
        const cell = wsRevenue[`B${i}`]
        if (cell && typeof cell.v === 'number') {
          cell.z = '$#,##0.00'
        }
      }
    }
    
    // Set column widths
    wsRevenue['!cols'] = [
      { wch: 40 }, // Description
      { wch: 15 }, // Amount
      { wch: 15 }, // Date
      { wch: 15 }  // Type
    ]
    
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue Schedule')
  }

  // Generate and download the Excel file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.xlsx`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}