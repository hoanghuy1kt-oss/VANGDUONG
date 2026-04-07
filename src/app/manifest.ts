import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hệ Thống Quản Lý Tài Chính',
    short_name: 'HT Tài Chính',
    description: 'Nền tảng chuẩn hóa Quản lý Tài chính, dòng tiền Dự án.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
