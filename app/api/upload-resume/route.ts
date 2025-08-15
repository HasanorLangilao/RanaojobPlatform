import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('resume') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        // Determine the upload directory based on file type
        let uploadDir;
        if (file.type.startsWith('image/')) {
            uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
        } else {
            uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resume');
        }

        // Ensure the directory exists
        await mkdir(uploadDir, { recursive: true });

        const uniqueFileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        const fileUrl = `/uploads/${file.type.startsWith('image/') ? 'images' : 'resume'}/${uniqueFileName}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        return NextResponse.json({ filePath: fileUrl }, { status: 200 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
    }
} 