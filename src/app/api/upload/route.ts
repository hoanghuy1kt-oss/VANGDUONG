import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export const maxDuration = 60; // Max execution time

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectCode = formData.get('projectCode') as string || 'CHUNG';

    if (!file) {
      return NextResponse.json({ error: 'Không có file nào được upload' }, { status: 400 });
    }

    const adminApp = getFirebaseAdmin();
    const bucket = adminApp.storage().bucket();

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Tạo cấu trúc thư mục: HETHONG_CHUNGTU/MaDuAn/TenFile
    const fileName = `HETHONG_CHUNGTU/${projectCode}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const storageFile = bucket.file(fileName);

    // Upload file
    await storageFile.save(buffer, {
      metadata: { 
        contentType: file.type || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000'
      }
    });

    // Tạo Public URL an toàn (hoạt động tốt với default bucket của Firebase Storage)
    // Thường bucket mặc định có dạng: tên-dự-án.appspot.com
    const bucketName = bucket.name;
    const downloadToken = Math.random().toString(36).substring(2, 15);
    
    // Set metadata token Firebase Storage (Tạo link ẩn danh public download gốc của Firebase)
    await storageFile.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileId: fileName,
      name: file.name
    });

  } catch (error: any) {
    console.error('Lỗi upload Firebase Storage:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
