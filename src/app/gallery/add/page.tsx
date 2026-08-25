'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchGalleryPosts,
  saveGalleryPosts,
  type GalleryCategory,
  type GalleryCharacter,
  type GalleryImage,
  type GalleryPost,
  type GalleryTag,
  type GalleryThumbnailMode,
} from '@/lib/galleryData';
import {
  CropEditor,
  CropImg,
  type CropValue,
} from '@/components/ui/CropEditor';

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

const DEFAULT_CROP: CropValue = {
  x: 0,
  y: 0,
  scale: 1,
};

export default function AddIllustrationPage() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();

  const [date, setDate] = useState('');
  const [category, setCategory] =
    useState<GalleryCategory>('original');
  const [characters, setCharacters] =
    useState<GalleryCharacter[]>([]);
  const [tags, setTags] =
    useState<GalleryTag[]>([]);

  const [artistName, setArtistName] =
    useState('');
  const [snsId, setSnsId] =
    useState('');
  const [snsUrl, setSnsUrl] =
    useState('');

  const [images, setImages] =
    useState<File[]>([]);
  const [previewUrls, setPreviewUrls] =
    useState<string[]>([]);

  const [
    thumbnailMode,
    setThumbnailMode,
  ] =
    useState<GalleryThumbnailMode>(
      'post'
    );

  const [
    thumbnailIndex,
    setThumbnailIndex,
  ] =
    useState(0);

  const [
    thumbnailCrop,
    setThumbnailCrop,
  ] =
    useState<CropValue>(
      DEFAULT_CROP
    );

  const [
    customThumbnail,
    setCustomThumbnail,
  ] =
    useState<File | null>(null);

  const [
    customThumbnailUrl,
    setCustomThumbnailUrl,
  ] =
    useState<string | null>(null);

  const [
    cropOpen,
    setCropOpen,
  ] =
    useState(false);

  const [posting, setPosting] =
    useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState('');

  const [error, setError] =
    useState('');

  useEffect(() => {
    const urls = images.map(
      (image) =>
        URL.createObjectURL(image)
    );

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [images]);

  useEffect(() => {
    if (!customThumbnail) {
      setCustomThumbnailUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(
        customThumbnail
      );

    setCustomThumbnailUrl(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [customThumbnail]);

  useEffect(() => {
    if (
      thumbnailIndex >=
      images.length
    ) {
      setThumbnailIndex(0);
      setThumbnailCrop(
        DEFAULT_CROP
      );
    }
  }, [images.length, thumbnailIndex]);

  const thumbnailSrc =
    useMemo(() => {
      if (
        thumbnailMode ===
        'custom'
      ) {
        return customThumbnailUrl;
      }

      return (
        previewUrls[
          thumbnailIndex
        ] ?? null
      );
    }, [
      thumbnailMode,
      customThumbnailUrl,
      previewUrls,
      thumbnailIndex,
    ]);

  const changeCategory = (
    next: GalleryCategory
  ) => {
    setCategory(next);

    if (
      next === 'commission'
    ) {
      setTags([]);
    }
  };

  const toggleCharacter = (
    character: GalleryCharacter
  ) => {
    setCharacters((current) =>
      current.includes(character)
        ? current.filter(
            (item) =>
              item !== character
          )
        : [
            ...current,
            character,
          ]
    );
  };

  const toggleTag = (
    tag: GalleryTag
  ) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter(
            (item) =>
              item !== tag
          )
        : [...current, tag]
    );
  };

  const handleImageChange = (
    files: FileList | null
  ) => {
    if (!files) {
      setImages([]);
      return;
    }

    const selected =
      Array.from(files).filter(
        (file) =>
          file.type.startsWith(
            'image/'
          )
      );

    setImages(selected);
    setThumbnailIndex(0);
    setThumbnailCrop(
      DEFAULT_CROP
    );
    setError('');
  };

  const removeImage = (
    index: number
  ) => {
    setImages((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  };

  const uploadToCloudinary =
    async (
      file: File
    ): Promise<GalleryImage> => {
      const cloudName =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
          ?.trim();

      const uploadPreset =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
          ?.trim();

      if (
        !cloudName ||
        !uploadPreset
      ) {
        throw new Error(
          'Cloudinaryの設定が見つかりません。'
        );
      }

      const form =
        new FormData();

      form.append(
        'file',
        file
      );

      form.append(
        'upload_preset',
        uploadPreset
      );

      const response =
        await fetch(
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
        publicId:
          result.public_id,
      };
    };

  const handleSubmit =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      if (
        !isAdmin ||
        !user
      ) {
        setError(
          '管理者としてログインしてください。'
        );
        return;
      }

      if (
        images.length === 0
      ) {
        setError(
          '画像を1枚以上選択してください。'
        );
        return;
      }

      if (!date) {
        setError(
          '日付を選択してください。'
        );
        return;
      }

      if (
        category ===
          'commission' &&
        !artistName.trim()
      ) {
        setError(
          'COMMISSIONでは作者名を入力してください。'
        );
        return;
      }

      if (
        thumbnailMode ===
          'custom' &&
        !customThumbnail
      ) {
        setError(
          'サムネイル専用画像を選択してください。'
        );
        return;
      }

      if (posting) return;

      setPosting(true);
      setError('');
      setUploadProgress('');

      try {
        const uploadedImages:
          GalleryImage[] = [];

        for (
          let i = 0;
          i < images.length;
          i += 1
        ) {
          setUploadProgress(
            `画像をアップロード中... ${i + 1} / ${images.length}`
          );

          const uploaded =
            await uploadToCloudinary(
              images[i]
            );

          uploadedImages.push(
            uploaded
          );
        }

        let uploadedCustomThumbnail:
          GalleryImage | undefined;

        if (
          thumbnailMode ===
            'custom' &&
          customThumbnail
        ) {
          setUploadProgress(
            'サムネイル画像をアップロード中...'
          );

          uploadedCustomThumbnail =
            await uploadToCloudinary(
              customThumbnail
            );
        }

        setUploadProgress(
          '投稿情報を保存中...'
        );

        const previous =
          await fetchGalleryPosts();

        const newPost:
          GalleryPost = {
          id: crypto.randomUUID(),
          date,
          category,
          characters,
          tags:
            category ===
            'original'
              ? tags
              : [],
          images:
            uploadedImages,
          thumbnailMode,
          thumbnailIndex:
            thumbnailMode ===
            'post'
              ? thumbnailIndex
              : undefined,
          thumbnailCrop,
          customThumbnail:
            thumbnailMode ===
            'custom'
              ? uploadedCustomThumbnail
              : undefined,
          commission:
            category ===
            'commission'
              ? {
                  artistName:
                    artistName.trim(),
                  snsId:
                    snsId.trim() ||
                    undefined,
                  snsUrl:
                    snsUrl.trim() ||
                    undefined,
                }
              : undefined,
          authorId: user.id,
          visibility: 'public',
          createdAt:
            new Date().toISOString(),
        };

        await saveGalleryPosts(
          previous,
          [
            newPost,
            ...previous,
          ],
          user.id
        );

        router.push(
          '/gallery'
        );

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
    border:
      '1px solid rgba(255,255,255,.25)',
    background:
      'rgba(255,255,255,.08)',
    color: '#f5f5f5',
    boxSizing:
      'border-box' as const,
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
        <h1>
          ACCESS DENIED
        </h1>

        <p>
          このページは管理者のみ利用できます。
        </p>

        <button
          onClick={() =>
            router.push(
              '/gallery'
            )
          }
        >
          GALLERYへ戻る
        </button>
      </main>
    );
  }

  return (
    <>
      <main
        style={{
          maxWidth: '1040px',
          margin: '0 auto',
          padding:
            '56px 32px 80px',
          color: '#f5f5f5',
        }}
      >
        <h1
          style={{
            margin:
              '0 0 8px',
            fontSize: '32px',
            letterSpacing:
              '.08em',
          }}
        >
          ADD ILLUSTRATION
        </h1>

        <p
          style={{
            margin:
              '0 0 36px',
            color:
              'rgba(255,255,255,.6)',
            fontSize: '13px',
          }}
        >
          新しい作品をギャラリーに追加します。
        </p>

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(300px, 440px) 1fr',
            gap: '40px',
            alignItems:
              'start',
          }}
        >
          <section>
            <div
              style={{
                minHeight:
                  '360px',
                borderRadius:
                  '12px',
                border:
                  '1px solid rgba(255,255,255,.2)',
                background:
                  'rgba(255,255,255,.06)',
                padding: '14px',
              }}
            >
              {previewUrls.length >
              0 ? (
                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      previewUrls.length ===
                      1
                        ? '1fr'
                        : 'repeat(2, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  {previewUrls.map(
                    (
                      url,
                      index
                    ) => (
                      <div
                        key={`${url}-${index}`}
                        style={{
                          position:
                            'relative',
                          borderRadius:
                            '8px',
                          overflow:
                            'hidden',
                          background:
                            'rgba(0,0,0,.2)',
                          aspectRatio:
                            '1 / 1',
                        }}
                      >
                        <img
                          src={url}
                          alt={`preview ${index + 1}`}
                          style={{
                            width:
                              '100%',
                            height:
                              '100%',
                            objectFit:
                              'contain',
                            display:
                              'block',
                          }}
                        />

                        <span
                          style={{
                            position:
                              'absolute',
                            top: '8px',
                            left: '8px',
                            minWidth:
                              '26px',
                            height:
                              '26px',
                            padding:
                              '0 7px',
                            display:
                              'grid',
                            placeItems:
                              'center',
                            borderRadius:
                              '999px',
                            background:
                              'rgba(0,0,0,.7)',
                            color:
                              '#fff',
                            fontSize:
                              '11px',
                          }}
                        >
                          {index +
                            1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeImage(
                              index
                            )
                          }
                          style={{
                            position:
                              'absolute',
                            top: '8px',
                            right: '8px',
                            width:
                              '28px',
                            height:
                              '28px',
                            borderRadius:
                              '999px',
                            border:
                              '1px solid rgba(255,255,255,.35)',
                            background:
                              'rgba(0,0,0,.72)',
                            color:
                              '#fff',
                            cursor:
                              'pointer',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div
                  style={{
                    minHeight:
                      '330px',
                    display:
                      'grid',
                    placeItems:
                      'center',
                    color:
                      'rgba(255,255,255,.4)',
                    fontSize:
                      '12px',
                  }}
                >
                  IMAGE PREVIEW
                </div>
              )}
            </div>

            <label
              style={{
                ...fieldStyle,
                marginTop:
                  '14px',
              }}
            >
              <span>
                IMAGES
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  handleImageChange(
                    e.target.files
                  )
                }
                style={{
                  color:
                    '#f5f5f5',
                }}
              />

              {images.length >
                0 && (
                <div
                  style={{
                    display:
                      'grid',
                    gap: '4px',
                    color:
                      'rgba(255,255,255,.58)',
                    fontSize:
                      '12px',
                    lineHeight:
                      1.5,
                  }}
                >
                  {images.map(
                    (
                      file,
                      index
                    ) => (
                      <span
                        key={`${file.name}-${index}`}
                      >
                        {index +
                          1}
                        .{' '}
                        {
                          file.name
                        }
                      </span>
                    )
                  )}
                </div>
              )}
            </label>

            <fieldset
              style={{
                marginTop:
                  '24px',
                border:
                  '1px solid rgba(255,255,255,.18)',
                borderRadius:
                  '10px',
                padding: '18px',
              }}
            >
              <legend
                style={{
                  padding:
                    '0 8px',
                }}
              >
                THUMBNAIL
              </legend>

              <div
                style={{
                  display:
                    'flex',
                  gap: '20px',
                  flexWrap:
                    'wrap',
                  marginBottom:
                    '16px',
                }}
              >
                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="radio"
                    name="thumbnailMode"
                    checked={
                      thumbnailMode ===
                      'post'
                    }
                    onChange={() => {
                      setThumbnailMode(
                        'post'
                      );
                      setThumbnailCrop(
                        DEFAULT_CROP
                      );
                    }}
                  />
                  投稿画像から選ぶ
                </label>

                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="radio"
                    name="thumbnailMode"
                    checked={
                      thumbnailMode ===
                      'custom'
                    }
                    onChange={() => {
                      setThumbnailMode(
                        'custom'
                      );
                      setThumbnailCrop(
                        DEFAULT_CROP
                      );
                    }}
                  />
                  専用画像を使う
                </label>
              </div>

              {thumbnailMode ===
                'post' && (
                <>
                  {previewUrls.length >
                  0 ? (
                    <div
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(74px, 1fr))',
                        gap:
                          '10px',
                        marginBottom:
                          '14px',
                      }}
                    >
                      {previewUrls.map(
                        (
                          url,
                          index
                        ) => (
                          <button
                            key={`${url}-thumb-${index}`}
                            type="button"
                            onClick={() => {
                              setThumbnailIndex(
                                index
                              );
                              setThumbnailCrop(
                                DEFAULT_CROP
                              );
                            }}
                            style={{
                              border:
                                thumbnailIndex ===
                                index
                                  ? '2px solid #fff'
                                  : '1px solid rgba(255,255,255,.25)',
                              borderRadius:
                                '8px',
                              overflow:
                                'hidden',
                              padding:
                                0,
                              aspectRatio:
                                '1 / 1',
                              background:
                                'rgba(255,255,255,.05)',
                              cursor:
                                'pointer',
                            }}
                          >
                            <img
                              src={
                                url
                              }
                              alt={`${index + 1}枚目`}
                              style={{
                                width:
                                  '100%',
                                height:
                                  '100%',
                                objectFit:
                                  'cover',
                                display:
                                  'block',
                              }}
                            />
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <p
                      style={{
                        color:
                          'rgba(255,255,255,.5)',
                        fontSize:
                          '12px',
                      }}
                    >
                      先に投稿画像を選んでください。
                    </p>
                  )}
                </>
              )}

              {thumbnailMode ===
                'custom' && (
                <label
                  style={
                    fieldStyle
                  }
                >
                  <span>
                    サムネイル専用画像
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setCustomThumbnail(
                        e.target
                          .files?.[0] ??
                          null
                      );

                      setThumbnailCrop(
                        DEFAULT_CROP
                      );
                    }}
                    style={{
                      color:
                        '#f5f5f5',
                    }}
                  />
                </label>
              )}

              {thumbnailSrc && (
                <div
                  style={{
                    marginTop:
                      '16px',
                  }}
                >
                  <div
                    style={{
                      position:
                        'relative',
                      width:
                        'min(220px, 100%)',
                      aspectRatio:
                        '1 / 1',
                      overflow:
                        'hidden',
                      borderRadius:
                        '10px',
                      background:
                        'rgba(255,255,255,.08)',
                      border:
                        '1px solid rgba(255,255,255,.2)',
                      marginBottom:
                        '10px',
                    }}
                  >
                    <CropImg
                      src={
                        thumbnailSrc
                      }
                      crop={
                        thumbnailCrop
                      }
                      alt="thumbnail preview"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setCropOpen(
                        true
                      )
                    }
                  >
                    1:1サムネイルを調整
                  </button>
                </div>
              )}
            </fieldset>
          </section>

          <section
            style={{
              display: 'grid',
              gap: '26px',
            }}
          >
            <label
              style={
                fieldStyle
              }
            >
              <span>
                DATE
              </span>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target
                      .value
                  )
                }
                required
                style={{
                  ...inputStyle,
                  maxWidth:
                    '220px',
                }}
              />
            </label>

            <fieldset
              style={{
                border:
                  '1px solid rgba(255,255,255,.18)',
                borderRadius:
                  '10px',
                padding:
                  '18px',
              }}
            >
              <legend
                style={{
                  padding:
                    '0 8px',
                }}
              >
                CATEGORY
              </legend>

              <div
                style={{
                  display:
                    'flex',
                  gap: '24px',
                }}
              >
                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="radio"
                    checked={
                      category ===
                      'original'
                    }
                    onChange={() =>
                      changeCategory(
                        'original'
                      )
                    }
                  />
                  ORIGINAL
                </label>

                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="radio"
                    checked={
                      category ===
                      'commission'
                    }
                    onChange={() =>
                      changeCategory(
                        'commission'
                      )
                    }
                  />
                  COMMISSION
                </label>
              </div>
            </fieldset>

            <fieldset
              style={{
                border:
                  '1px solid rgba(255,255,255,.18)',
                borderRadius:
                  '10px',
                padding:
                  '18px',
              }}
            >
              <legend
                style={{
                  padding:
                    '0 8px',
                }}
              >
                CHARACTER
              </legend>

              <div
                style={{
                  display:
                    'flex',
                  flexWrap:
                    'wrap',
                  gap: '24px',
                }}
              >
                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="checkbox"
                    checked={characters.includes(
                      'shiki'
                    )}
                    onChange={() =>
                      toggleCharacter(
                        'shiki'
                      )
                    }
                  />
                  SHIKI
                </label>

                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="checkbox"
                    checked={characters.includes(
                      'solas'
                    )}
                    onChange={() =>
                      toggleCharacter(
                        'solas'
                      )
                    }
                  />
                  SOLAS
                </label>
              </div>
            </fieldset>

            {category ===
              'original' && (
              <fieldset
                style={{
                  border:
                    '1px solid rgba(255,255,255,.18)',
                  borderRadius:
                    '10px',
                  padding:
                    '18px',
                }}
              >
                <legend
                  style={{
                    padding:
                      '0 8px',
                  }}
                >
                  TAG
                </legend>

                <div
                  style={{
                    display:
                      'flex',
                    flexWrap:
                      'wrap',
                    gap:
                      '24px',
                  }}
                >
                  {[
                    [
                      'reference',
                      'REFERENCE',
                    ],
                    [
                      'song-parody',
                      'SONG PARODY',
                    ],
                    [
                      'manga',
                      'MANGA',
                    ],
                    [
                      'rakugaki',
                      'RAKUGAKI',
                    ],
                    [
                      'tachie',
                      'TACHIE',
                    ],
                  ].map(
                    ([
                      value,
                      label,
                    ]) => (
                      <label
                        key={
                          value
                        }
                        style={
                          choiceStyle
                        }
                      >
                        <input
                          type="checkbox"
                          checked={tags.includes(
                            value as GalleryTag
                          )}
                          onChange={() =>
                            toggleTag(
                              value as GalleryTag
                            )
                          }
                        />
                        {label}
                      </label>
                    )
                  )}
                </div>
              </fieldset>
            )}

            {category ===
              'commission' && (
              <fieldset
                style={{
                  border:
                    '1px solid rgba(255,255,255,.18)',
                  borderRadius:
                    '10px',
                  padding:
                    '18px',
                  display:
                    'grid',
                  gap: '16px',
                }}
              >
                <legend
                  style={{
                    padding:
                      '0 8px',
                  }}
                >
                  ARTIST
                </legend>

                <label
                  style={
                    fieldStyle
                  }
                >
                  <span>
                    AUTHOR NAME
                  </span>

                  <input
                    type="text"
                    value={
                      artistName
                    }
                    onChange={(e) =>
                      setArtistName(
                        e.target
                          .value
                      )
                    }
                    placeholder="作者名"
                    required
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label
                  style={
                    fieldStyle
                  }
                >
                  <span>
                    SNS ID
                  </span>

                  <input
                    type="text"
                    value={
                      snsId
                    }
                    onChange={(e) =>
                      setSnsId(
                        e.target
                          .value
                      )
                    }
                    placeholder="@example"
                    style={
                      inputStyle
                    }
                  />
                </label>

                <label
                  style={
                    fieldStyle
                  }
                >
                  <span>
                    SNS LINK
                  </span>

                  <input
                    type="url"
                    value={
                      snsUrl
                    }
                    onChange={(e) =>
                      setSnsUrl(
                        e.target
                          .value
                      )
                    }
                    placeholder="https://..."
                    style={
                      inputStyle
                    }
                  />
                </label>
              </fieldset>
            )}

            {uploadProgress && (
              <p>
                {
                  uploadProgress
                }
              </p>
            )}

            {error && (
              <p
                style={{
                  color:
                    '#ff8d8d',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={posting}
              style={{
                width: '100%',
                minHeight: '48px',
                marginTop: '6px',
                padding: '14px 20px',
                border: '1px solid rgba(255,255,255,.35)',
                borderRadius: '10px',
                background: '#f1f1f1',
                color: '#17191d',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '.08em',
                cursor: posting ? 'wait' : 'pointer',
                opacity: posting ? 0.65 : 1,
              }}
            >
              {posting
                ? 'UPLOADING...'
                : 'POST ILLUSTRATION'}
            </button>
          </section>
        </form>
      </main>

      {thumbnailSrc && (
        <CropEditor
          open={cropOpen}
          src={thumbnailSrc}
          aspect="1:1"
          initial={thumbnailCrop}
          onClose={() =>
            setCropOpen(false)
          }
          onApply={(crop) => {
            setThumbnailCrop(
              crop
            );
            setCropOpen(false);
          }}
        />
      )}
    </>
  );
}
