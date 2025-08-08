

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { BulkUploadParent, ValidationError, BulkUploadValidation } from '../../../../lib/types'
import * as XLSX from 'xlsx'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePhone(phone: string): boolean {
  if (!phone || phone.trim() === '') return true // Phone is optional
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

function normalizeHeaders(headers: string[]): { [key: string]: string } {
  const headerMap: { [key: string]: string } = {}
  
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim()
    
    // Map various header formats to our standard fields
    if (normalized.includes('name') || normalized === 'full name' || normalized === 'parent name') {
      headerMap[index] = 'name'
    } else if (normalized.includes('email') || normalized === 'email address') {
      headerMap[index] = 'email'
    } else if (normalized.includes('phone') && !normalized.includes('emergency')) {
      headerMap[index] = 'phone'
    } else if (normalized.includes('address')) {
      headerMap[index] = 'address'
    } else if (normalized.includes('emergency') && normalized.includes('contact')) {
      headerMap[index] = 'emergencyContact'
    } else if (normalized.includes('emergency') && normalized.includes('phone')) {
      headerMap[index] = 'emergencyPhone'
    } else if (normalized.includes('note')) {
      headerMap[index] = 'notes'
    }
  })
  
  return headerMap
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file format. Please upload a CSV or Excel file.' 
      }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    let parsedData: any[] = []
    let headers: string[] = []

    try {
      if (fileExtension === 'csv') {
        // Parse CSV file
        const textData = new TextDecoder().decode(buffer)
        const lines = textData.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          return NextResponse.json({ error: 'File is empty' }, { status: 400 })
        }

        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          parsedData.push(row)
        }
      } else {
        // Parse Excel file
        const workbook = XLSX.read(buffer, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[]
        
        if (jsonData.length === 0) {
          return NextResponse.json({ error: 'File is empty' }, { status: 400 })
        }

        headers = jsonData[0] || []
        
        for (let i = 1; i < jsonData.length; i++) {
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = jsonData[i]?.[index] || ''
          })
          parsedData.push(row)
        }
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError)
      return NextResponse.json({ 
        error: 'Failed to parse file. Please check the file format and try again.' 
      }, { status: 400 })
    }

    // Normalize headers and extract data
    const headerMap = normalizeHeaders(headers)
    const data: BulkUploadParent[] = []
    const errors: ValidationError[] = []
    
    // Get existing emails from Convex for duplicate checking
    const existingParentsResponse = await convex.query(api.parents.getParents, { limit: 1000 });
    const existingEmails = new Set(existingParentsResponse.parents.map((p: any) => p.email.toLowerCase()));

    // Track email duplicates within the file
    const emailCounts: { [email: string]: number[] } = {}

    parsedData.forEach((row, index) => {
      const rowNum = index + 2 // +2 because array is 0-indexed and we skip header row
      const parentData: BulkUploadParent = {
        name: '',
        email: '',
        phone: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        notes: ''
      }

      // Extract data using header mapping
      Object.entries(headerMap).forEach(([colIndex, field]) => {
        const value = row[headers[parseInt(colIndex)]]?.toString().trim() || ''
        if (field in parentData) {
          (parentData as any)[field] = value
        }
      })

      // Validate required fields
      if (!parentData.name || parentData.name.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'name',
          message: 'Name is required',
          value: parentData.name
        })
      }

      if (!parentData.email || parentData.email.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'email',
          message: 'Email is required',
          value: parentData.email
        })
      } else if (!validateEmail(parentData.email)) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: 'Invalid email format',
          value: parentData.email
        })
      } else {
        // Track email duplicates
        const emailLower = parentData.email.toLowerCase()
        if (!emailCounts[emailLower]) {
          emailCounts[emailLower] = []
        }
        emailCounts[emailLower].push(rowNum)
      }

      // Validate phone numbers
      if (parentData.phone && !validatePhone(parentData.phone)) {
        errors.push({
          row: rowNum,
          field: 'phone',
          message: 'Invalid phone number format',
          value: parentData.phone
        })
      }

      if (parentData.emergencyPhone && !validatePhone(parentData.emergencyPhone)) {
        errors.push({
          row: rowNum,
          field: 'emergencyPhone',
          message: 'Invalid emergency phone number format',
          value: parentData.emergencyPhone
        })
      }

      data.push(parentData)
    })

    // Find duplicates
    const duplicates = Object.entries(emailCounts)
      .filter(([email, rows]) => rows.length > 1 || existingEmails.has(email))
      .map(([email, rows]) => ({
        email,
        rows,
        existsInDb: existingEmails.has(email)
      }))

    // Add duplicate errors
    duplicates.forEach(duplicate => {
      duplicate.rows.forEach(row => {
        if (duplicate.existsInDb) {
          errors.push({
            row,
            field: 'email',
            message: 'Email already exists in database',
            value: duplicate.email
          })
        } else if (duplicate.rows.length > 1) {
          errors.push({
            row,
            field: 'email',
            message: 'Duplicate email in file',
            value: duplicate.email
          })
        }
      })
    })

    // Calculate statistics
    const totalRows = data.length
    const errorRows = [...new Set(errors.map(e => e.row))].length
    const duplicateRows = duplicates.reduce((acc, d) => acc + d.rows.length, 0)
    const validRows = totalRows - errorRows

    const result: BulkUploadValidation = {
      data,
      errors,
      duplicates,
      stats: {
        totalRows,
        validRows,
        errorRows,
        duplicateRows
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file. Please try again.' },
      { status: 500 }
    )
  }
}
