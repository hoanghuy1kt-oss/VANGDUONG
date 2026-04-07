import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let adminApp: admin.app.App;

export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  let serviceAccount;

  if (serviceAccountEnv) {
    try {
      serviceAccount = JSON.parse(serviceAccountEnv);
    } catch (e) {
      console.error('Lỗi khi parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Vui lòng kiểm tra lại cấu trúc JSON.');
      throw e;
    }
  } else {
    throw new Error('❌ Lỗi: Không tìm thấy nội dung Service Account trong biến môi trường FIREBASE_ADMIN_SERVICE_ACCOUNT.');
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hethongquanly-ffdbd.appspot.com'
  });

  return adminApp;
}
