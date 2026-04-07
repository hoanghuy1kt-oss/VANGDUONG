import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const adminApp = getFirebaseAdmin();
    const data = await req.json();
    const { email, displayName, role, assignedProjects } = data;

    if (!email || !displayName) {
      return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
    }

    // 1. Tạo Firebase Auth User bằng Admin SDK với mk mặc định
    const authRecord = await adminApp.auth().createUser({
      email,
      password: '123456',
      displayName
    });

    // 2. Ghi thông tin User này xuống bảng users trong Firestore để lưu role & projects
    const firestore = adminApp.firestore();
    const newUserDoc = {
      uid: authRecord.uid,
      email,
      name: displayName,
      displayName,
      role: role || 'user',
      assignedProjects: assignedProjects || [],
      active: true,
      joinDate: new Date().toLocaleDateString('vi-VN'),
      mustChangePwd: false,
      createdAt: new Date()
    };

    // Firebase Auth user creation succeed, link to Firestore using UID as Document ID!
    // Using DocID = UID makes lookup vastly faster.
    await firestore.collection('users').doc(authRecord.uid).set(newUserDoc);

    return NextResponse.json({ success: true, user: { ...newUserDoc, id: authRecord.uid } });
  } catch (err: any) {
    console.error("API Create User Error:", err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminApp = getFirebaseAdmin();
    const data = await req.json();
    const { action, docId, uid: reqUid } = data;
    const uid = reqUid || docId || data.uid; // fallback for legacy code

    if (!docId && !uid) {
      return NextResponse.json({ error: 'Missing UID or DocID' }, { status: 400 });
    }

    if (action === 'reset_password') {
      // Ép đổi mật khẩu về 123456
      try {
        await adminApp.auth().updateUser(uid, {
          password: '123456'
        });
      } catch (e: any) {
        if (e.code !== 'auth/user-not-found') throw e;
        console.warn('User not found in Auth, skipping auth password reset', uid);
      }

      // Không còn ép đổi mật khẩu nữa, nên để false
      const firestore = adminApp.firestore();
      await firestore.collection('users').doc(docId || uid).update({
        mustChangePwd: false
      });

      return NextResponse.json({ success: true, message: 'Password reset' });
    }

    if (action === 'update_profile') {
      const { displayName, role, assignedProjects, active } = data;
      
      const updates: any = {};
      if (displayName !== undefined) updates.name = displayName;
      if (displayName !== undefined) updates.displayName = displayName;
      if (role !== undefined) updates.role = role;
      if (assignedProjects !== undefined) updates.assignedProjects = assignedProjects;
      if (active !== undefined) updates.active = active;

      if (Object.keys(updates).length > 0) {
        const firestore = adminApp.firestore();
        await firestore.collection('users').doc(docId || uid).update(updates);
      }
      
      // Sync displayName with Auth if needed
      if (displayName !== undefined || active !== undefined) {
         try {
           const authUpdates: any = {};
           if (displayName !== undefined) authUpdates.displayName = displayName;
           if (active !== undefined) authUpdates.disabled = !active;
           await adminApp.auth().updateUser(uid, authUpdates);
         } catch (e) {
           console.warn('Failed to sync auth data', e);
         }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    console.error("API Update User Error:", err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminApp = getFirebaseAdmin();
    const data = await req.json();
    const { docId, uid: reqUid } = data;
    const uid = reqUid || docId || data.uid; // fallback logic

    if (!docId && !uid) {
      return NextResponse.json({ error: 'Missing UID or DocID' }, { status: 400 });
    }

    // Xóa từ Firebase Auth
    try {
      if (uid) {
        await adminApp.auth().deleteUser(uid);
      }
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
      console.warn("User not found in Auth during delete, proceeding to delete Firestore document:", uid);
    }

    // Xóa từ Database Firestore
    const firestore = adminApp.firestore();
    const targetDocId = docId || uid;
    if (targetDocId) {
      await firestore.collection('users').doc(targetDocId).delete();
    }

    return NextResponse.json({ success: true, message: 'Đã xóa vĩnh viễn tài khoản' });
  } catch (err: any) {
    console.error("API Delete User Error:", err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
