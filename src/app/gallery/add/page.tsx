'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  useAuth,
} from '@/lib/auth';

import {
  createGalleryWatermark,
  fetchGalleryPosts,
  getDefaultWatermarkOpacity,
  normalizeWatermarkText,
  saveGalleryPosts,
  type GalleryCategory,
  type GalleryCharacter,
  type GalleryImage,
  type GalleryPost,
  type GalleryTag,
  type GalleryThumbnailMode,
  type GalleryWatermark,
  type GalleryWatermarkColor,
} from '@/lib/galleryData';

import {
  CropEditor,
  CropImg,
  type CropValue,
} from '@/components/ui/CropEditor';

import {
  WatermarkedImage,
} from '@/components/gallery/WatermarkedImage';


/* =========================================================
   TYPES
========================================================= */

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;

  error?: {
    message?: string;
  };
};


/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_CROP: CropValue = {
  x: 0,
  y: 0,
  scale: 1,
};

const ORIGINAL_WATERMARK_ID =
  '@frenesia0';

const DEFAULT_GRID_SIZE =
  180;


/* =========================================================
   HELPERS
========================================================= */

function createGalleryId(
  date: string,
  existingPosts: GalleryPost[]
): string {
  const datePart =
    date.replaceAll('-', '');

  const used =
    new Set(
      existingPosts
        .map((post) => {
          const match =
            post.id.match(
              new RegExp(
                `^${datePart}-(\\d+)$`
              )
            );

          if (!match) {
            return null;
          }

          const number =
            Number(match[1]);

          return Number.isFinite(
            number
          )
            ? number
            : null;
        })
        .filter(
          (
            value
          ): value is number =>
            value !== null
        )
    );

  let nextNumber = 1;

  while (
    used.has(nextNumber)
  ) {
    nextNumber += 1;
  }

  return `${datePart}-${String(
    nextNumber
  ).padStart(2, '0')}`;
}


function clampOpacity(
  value: number
) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value)
    )
  );
}


function clampGridSize(
  value: number
) {
  return Math.min(
    500,
    Math.max(
      60,
      Math.round(
        value / 10
      ) * 10
    )
  );
}


function getAutomaticWatermarkText(
  category: GalleryCategory,
  snsId: string
) {
  if (
    category === 'commission'
  ) {
    return normalizeWatermarkText(
      snsId
    );
  }

  return ORIGINAL_WATERMARK_ID;
}


function makeWatermark(
  category: GalleryCategory,
  snsId: string
): GalleryWatermark {
  const watermark =
    createGalleryWatermark(
      'none',
      getAutomaticWatermarkText(
        category,
        snsId
      )
    );

  return {
    ...watermark,
    gridSize:
      DEFAULT_GRID_SIZE,
  };
}


/* =========================================================
   PAGE
========================================================= */

export default function AddIllustrationPage() {
  const router =
    useRouter();

  const {
    isAdmin,
    user,
  } = useAuth();


  /* =======================================================
     BASIC
  ======================================================= */

  const [
    date,
    setDate,
  ] =
    useState('');

  const [
    category,
    setCategory,
  ] =
    useState<GalleryCategory>(
      'original'
    );

  const [
    characters,
    setCharacters,
  ] =
    useState<
      GalleryCharacter[]
    >([]);

  const [
    tags,
    setTags,
  ] =
    useState<
      GalleryTag[]
    >([]);


  /* =======================================================
     SONG
  ======================================================= */

  const [
    songTitle,
    setSongTitle,
  ] =
    useState('');

  const [
    songUrl,
    setSongUrl,
  ] =
    useState('');

  const [
    songAudio,
    setSongAudio,
  ] =
    useState<File | null>(
      null
    );


  /* =======================================================
     COMMISSION
  ======================================================= */

  const [
    artistName,
    setArtistName,
  ] =
    useState('');

  const [
    snsId,
    setSnsId,
  ] =
    useState('');

  const [
    snsUrl,
    setSnsUrl,
  ] =
    useState('');


  /* =======================================================
     IMAGES
  ======================================================= */

  const [
    images,
    setImages,
  ] =
    useState<File[]>([]);

  const [
    previewUrls,
    setPreviewUrls,
  ] =
    useState<string[]>([]);

  /*
   * images[index]
   * watermarkSettings[index]
   *
   * が必ず対応する。
   */
  const [
    watermarkSettings,
    setWatermarkSettings,
  ] =
    useState<
      GalleryWatermark[]
    >([]);


  /* =======================================================
     THUMBNAIL
  ======================================================= */

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
    useState<File | null>(
      null
    );

  const [
    customThumbnailUrl,
    setCustomThumbnailUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    cropOpen,
    setCropOpen,
  ] =
    useState(false);


  /* =======================================================
     STATUS
  ======================================================= */

  const [
    posting,
    setPosting,
  ] =
    useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');


  /* =======================================================
     DERIVED
  ======================================================= */

  const isSongParody =
    category ===
      'original' &&
    tags.includes(
      'song-parody'
    );


  /* =======================================================
     IMAGE PREVIEW URLs
  ======================================================= */

  useEffect(() => {
    const urls =
      images.map(
        (image) =>
          URL.createObjectURL(
            image
          )
      );

    setPreviewUrls(
      urls
    );

    return () => {
      urls.forEach(
        (url) =>
          URL.revokeObjectURL(
            url
          )
      );
    };
  }, [
    images,
  ]);


  /* =======================================================
     CUSTOM THUMBNAIL URL
  ======================================================= */

  useEffect(() => {
    if (
      !customThumbnail
    ) {
      setCustomThumbnailUrl(
        null
      );

      return;
    }

    const url =
      URL.createObjectURL(
        customThumbnail
      );

    setCustomThumbnailUrl(
      url
    );

    return () =>
      URL.revokeObjectURL(
        url
      );
  }, [
    customThumbnail,
  ]);


  /* =======================================================
     THUMBNAIL INDEX SAFETY
  ======================================================= */

  useEffect(() => {
    if (
      thumbnailIndex >=
      images.length
    ) {
      setThumbnailIndex(
        0
      );

      setThumbnailCrop(
        DEFAULT_CROP
      );
    }
  }, [
    images.length,
    thumbnailIndex,
  ]);


  /* =======================================================
     SONG RESET
  ======================================================= */

  useEffect(() => {
    if (
      !isSongParody
    ) {
      setSongTitle('');
      setSongUrl('');
      setSongAudio(
        null
      );
    }
  }, [
    isSongParody,
  ]);


  /* =======================================================
     COMMISSION SNS ID AUTO SYNC
  ======================================================= */

  useEffect(() => {
    if (
      category !==
      'commission'
    ) {
      return;
    }

    const nextText =
      normalizeWatermarkText(
        snsId
      );

    setWatermarkSettings(
      (current) =>
        current.map(
          (watermark) => {
            /*
             * ORIGINALの初期値か空欄なら
             * 絵師さんIDへ自動変更。
             *
             * すでに手動で別IDへ変更した場合は
             * 勝手に上書きしない。
             */
            if (
              watermark.text ===
                ORIGINAL_WATERMARK_ID ||
              watermark.text ===
                '' ||
              watermark.text ===
                normalizeWatermarkText(
                  snsId
                )
            ) {
              return {
                ...watermark,
                text:
                  nextText,
              };
            }

            return watermark;
          }
        )
    );
  }, [
    category,
    snsId,
  ]);


  /* =======================================================
     THUMBNAIL SOURCE
  ======================================================= */

  const thumbnailSrc =
    useMemo(() => {
      if (
        thumbnailMode ===
        'custom'
      ) {
        return (
          customThumbnailUrl
        );
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


  /* =======================================================
     CATEGORY
  ======================================================= */

  const changeCategory = (
    next:
      GalleryCategory
  ) => {
    setCategory(
      next
    );

    if (
      next ===
      'commission'
    ) {
      setTags([]);
      setSongTitle('');
      setSongUrl('');
      setSongAudio(
        null
      );

      setWatermarkSettings(
        (current) =>
          current.map(
            (
              watermark
            ) => ({
              ...watermark,

              text:
                normalizeWatermarkText(
                  snsId
                ),
            })
          )
      );

      return;
    }

    /*
     * ORIGINALへ戻した場合
     */
    setWatermarkSettings(
      (current) =>
        current.map(
          (
            watermark
          ) => ({
            ...watermark,

            text:
              ORIGINAL_WATERMARK_ID,
          })
        )
    );
  };


  /* =======================================================
     CHARACTER
  ======================================================= */

  const toggleCharacter = (
    character:
      GalleryCharacter
  ) => {
    setCharacters(
      (current) =>
        current.includes(
          character
        )
          ? current.filter(
              (item) =>
                item !==
                character
            )
          : [
              ...current,
              character,
            ]
    );
  };


  /* =======================================================
     TAG
  ======================================================= */

  const toggleTag = (
    tag:
      GalleryTag
  ) => {
    setTags(
      (current) =>
        current.includes(
          tag
        )
          ? current.filter(
              (item) =>
                item !== tag
            )
          : [
              ...current,
              tag,
            ]
    );
  };


  /* =======================================================
     ADD IMAGES
  ======================================================= */

  const handleImageChange = (
    files:
      FileList | null
  ) => {
    if (!files) {
      return;
    }

    const selected =
      Array.from(
        files
      ).filter(
        (file) =>
          file.type.startsWith(
            'image/'
          )
      );

    if (
      selected.length ===
      0
    ) {
      return;
    }

    const wasEmpty =
      images.length ===
      0;

    setImages(
      (current) => [
        ...current,
        ...selected,
      ]
    );

    /*
     * 新規画像の数だけ
     * watermark設定も追加
     */
    setWatermarkSettings(
      (current) => [
        ...current,

        ...selected.map(
          () =>
            makeWatermark(
              category,
              snsId
            )
        ),
      ]
    );

    if (wasEmpty) {
      setThumbnailIndex(
        0
      );

      setThumbnailCrop(
        DEFAULT_CROP
      );
    }

    setError('');
  };


  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  const removeImage = (
    index:
      number
  ) => {
    setImages(
      (current) =>
        current.filter(
          (
            _,
            i
          ) =>
            i !==
            index
        )
    );

    setWatermarkSettings(
      (current) =>
        current.filter(
          (
            _,
            i
          ) =>
            i !==
            index
        )
    );

    setThumbnailIndex(
      (current) => {
        if (
          current ===
          index
        ) {
          return 0;
        }

        if (
          current >
          index
        ) {
          return (
            current - 1
          );
        }

        return current;
      }
    );

    setThumbnailCrop(
      DEFAULT_CROP
    );
  };


  /* =======================================================
     WATERMARK UPDATE
  ======================================================= */

  const updateWatermark = (
    index: number,
    patch:
      Partial<GalleryWatermark>
  ) => {
    setWatermarkSettings(
      (current) =>
        current.map(
          (
            watermark,
            i
          ) =>
            i === index
              ? {
                  ...watermark,
                  ...patch,
                }
              : watermark
        )
    );
  };


  /* =======================================================
     WATERMARK COLOR
  ======================================================= */

  const changeWatermarkColor = (
    index: number,
    color:
      GalleryWatermarkColor
  ) => {
    if (
      color === 'none'
    ) {
      updateWatermark(
        index,
        {
          color:
            'none',

          opacity:
            0,

          grid:
            false,
        }
      );

      return;
    }

    updateWatermark(
      index,
      {
        color,

        /*
         * WHITE → 25
         * BLACK → 5
         */
        opacity:
          getDefaultWatermarkOpacity(
            color
          ),

        grid:
          true,
      }
    );
  };


  /* =======================================================
     WATERMARK OPACITY
  ======================================================= */

  const changeWatermarkOpacity = (
    index: number,
    value: number
  ) => {
    updateWatermark(
      index,
      {
        opacity:
          clampOpacity(
            value
          ),
      }
    );
  };


  /* =======================================================
     GRID SIZE
  ======================================================= */

  const changeGridSize = (
    index: number,
    value: number
  ) => {
    updateWatermark(
      index,
      {
        gridSize:
          clampGridSize(
            value
          ),
      }
    );
  };


  /* =======================================================
     CLOUDINARY
  ======================================================= */

  const uploadToCloudinary =
    async (
      file:
        File
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
            method:
              'POST',

            body:
              form,
          }
        );

      const result =
        (await response.json()) as
          CloudinaryUploadResponse;

      if (
        !response.ok ||
        !result.secure_url ||
        !result.public_id
      ) {
        throw new Error(
          result.error
            ?.message ||
            '画像のアップロードに失敗しました。'
        );
      }

      return {
        url:
          result.secure_url,

        publicId:
          result.public_id,
      };
    };


  const uploadAudioToCloudinary =
    async (
      file:
        File
    ): Promise<string> => {
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
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          {
            method:
              'POST',

            body:
              form,
          }
        );

      const result =
        (await response.json()) as
          CloudinaryUploadResponse;

      if (
        !response.ok ||
        !result.secure_url
      ) {
        throw new Error(
          result.error
            ?.message ||
            'MP3のアップロードに失敗しました。'
        );
      }

      return result.secure_url;
    };


  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async (
      e:
        React.FormEvent<HTMLFormElement>
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
        images.length ===
        0
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

      if (
        posting
      ) {
        return;
      }

      setPosting(
        true
      );

      setError('');

      setUploadProgress(
        ''
      );

      try {
        const previous =
          await fetchGalleryPosts();

        const newId =
          createGalleryId(
            date,
            previous
          );

        const uploadedImages:
          GalleryImage[] =
            [];

        /*
         * 投稿画像を一枚ずつアップロード。
         *
         * ここで同じindexの
         * watermarkSettingsを合体させる。
         */
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

          const watermark =
            watermarkSettings[
              i
            ] ??
            makeWatermark(
              category,
              snsId
            );

          uploadedImages.push(
            {
              ...uploaded,

              watermark: {
                ...watermark,

                opacity:
                  clampOpacity(
                    watermark.opacity
                  ),

                gridSize:
                  clampGridSize(
                    watermark.gridSize ??
                      DEFAULT_GRID_SIZE
                  ),

                text:
                  normalizeWatermarkText(
                    watermark.text
                  ),
              },
            }
          );
        }


        /* ---------------------------------------------------
           SONG AUDIO
        --------------------------------------------------- */

        let uploadedSongAudioUrl:
          string | undefined;

        if (
          isSongParody &&
          songAudio
        ) {
          setUploadProgress(
            'MP3をアップロード中...'
          );

          uploadedSongAudioUrl =
            await uploadAudioToCloudinary(
              songAudio
            );
        }


        /* ---------------------------------------------------
           CUSTOM THUMBNAIL
        --------------------------------------------------- */

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


        /* ---------------------------------------------------
           POST
        --------------------------------------------------- */

        const newPost:
          GalleryPost = {
          id:
            newId,

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

          song:
            isSongParody &&
            (
              songTitle.trim() ||
              songUrl.trim() ||
              uploadedSongAudioUrl
            )
              ? ({
                  title:
                    songTitle.trim() ||
                    undefined,

                  url:
                    songUrl.trim() ||
                    undefined,

                  audioUrl:
                    uploadedSongAudioUrl,
                } as GalleryPost['song'])
              : undefined,

          authorId:
            user.id,

          visibility:
            'public',

          createdAt:
            new Date()
              .toISOString(),
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
          `/gallery/${newId}`
        );

        router.refresh();
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : '投稿に失敗しました。'
        );
      } finally {
        setPosting(
          false
        );

        setUploadProgress(
          ''
        );
      }
    };


  /* =======================================================
     COMMON STYLES
  ======================================================= */

  const fieldStyle = {
    display:
      'grid',

    gap:
      '8px',
  };


  const inputStyle = {
    width:
      '100%',

    padding:
      '12px 14px',

    borderRadius:
      '8px',

    border:
      '1px solid rgba(255,255,255,.25)',

    background:
      'rgba(255,255,255,.08)',

    color:
      '#f5f5f5',

    boxSizing:
      'border-box' as const,
  };


  const choiceStyle = {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      '7px',

    cursor:
      'pointer',
  };


  const fieldsetStyle = {
    border:
      '1px solid rgba(255,255,255,.18)',

    borderRadius:
      '10px',

    padding:
      '18px',
  };


  /* =======================================================
     ACCESS DENIED
  ======================================================= */

  if (
    !isAdmin
  ) {
    return (
      <main
        style={{
          maxWidth:
            '720px',

          margin:
            '0 auto',

          padding:
            '80px 32px',

          color:
            '#f5f5f5',

          textAlign:
            'center',
        }}
      >
        <h1>
          ACCESS DENIED
        </h1>

        <p>
          このページは管理者のみ利用できます。
        </p>

        <button
          type="button"
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


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <main
        className="gallery-add-page"
        style={{
          maxWidth:
            '1100px',

          margin:
            '0 auto',

          padding:
            '56px 32px 100px',

          color:
            '#f5f5f5',
        }}
      >

        {/* =================================================
            TITLE
        ================================================= */}

        <h1
          style={{
            margin:
              '0 0 8px',

            fontSize:
              '32px',

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

            fontSize:
              '13px',
          }}
        >
          新しい作品をギャラリーに追加します。
        </p>


        <form
          onSubmit={
            handleSubmit
          }
          className="gallery-add-form"
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'minmax(320px, 480px) 1fr',

            gap:
              '40px',

            alignItems:
              'start',
          }}
        >

          {/* =================================================
              LEFT
          ================================================= */}

          <section>

            {/* ===============================================
                IMAGE PREVIEW
            =============================================== */}

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

                padding:
                  '14px',
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

                    gap:
                      '10px',
                  }}
                >
                  {previewUrls.map(
                    (
                      url,
                      index
                    ) => {
                      const watermark =
                        watermarkSettings[
                          index
                        ] ??
                        makeWatermark(
                          category,
                          snsId
                        );

                      return (
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
                              'rgba(0,0,0,.22)',

                            aspectRatio:
                              '1 / 1',
                          }}
                        >
                          <WatermarkedImage
                            src={
                              url
                            }
                            alt={`preview ${index + 1}`}
                            watermark={
                              watermark
                            }
                            fit="contain"
                          />


                          {/* NUMBER */}

                          <span
                            style={{
                              position:
                                'absolute',

                              top:
                                '8px',

                              left:
                                '8px',

                              zIndex:
                                10,

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
                                'rgba(0,0,0,.72)',

                              color:
                                '#fff',

                              fontSize:
                                '11px',
                            }}
                          >
                            {index + 1}
                          </span>


                          {/* DELETE */}

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

                              top:
                                '8px',

                              right:
                                '8px',

                              zIndex:
                                10,

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
                      );
                    }
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


            {/* ===============================================
                IMAGE SELECT
            =============================================== */}

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
                onChange={(
                  e
                ) => {
                  handleImageChange(
                    e.target.files
                  );

                  e.currentTarget.value =
                    '';
                }}
                style={{
                  color:
                    '#f5f5f5',
                }}
              />
            </label>


            {/* ===============================================
                WATERMARK
            =============================================== */}

            {images.length >
              0 && (
              <fieldset
                style={{
                  ...fieldsetStyle,

                  marginTop:
                    '24px',

                  display:
                    'grid',

                  gap:
                    '20px',
                }}
              >
                <legend
                  style={{
                    padding:
                      '0 8px',

                    letterSpacing:
                      '.08em',
                  }}
                >
                  WATERMARK
                </legend>

                <p
                  style={{
                    margin:
                      0,

                    color:
                      'rgba(255,255,255,.48)',

                    fontSize:
                      '11px',

                    lineHeight:
                      1.7,
                  }}
                >
                  画像ごとに透かしを調整できます。
                  WHITEは25%、BLACKは5%が初期値です。
                </p>


                {images.map(
                  (
                    file,
                    index
                  ) => {
                    const watermark =
                      watermarkSettings[
                        index
                      ] ??
                      makeWatermark(
                        category,
                        snsId
                      );

                    const disabled =
                      watermark.color ===
                      'none';

                    const gridDisabled =
                      disabled ||
                      !watermark.grid;

                    return (
                      <div
                        key={`${file.name}-${index}-wm`}
                        style={{
                          padding:
                            '16px',

                          border:
                            '1px solid rgba(255,255,255,.14)',

                          borderRadius:
                            '10px',

                          background:
                            'rgba(255,255,255,.025)',

                          display:
                            'grid',

                          gap:
                            '18px',
                        }}
                      >

                        {/* IMAGE NAME */}

                        <div
                          style={{
                            display:
                              'flex',

                            justifyContent:
                              'space-between',

                            alignItems:
                              'center',

                            gap:
                              '12px',
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                '12px',

                              letterSpacing:
                                '.08em',
                            }}
                          >
                            IMAGE {index + 1}
                          </strong>

                          <span
                            title={
                              file.name
                            }
                            style={{
                              minWidth:
                                0,

                              maxWidth:
                                '220px',

                              overflow:
                                'hidden',

                              textOverflow:
                                'ellipsis',

                              whiteSpace:
                                'nowrap',

                              color:
                                'rgba(255,255,255,.4)',

                              fontSize:
                                '10px',
                            }}
                          >
                            {file.name}
                          </span>
                        </div>


                        {/* ===================================
                            COLOR
                        =================================== */}

                        <div
                          style={{
                            display:
                              'grid',

                            gap:
                              '8px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'rgba(255,255,255,.5)',

                              fontSize:
                                '10px',

                              letterSpacing:
                                '.12em',
                            }}
                          >
                            COLOR
                          </span>

                          <div
                            style={{
                              display:
                                'grid',

                              gridTemplateColumns:
                                'repeat(3, 1fr)',

                              gap:
                                '7px',
                            }}
                          >
                            {(
                              [
                                [
                                  'none',
                                  'NONE',
                                ],

                                [
                                  'white',
                                  'WHITE',
                                ],

                                [
                                  'black',
                                  'BLACK',
                                ],
                              ] as const
                            ).map(
                              ([
                                value,
                                label,
                              ]) => {
                                const active =
                                  watermark.color ===
                                  value;

                                return (
                                  <button
                                    type="button"
                                    key={
                                      value
                                    }
                                    onClick={() =>
                                      changeWatermarkColor(
                                        index,
                                        value
                                      )
                                    }
                                    style={{
                                      minHeight:
                                        '38px',

                                      borderRadius:
                                        '8px',

                                      border:
                                        active
                                          ? '1px solid rgba(255,255,255,.9)'
                                          : '1px solid rgba(255,255,255,.2)',

                                      background:
                                        active
                                          ? 'rgba(255,255,255,.14)'
                                          : 'rgba(255,255,255,.035)',

                                      color:
                                        '#f5f5f5',

                                      cursor:
                                        'pointer',

                                      fontSize:
                                        '11px',

                                      fontWeight:
                                        active
                                          ? 700
                                          : 500,

                                      letterSpacing:
                                        '.06em',
                                    }}
                                  >
                                    {label}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>


                        {/* ===================================
                            OPACITY
                        =================================== */}

                        <div
                          style={{
                            display:
                              'grid',

                            gap:
                              '9px',

                            opacity:
                              disabled
                                ? 0.35
                                : 1,
                          }}
                        >
                          <div
                            style={{
                              display:
                                'flex',

                              justifyContent:
                                'space-between',

                              alignItems:
                                'center',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  'rgba(255,255,255,.5)',

                                fontSize:
                                  '10px',

                                letterSpacing:
                                  '.12em',
                              }}
                            >
                              OPACITY
                            </span>

                            <strong
                              style={{
                                fontSize:
                                  '12px',
                              }}
                            >
                              {watermark.opacity}%
                            </strong>
                          </div>

                          <div
                            style={{
                              display:
                                'grid',

                              gridTemplateColumns:
                                '38px 1fr 38px',

                              gap:
                                '8px',

                              alignItems:
                                'center',
                            }}
                          >
                            <button
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                changeWatermarkOpacity(
                                  index,
                                  watermark.opacity -
                                    1
                                )
                              }
                              style={{
                                height:
                                  '36px',

                                borderRadius:
                                  '8px',

                                border:
                                  '1px solid rgba(255,255,255,.2)',

                                background:
                                  'rgba(255,255,255,.05)',

                                color:
                                  '#fff',

                                cursor:
                                  disabled
                                    ? 'default'
                                    : 'pointer',
                              }}
                            >
                              −
                            </button>


                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              disabled={
                                disabled
                              }
                              value={
                                watermark.opacity
                              }
                              onChange={(
                                e
                              ) =>
                                changeWatermarkOpacity(
                                  index,
                                  Number(
                                    e.target.value
                                  )
                                )
                              }
                              style={{
                                width:
                                  '100%',
                              }}
                            />


                            <button
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                changeWatermarkOpacity(
                                  index,
                                  watermark.opacity +
                                    1
                                )
                              }
                              style={{
                                height:
                                  '36px',

                                borderRadius:
                                  '8px',

                                border:
                                  '1px solid rgba(255,255,255,.2)',

                                background:
                                  'rgba(255,255,255,.05)',

                                color:
                                  '#fff',

                                cursor:
                                  disabled
                                    ? 'default'
                                    : 'pointer',
                              }}
                            >
                              ＋
                            </button>
                          </div>
                        </div>


                        {/* ===================================
                            GRID SIZE
                        =================================== */}

                        <div
                          style={{
                            display:
                              'grid',

                            gap:
                              '9px',

                            opacity:
                              gridDisabled
                                ? 0.35
                                : 1,
                          }}
                        >
                          <div
                            style={{
                              display:
                                'flex',

                              justifyContent:
                                'space-between',

                              alignItems:
                                'center',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  'rgba(255,255,255,.5)',

                                fontSize:
                                  '10px',

                                letterSpacing:
                                  '.12em',
                              }}
                            >
                              GRID SIZE
                            </span>

                            <strong
                              style={{
                                fontSize:
                                  '12px',
                              }}
                            >
                              {watermark.gridSize ??
                                DEFAULT_GRID_SIZE}
                            </strong>
                          </div>


                          <div
                            style={{
                              display:
                                'grid',

                              gridTemplateColumns:
                                '38px 1fr 38px',

                              gap:
                                '8px',

                              alignItems:
                                'center',
                            }}
                          >
                            <button
                              type="button"
                              disabled={
                                gridDisabled
                              }
                              onClick={() =>
                                changeGridSize(
                                  index,
                                  (
                                    watermark.gridSize ??
                                    DEFAULT_GRID_SIZE
                                  ) - 10
                                )
                              }
                              style={{
                                height:
                                  '36px',

                                borderRadius:
                                  '8px',

                                border:
                                  '1px solid rgba(255,255,255,.2)',

                                background:
                                  'rgba(255,255,255,.05)',

                                color:
                                  '#fff',

                                cursor:
                                  gridDisabled
                                    ? 'default'
                                    : 'pointer',
                              }}
                            >
                              −
                            </button>


                            <input
                              type="range"
                              min="60"
                              max="500"
                              step="10"
                              disabled={
                                gridDisabled
                              }
                              value={
                                watermark.gridSize ??
                                DEFAULT_GRID_SIZE
                              }
                              onChange={(
                                e
                              ) =>
                                changeGridSize(
                                  index,
                                  Number(
                                    e.target.value
                                  )
                                )
                              }
                              style={{
                                width:
                                  '100%',
                              }}
                            />


                            <button
                              type="button"
                              disabled={
                                gridDisabled
                              }
                              onClick={() =>
                                changeGridSize(
                                  index,
                                  (
                                    watermark.gridSize ??
                                    DEFAULT_GRID_SIZE
                                  ) + 10
                                )
                              }
                              style={{
                                height:
                                  '36px',

                                borderRadius:
                                  '8px',

                                border:
                                  '1px solid rgba(255,255,255,.2)',

                                background:
                                  'rgba(255,255,255,.05)',

                                color:
                                  '#fff',

                                cursor:
                                  gridDisabled
                                    ? 'default'
                                    : 'pointer',
                              }}
                            >
                              ＋
                            </button>
                          </div>

                          <span
                            style={{
                              color:
                                'rgba(255,255,255,.36)',

                              fontSize:
                                '9px',

                              lineHeight:
                                1.5,
                            }}
                          >
                            小さいほど格子が細かく、大きいほど格子が大きくなります。
                          </span>
                        </div>


                        {/* ===================================
                            ID
                        =================================== */}

                        <label
                          style={{
                            display:
                              'grid',

                            gap:
                              '8px',

                            opacity:
                              disabled
                                ? 0.35
                                : 1,
                          }}
                        >
                          <span
                            style={{
                              color:
                                'rgba(255,255,255,.5)',

                              fontSize:
                                '10px',

                              letterSpacing:
                                '.12em',
                            }}
                          >
                            ID
                          </span>

                          <input
                            type="text"
                            disabled={
                              disabled
                            }
                            value={
                              watermark.text
                            }
                            onChange={(
                              e
                            ) =>
                              updateWatermark(
                                index,
                                {
                                  text:
                                    e.target.value,
                                }
                              )
                            }
                            onBlur={() =>
                              updateWatermark(
                                index,
                                {
                                  text:
                                    normalizeWatermarkText(
                                      watermark.text
                                    ),
                                }
                              )
                            }
                            placeholder={
                              category ===
                              'commission'
                                ? '@artist'
                                : ORIGINAL_WATERMARK_ID
                            }
                            style={
                              inputStyle
                            }
                          />
                        </label>


                        {/* ===================================
                            DIAGONAL GRID
                        =================================== */}

                        <label
                          style={{
                            display:
                              'flex',

                            alignItems:
                              'center',

                            justifyContent:
                              'space-between',

                            gap:
                              '12px',

                            opacity:
                              disabled
                                ? 0.35
                                : 1,
                          }}
                        >
                          <span
                            style={{
                              display:
                                'grid',

                              gap:
                                '3px',
                            }}
                          >
                            <strong
                              style={{
                                fontSize:
                                  '11px',

                                letterSpacing:
                                  '.08em',
                              }}
                            >
                              DIAGONAL GRID
                            </strong>

                            <span
                              style={{
                                color:
                                  'rgba(255,255,255,.4)',

                                fontSize:
                                  '10px',
                              }}
                            >
                              大きな斜め格子を画像全体に表示
                            </span>
                          </span>

                          <input
                            type="checkbox"
                            disabled={
                              disabled
                            }
                            checked={
                              watermark.grid
                            }
                            onChange={(
                              e
                            ) =>
                              updateWatermark(
                                index,
                                {
                                  grid:
                                    e.target.checked,
                                }
                              )
                            }
                          />
                        </label>
                      </div>
                    );
                  }
                )}
              </fieldset>
            )}


            {/* ===============================================
                THUMBNAIL
            =============================================== */}

            <fieldset
              style={{
                ...fieldsetStyle,

                marginTop:
                  '24px',
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

                  gap:
                    '20px',

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


              {/* POST THUMBNAIL */}

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


              {/* CUSTOM THUMBNAIL */}

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
                    onChange={(
                      e
                    ) => {
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


              {/* THUMBNAIL CROP PREVIEW */}

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


          {/* =================================================
              RIGHT
          ================================================= */}

          <section
            style={{
              display:
                'grid',

              gap:
                '26px',
            }}
          >

            {/* ===============================================
                DATE
            =============================================== */}

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
                value={
                  date
                }
                onChange={(
                  e
                ) =>
                  setDate(
                    e.target.value
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


            {/* ===============================================
                CATEGORY
            =============================================== */}

            <fieldset
              style={
                fieldsetStyle
              }
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

                  gap:
                    '24px',

                  flexWrap:
                    'wrap',
                }}
              >
                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="radio"
                    name="gallery-category"
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
                    name="gallery-category"
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


            {/* ===============================================
                CHARACTER
            =============================================== */}

            <fieldset
              style={
                fieldsetStyle
              }
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

                  gap:
                    '24px',
                }}
              >
                <label
                  style={
                    choiceStyle
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      characters.includes(
                        'shiki'
                      )
                    }
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
                    checked={
                      characters.includes(
                        'solas'
                      )
                    }
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


            {/* ===============================================
                ORIGINAL
            =============================================== */}

            {category ===
              'original' && (
              <>
                <fieldset
                  style={
                    fieldsetStyle
                  }
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
                    {(
                      [
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
                      ] as const
                    ).map(
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
                            checked={
                              tags.includes(
                                value
                              )
                            }
                            onChange={() =>
                              toggleTag(
                                value
                              )
                            }
                          />

                          {label}
                        </label>
                      )
                    )}
                  </div>
                </fieldset>


                {/* SONG */}

                {isSongParody && (
                  <fieldset
                    style={{
                      ...fieldsetStyle,

                      display:
                        'grid',

                      gap:
                        '16px',
                    }}
                  >
                    <legend
                      style={{
                        padding:
                          '0 8px',
                      }}
                    >
                      SONG
                    </legend>

                    <p
                      style={{
                        margin:
                          '-2px 0 2px',

                        color:
                          'rgba(255,255,255,.5)',

                        fontSize:
                          '11px',

                        lineHeight:
                          1.6,
                      }}
                    >
                      曲名・リンクはどちらも任意です。
                    </p>

                    <label
                      style={
                        fieldStyle
                      }
                    >
                      <span>
                        SONG TITLE
                      </span>

                      <input
                        type="text"
                        value={
                          songTitle
                        }
                        onChange={(
                          e
                        ) =>
                          setSongTitle(
                            e.target.value
                          )
                        }
                        placeholder="曲名"
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
                        SONG LINK
                      </span>

                      <input
                        type="url"
                        value={
                          songUrl
                        }
                        onChange={(
                          e
                        ) =>
                          setSongUrl(
                            e.target.value
                          )
                        }
                        placeholder="https://..."
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
                        MP3
                      </span>

                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        onChange={(
                          e
                        ) => {
                          const file =
                            e.target
                              .files?.[0] ??
                            null;

                          if (
                            file &&
                            file.type &&
                            file.type !==
                              'audio/mpeg'
                          ) {
                            setSongAudio(
                              null
                            );

                            setError(
                              'MP3ファイルを選択してください。'
                            );

                            e.currentTarget.value =
                              '';

                            return;
                          }

                          setSongAudio(
                            file
                          );

                          setError('');
                        }}
                        style={{
                          color:
                            '#f5f5f5',
                        }}
                      />

                      {songAudio && (
                        <span
                          style={{
                            color:
                              'rgba(255,255,255,.5)',

                            fontSize:
                              '10px',

                            lineHeight:
                              1.5,
                          }}
                        >
                          選択中: {
                            songAudio.name
                          }
                        </span>
                      )}
                    </label>
                  </fieldset>
                )}
              </>
            )}


            {/* ===============================================
                COMMISSION
            =============================================== */}

            {category ===
              'commission' && (
              <fieldset
                style={{
                  ...fieldsetStyle,

                  display:
                    'grid',

                  gap:
                    '16px',
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
                    onChange={(
                      e
                    ) =>
                      setArtistName(
                        e.target.value
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
                    onChange={(
                      e
                    ) =>
                      setSnsId(
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      setSnsId(
                        normalizeWatermarkText(
                          snsId
                        )
                      )
                    }
                    placeholder="@example"
                    style={
                      inputStyle
                    }
                  />

                  <span
                    style={{
                      color:
                        'rgba(255,255,255,.4)',

                      fontSize:
                        '10px',

                      lineHeight:
                        1.5,
                    }}
                  >
                    新しく追加した画像の透かしIDにも自動で使用します。
                  </span>
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
                    onChange={(
                      e
                    ) =>
                      setSnsUrl(
                        e.target.value
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


            {/* ===============================================
                STATUS
            =============================================== */}

            {uploadProgress && (
              <p
                style={{
                  margin:
                    0,

                  color:
                    'rgba(255,255,255,.7)',
                }}
              >
                {uploadProgress}
              </p>
            )}


            {error && (
              <p
                style={{
                  margin:
                    0,

                  color:
                    '#ff8d8d',
                }}
              >
                {error}
              </p>
            )}


            {/* ===============================================
                SUBMIT
            =============================================== */}

            <button
              type="submit"
              disabled={
                posting
              }
              style={{
                width:
                  '100%',

                minHeight:
                  '48px',

                marginTop:
                  '6px',

                padding:
                  '14px 20px',

                border:
                  '1px solid rgba(255,255,255,.35)',

                borderRadius:
                  '10px',

                background:
                  '#f1f1f1',

                color:
                  '#17191d',

                fontSize:
                  '13px',

                fontWeight:
                  700,

                letterSpacing:
                  '.08em',

                cursor:
                  posting
                    ? 'wait'
                    : 'pointer',

                opacity:
                  posting
                    ? 0.65
                    : 1,
              }}
            >
              {posting
                ? 'UPLOADING...'
                : 'POST ILLUSTRATION'}
            </button>
          </section>
        </form>
      </main>


      {/* =====================================================
          CROP EDITOR
      ===================================================== */}

      {thumbnailSrc && (
        <CropEditor
          open={
            cropOpen
          }
          src={
            thumbnailSrc
          }
          aspect="1:1"
          initial={
            thumbnailCrop
          }
          onClose={() =>
            setCropOpen(
              false
            )
          }
          onApply={(
            crop
          ) => {
            setThumbnailCrop(
              crop
            );

            setCropOpen(
              false
            );
          }}
        />
      )}


      {/* =====================================================
          RESPONSIVE
      ===================================================== */}

      <style jsx>{`
        @media (
          max-width: 760px
        ) {
          .gallery-add-page {
            padding:
              36px 18px
              calc(
                150px +
                env(
                  safe-area-inset-bottom
                )
              )
              !important;
          }

          .gallery-add-form {
            grid-template-columns:
              1fr !important;

            gap:
              28px !important;
          }
        }
      `}</style>
    </>
  );
}
