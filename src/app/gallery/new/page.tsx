'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  saveGalleryPosts,
  type GalleryCategory,
  type GalleryCharacterTag,
  type GalleryImage,
  type GalleryPost,
} from '@/lib/galleryData';

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

export default function NewIllustrationPage() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();

  const [date, setDate] = useState('');
  const [category, setCategory] = useState<GalleryCategory>('original');
  const [tags, setTags] = useState<GalleryCharacterTag[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const toggleTag = (tag: GalleryCharacterTag) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  };

  const handleImageChange = (files: FileList | null) => {
    if (!files) {
      setImages([]);
      return;
    }

    const selected = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    setImages(selected);
    setError('');
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (file: File): Promise<GalleryImage> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
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

    const result = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok || !result.secure_url || !result.public_id) {
      throw new Error(
        result.error?.message || '画像のアップロードに失敗しました。'
      );
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAdmin || !user) {
      setError('管理者としてログインしてください。');
      return;
    }

    if (images.length === 0) {
      setError('画像を1枚以上選択してください。');
      return;
    }

    if (!date) {
      setError('日付を選択してください。');
      return;
    }

    if (posting) return;

    setPosting(true);
    setError('');
    setUploadProgress('');

    try {
      const uploadedImages: GalleryImage[] = [];

      // 一度に大量送信せず、順番にアップロードする
      for (let i = 0; i < images.length; i += 1) {
        setUploadProgress(
          `画像をアップロード中... ${i + 1} / ${images.length}`
        );

        const uploaded = await uploadToCloudinary(images[i]);
        uploadedImages.push(uploaded);
      }

      setUploadProgress('投稿情報を保存中...');

      const previous = await fetchGalleryPosts();

      const newPost: GalleryPost = {
        id: crypto.randomUUID(),
        date,
        category,
        tags,
        images: uploadedImages,
        authorId: user.id,
        visibility: 'public',
        createdAt: new Date().toISOString(),
      };

      await saveGalleryPosts(
        previous,
        [newPost, ...previous],
        user.id
      );

      router.push('/gallery');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '投稿に失敗しました。'
      );
    } finally {
      setPosting(false);
      setUploadProgress('');
    }
  };

  const fieldStyle = {
    display: 'grid',
    gap: '8px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,.25)',
    background: 'rgba(255,255,255,.08)',
    color: '#f5f5f5',
    boxSizing: 'border-box' as const,
  };

  const choiceStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    cursor: 'pointer',
  };

  if (!isAdmin) {
    return (
      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '80px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            marginBottom: '12px',
            fontSize: '28px',
            letterSpacing: '.08em',
          }}
        >
          ACCESS DENIED
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,.6)',
            marginBottom: '28px',
          }}
        >
          このページは管理者のみ利用できます。
        </p>

        <button
          onClick={() => router.push('/gallery')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,.25)',
            background: '#f1f1f1',
            color: '#17191d',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          GALLERYへ戻る
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '56px 32px 80px',
        color: '#f5f5f5',
      }}
    >
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '32px',
          letterSpacing: '.08em',
        }}
      >
        ADD ILLUSTRATION
      </h1>

      <p
        style={{
          margin: '0 0 36px',
          color: 'rgba(255,255,255,.6)',
          fontSize: '13px',
        }}
      >
        新しい作品をギャラリーに追加します。
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 440px) 1fr',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        <section>
          <div
            style={{
              minHeight: '360px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.06)',
              padding: '14px',
            }}
          >
            {previewUrls.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    previewUrls.length === 1
                      ? '1fr'
                      : 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                {previewUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: 'rgba(0,0,0,.2)',
                      aspectRatio: '1 / 1',
                    }}
                  >
                    <img
                      src={url}
                      alt={`preview ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />

                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        minWidth: '26px',
                        height: '26px',
                        padding: '0 7px',
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '999px',
                        background: 'rgba(0,0,0,.7)',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    >
                      {index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={`${index + 1}枚目を削除`}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,.35)',
                        background: 'rgba(0,0,0,.72)',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  minHeight: '330px',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'rgba(255,255,255,.4)',
                  fontSize: '12px',
                }}
              >
                IMAGE PREVIEW
              </div>
            )}
          </div>

          <label
            style={{
              ...fieldStyle,
              marginTop: '14px',
            }}
          >
            <span>IMAGES</span>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageChange(e.target.files)}
              style={{ color: '#f5f5f5' }}
            />

            <small
              style={{
                color: 'rgba(255,255,255,.5)',
                lineHeight: 1.6,
              }}
            >
              複数枚選択できます。左上の番号が表示順です。
            </small>
          </label>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '26px',
          }}
        >
          <label style={fieldStyle}>
            <span>DATE</span>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                ...inputStyle,
                maxWidth: '220px',
              }}
            />
          </label>

          <fieldset
            style={{
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <legend style={{ padding: '0 8px' }}>
              CATEGORY
            </legend>

            <div
              style={{
                display: 'flex',
                gap: '24px',
              }}
            >
              <label style={choiceStyle}>
                <input
                  type="radio"
                  name="category"
                  checked={category === 'original'}
                  onChange={() => setCategory('original')}
                />
                ORIGINAL
              </label>

              <label style={choiceStyle}>
                <input
                  type="radio"
                  name="category"
                  checked={category === 'commission'}
                  onChange={() => setCategory('commission')}
                />
                COMMISSION
              </label>
            </div>
          </fieldset>

          <fieldset
            style={{
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <legend style={{ padding: '0 8px' }}>
              TAGS
            </legend>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
              }}
            >
              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('shiki')}
                  onChange={() => toggleTag('shiki')}
                />
                SHIKI
              </label>

              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('solas')}
                  onChange={() => toggleTag('solas')}
                />
                SOLAS
              </label>

              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('reference')}
                  onChange={() => toggleTag('reference')}
                />
                REFERENCE
              </label>

              <label style={choiceStyle}>
                <input
                  type="checkbox"
                  checked={tags.includes('song-inspired')}
                  onChange={() => toggleTag('song-inspired')}
                />
                SONG INSPIRED
              </label>
            </div>
          </fieldset>

          {uploadProgress && (
            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,.72)',
                fontSize: '13px',
              }}
            >
              {uploadProgress}
            </p>
          )}

          {error && (
            <p
              style={{
                margin: 0,
                color: '#ff8d8d',
                fontSize: '13px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={posting}
            style={{
              marginTop: '6px',
              padding: '13px 20px',
              border: '1px solid rgba(255,255,255,.35)',
              borderRadius: '9px',
              background: '#f1f1f1',
              color: '#17191d',
              fontWeight: 700,
              cursor: posting ? 'wait' : 'pointer',
              opacity: posting ? 0.65 : 1,
            }}
          >
            {posting ? 'UPLOADING...' : 'POST'}
          </button>
        </section>
      </form>
    </main>
  );
}
