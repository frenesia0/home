'use client';

export type CloudinaryImageUpload = {
  url: string;
  publicId: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

const CACHE_KEY = 'ohome.cloudinary.imageHash.v2';

/**
 * 同じ画像をSAVE/再試行で何度もCloudinaryへ送らないためのキャッシュ。
 * - sent: 同一セッション内で進行中/完了済みPromiseを共有
 * - localStorage: ページ移動後も同じブラウザなら再アップロードを避ける
 */
const sent = new Map<string, Promise<CloudinaryImageUpload>>();

async function sha256(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

function readCache(): Record<string, CloudinaryImageUpload> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) as Record<string, CloudinaryImageUpload> : {};
  } catch {
    return {};
  }
}

function writeCache(hash: string, value: CloudinaryImageUpload) {
  if (typeof window === 'undefined') return;
  try {
    const current = readCache();
    current[hash] = value;

    // 無限に増えないように直近200件程度に制限
    const entries = Object.entries(current);
    const trimmed = entries.slice(Math.max(0, entries.length - 200));

    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(Object.fromEntries(trimmed))
    );
  } catch {
    // localStorageが使えなくてもアップロード自体は続行
  }
}


function removeCache(hash: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = readCache();
    delete current[hash];
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(current));
  } catch {
    // 失敗してもアップロード自体は続ける
  }
}

function tinyCloudinaryProbeUrl(url: string) {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/w_2,h_2,c_fill,q_auto,f_auto/');
}

async function cachedUploadStillExists(value: CloudinaryImageUpload) {
  try {
    const response = await fetch(tinyCloudinaryProbeUrl(value.url), {
      method: 'GET',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function uploadNew(file: File): Promise<CloudinaryImageUpload> {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();

  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinaryの設定が見つかりません。');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: form,
    }
  );

  const result =
    (await response.json()) as CloudinaryUploadResponse;

  if (
    !response.ok ||
    !result.secure_url ||
    !result.public_id
  ) {
    throw new Error(
      result.error?.message ||
        '画像のアップロードに失敗しました。'
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

/**
 * GalleryとCHARACTER共通のCloudinary画像アップロード。
 * 同一ファイルはハッシュで判定し、同じブラウザからの重複アップロードを防ぐ。
 */
export async function uploadImageToCloudinary(
  file: File
): Promise<CloudinaryImageUpload> {
  const hash = await sha256(file);

  if (!hash) {
    return uploadNew(file);
  }

  const cached = readCache()[hash];
  if (cached?.url && cached?.publicId) {
    if (await cachedUploadStillExists(cached)) {
      return cached;
    }
    // Cloudinary本体が既に消えている古いURLは再利用しない。
    removeCache(hash);
  }

  const inFlight = sent.get(hash);
  if (inFlight) {
    return inFlight;
  }

  const job = uploadNew(file)
    .then(result => {
      writeCache(hash, result);
      return result;
    })
    .catch(err => {
      sent.delete(hash);
      throw err;
    });

  sent.set(hash, job);
  return job;
}
