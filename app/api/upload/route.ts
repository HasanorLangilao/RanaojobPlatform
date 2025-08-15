import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${uuidv4()}.${fileExtension}`
    
    // Create the file path
    const relativePath = `/uploads/business-permits/${uniqueFilename}`
    const absolutePath = path.join(process.cwd(), 'public', relativePath)
    
    // Convert File to ArrayBuffer and then to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Write file to disk
    await writeFile(absolutePath, buffer)
    
    return NextResponse.json({ path: relativePath })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 }
    )
  }
} 