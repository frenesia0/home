'use client';

import React from 'react';
import { useUploading } from '@/lib/blobStore';

export function UploadBusy() {
  const n = useUploading();

  if (n <= 0) return null;

  return (
    <div
      className="up-busy"
      role="status"
      aria-live="polite"
    >
      <span className="up-spin" />

      画像をアップロード中
      {n > 1 ? `（${n}枚）` : ''}
      {' '}— しばらくお待ちください
    </div>
  );
}
