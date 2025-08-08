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

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0.00'
  // Ensure amount is a number
  const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(numAmount)) return '0.00'
  return numAmount.toFixed(2)
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
      const amount = typeof milestone.amount === 'number' ? milestone.amount : parseFloat(String(milestone.amount)) || 0
      contractData.push([
        milestone.name,
        formatCurrency(amount),
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
      const amount = typeof allocation.amount === 'number' ? allocation.amount : parseFloat(String(allocation.amount)) || 0
      contractData.push([
        allocation.description,
        formatCurrency(amount),
        formatDate(allocation.recognitionDate),
        allocation.type
      ])
    })
    
    // Add total
    const total = data.revenueAllocations.reduce((sum, a) => {
      const amount = typeof a.amount === 'number' ? a.amount : parseFloat(String(a.amount)) || 0
      return sum + amount
    }, 0)
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

  // Sheet 1: Revenue Schedule (with contract info on each row)
  if (data.revenueAllocations && data.revenueAllocations.length > 0) {
    const revenueData = [
      ['File Name', 'Client Name', 'Contract Value', 'Contract Description', 'Revenue Description', 'Amount', 'Recognition Date']
    ]
    
    data.revenueAllocations.forEach(allocation => {
      const amount = typeof allocation.amount === 'number' ? allocation.amount : parseFloat(String(allocation.amount)) || 0
      revenueData.push([
        data.contractInfo.filename,
        data.contractInfo.clientName || '',
        data.contractInfo.contractValue || 0,
        data.contractInfo.description || '',
        allocation.description,
        amount,
        formatDate(allocation.recognitionDate)
      ])
    })
    
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData)
    
    // Format currency columns
    if (wsRevenue['C2'] && wsRevenue['F2']) {
      for (let i = 2; i <= revenueData.length; i++) {
        // Contract Value column (C)
        const cellC = wsRevenue[`C${i}`]
        if (cellC && typeof cellC.v === 'number') {
          cellC.z = '$#,##0.00'
        }
        // Amount column (F)
        const cellF = wsRevenue[`F${i}`]
        if (cellF && typeof cellF.v === 'number') {
          cellF.z = '$#,##0.00'
        }
      }
    }
    
    // Set column widths
    wsRevenue['!cols'] = [
      { wch: 40 }, // File Name
      { wch: 25 }, // Client Name
      { wch: 15 }, // Contract Value
      { wch: 50 }, // Contract Description
      { wch: 40 }, // Revenue Description
      { wch: 15 }, // Amount
      { wch: 15 }  // Recognition Date
    ]
    
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue Schedule')
  }

  // Sheet 2: Billing Schedule (Milestones)
  if (data.milestones && data.milestones.length > 0) {
    const billingData = [
      ['File Name', 'Client Name', 'Contract Value', 'Contract Description', 'Milestone Name', 'Amount', 'Due Date']
    ]
    
    data.milestones.forEach(milestone => {
      const amount = typeof milestone.amount === 'number' ? milestone.amount : parseFloat(String(milestone.amount)) || 0
      billingData.push([
        data.contractInfo.filename,
        data.contractInfo.clientName || '',
        data.contractInfo.contractValue || 0,
        data.contractInfo.description || '',
        milestone.name,
        amount,
        formatDate(milestone.dueDate)
      ])
    })
    
    const wsBilling = XLSX.utils.aoa_to_sheet(billingData)
    
    // Format currency columns
    if (wsBilling['C2'] && wsBilling['F2']) {
      for (let i = 2; i <= billingData.length; i++) {
        // Contract Value column (C)
        const cellC = wsBilling[`C${i}`]
        if (cellC && typeof cellC.v === 'number') {
          cellC.z = '$#,##0.00'
        }
        // Amount column (F)
        const cellF = wsBilling[`F${i}`]
        if (cellF && typeof cellF.v === 'number') {
          cellF.z = '$#,##0.00'
        }
      }
    }
    
    // Set column widths
    wsBilling['!cols'] = [
      { wch: 40 }, // File Name
      { wch: 25 }, // Client Name
      { wch: 15 }, // Contract Value
      { wch: 50 }, // Contract Description
      { wch: 30 }, // Milestone Name
      { wch: 15 }, // Amount
      { wch: 15 }  // Due Date
    ]
    
    XLSX.utils.book_append_sheet(wb, wsBilling, 'Billing Schedule')
  } else {
    // If no milestones, create an empty Billing Schedule with just headers
    const billingData = [
      ['File Name', 'Client Name', 'Contract Value', 'Contract Description', 'Milestone Name', 'Amount', 'Due Date'],
      ['No billing milestones found', '', '', '', '', '', '']
    ]
    
    const wsBilling = XLSX.utils.aoa_to_sheet(billingData)
    
    // Set column widths
    wsBilling['!cols'] = [
      { wch: 40 }, // File Name
      { wch: 25 }, // Client Name
      { wch: 15 }, // Contract Value
      { wch: 50 }, // Contract Description
      { wch: 30 }, // Milestone Name
      { wch: 15 }, // Amount
      { wch: 15 }  // Due Date
    ]
    
    XLSX.utils.book_append_sheet(wb, wsBilling, 'Billing Schedule')
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