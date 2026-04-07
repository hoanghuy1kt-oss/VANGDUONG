'use client';
import { useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function InitAdmin() {
  const [pwd, setPwd] = useState('');
  const email = 'hoanghuy1kt@gmail.com';

  const doInit = async () => {
    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();
      if (!auth || !db) return alert('No db');
      
      const cred = await signInWithEmailAndPassword(auth, email, pwd);
      
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: email,
        name: 'Hoàng Huy',
        displayName: 'Hoàng Huy',
        role: 'admin',
        assignedProjects: [],
        active: true,
        joinDate: new Date().toLocaleDateString('vi-VN'),
        mustChangePwd: false
      });
      alert('Liên kết quyền Siêu Admin thành công! Giờ Sếp có thể ra /login để vào hệ thống.');
    } catch(e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="flex flex-col items-center p-20 gap-4">
      <h1 className="text-xl font-bold">Khắc Phục Quyền Mất Kết Nối Firebase</h1>
      <p>Kích hoạt Database cho: {email}</p>
      <input 
        type="password" 
        className="border p-2 rounded" 
        placeholder="Nhập Password Của Sếp" 
        value={pwd} 
        onChange={e => setPwd(e.target.value)} 
      />
      <button onClick={doInit} className="p-4 bg-emerald-600 text-white font-bold rounded">
        LIÊN KẾT DATABASE & CẤP QUYỀN
      </button>
    </div>
  );
}
