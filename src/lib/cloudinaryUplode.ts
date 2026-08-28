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

/**
 * Galleryで実績のある unsigned upload preset を使って
 * Cloudinaryへ画像をアップロードする共通関数。
 */
export async function uploadImageToCloudinary(
  file: File
): Promise<CloudinaryImageUpload> {
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
