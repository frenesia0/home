'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useParams,
  useRouter,
} from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';
import {
  fetchGalleryPosts,
  getGalleryCharacters,
  createGalleryWatermark,
  getDefaultWatermarkOpacity,
  getGalleryImages,
  getGallerySong,
  normalizeGalleryWatermark,
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
import { WatermarkedImage } from '@/components/gallery/WatermarkedImage';

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

type SongWithAudio = {
  title?: string;
  url?: string;
  audioUrl?: string;
};

type ThumbChoice =
  | { kind: 'existing'; index: number }
  | { kind: 'new'; index: number };

const DEFAULT_CROP: CropValue = {
  x: 0,
  y: 0,
  scale: 1,
};


const ORIGINAL_WATERMARK_ID = '@frenesia0';
const DEFAULT_GRID_SIZE = 180;

function clampOpacity(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampGridSize(value: number) {
  return Math.min(500, Math.max(60, Math.round(value / 10) * 10));
}

function defaultWatermarkFor(
  category: GalleryCategory,
  snsId: string
): GalleryWatermark {
  const text =
    category === 'commission'
      ? normalizeWatermarkText(snsId)
      : ORIGINAL_WATERMARK_ID;

  return {
    ...createGalleryWatermark('white', text),
    gridSize: DEFAULT_GRID_SIZE,
  };
}

function watermarkForExisting(
  image: GalleryImage,
  category: GalleryCategory,
  snsId: string
): GalleryWatermark {
  if (image.watermark) {
    return normalizeGalleryWatermark(image.watermark);
  }
  return defaultWatermarkFor(category, snsId);
}

export default function EditIllustrationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();

  const id =
    typeof params?.id === 'string'
      ? decodeURIComponent(params.id)
      : '';

  const [originalPosts, setOriginalPosts] =
    useState<GalleryPost[]>([]);
  const [post, setPost] =
    useState<GalleryPost | null>(null);

  const [date, setDate] = useState('');
  const [category, setCategory] =
    useState<GalleryCategory>('original');
  const [characters, setCharacters] =
    useState<GalleryCharacter[]>([]);
  const [tags, setTags] =
    useState<GalleryTag[]>([]);

  const [artistName, setArtistName] = useState('');
  const [snsId, setSnsId] = useState('');
  const [snsUrl, setSnsUrl] = useState('');

  const [songTitle, setSongTitle] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [songAudioUrl, setSongAudioUrl] = useState('');
  const [newAudioFile, setNewAudioFile] =
    useState<File | null>(null);
  const [removeAudio, setRemoveAudio] =
    useState(false);

  const [existingImages, setExistingImages] =
    useState<GalleryImage[]>([]);
  const [newImages, setNewImages] =
    useState<File[]>([]);
  const [newImageUrls, setNewImageUrls] =
    useState<string[]>([]);
  const [newImageWatermarks, setNewImageWatermarks] =
    useState<GalleryWatermark[]>([]);

  const [thumbnailMode, setThumbnailMode] =
    useState<GalleryThumbnailMode>('post');
  const [thumbnailCrop, setThumbnailCrop] =
    useState<CropValue>(DEFAULT_CROP);
  const [thumbChoice, setThumbChoice] =
    useState<ThumbChoice>({
      kind: 'existing',
      index: 0,
    });

  const [existingCustomThumbnail, setExistingCustomThumbnail] =
    useState<GalleryImage | null>(null);
  const [newCustomThumbnail, setNewCustomThumbnail] =
    useState<File | null>(null);
  const [newCustomThumbnailUrl, setNewCustomThumbnailUrl] =
    useState<string | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [removedImagePublicIds, setRemovedImagePublicIds] =
    useState<string[]>([]);

  const isSongParody =
    category === 'original' &&
    tags.includes('song-parody');

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const posts =
          await fetchGalleryPosts();

        const found =
          posts.find(
            (item) => item.id === id
          ) ?? null;

        if (!alive) return;

        setOriginalPosts(posts);
        setPost(found);

        if (!found) {
          setLoading(false);
          return;
        }

        setDate(found.date);
        setCategory(found.category);
        setCharacters(
          getGalleryCharacters(found)
        );
        setTags(
          found.category === 'original'
            ? (
                Array.isArray(found.tags)
                  ? found.tags
                  : []
              )
            : []
        );

        setArtistName(
          found.commission?.artistName ?? ''
        );
        setSnsId(
          found.commission?.snsId ?? ''
        );
        setSnsUrl(
          found.commission?.snsUrl ?? ''
        );

        const song =
          (
            found.song ??
            getGallerySong(found)
          ) as SongWithAudio | null;

        setSongTitle(
          song?.title ?? ''
        );
        setSongUrl(
          song?.url ?? ''
        );
        setSongAudioUrl(
          song?.audioUrl ?? ''
        );

        const imgs =
          getGalleryImages(found);

        setExistingImages(
          imgs.map((image) => ({
            ...image,
            watermark: watermarkForExisting(
              image,
              found.category,
              found.commission?.snsId ?? ''
            ),
          }))
        );

        setThumbnailMode(
          found.thumbnailMode ??
            'post'
        );

        setThumbnailCrop(
          found.thumbnailCrop ??
            DEFAULT_CROP
        );

        const thumbIndex =
          typeof found.thumbnailIndex ===
          'number'
            ? found.thumbnailIndex
            : 0;

        setThumbChoice({
          kind: 'existing',
          index:
            thumbIndex >= 0 &&
            thumbIndex < imgs.length
              ? thumbIndex
              : 0,
        });

        setExistingCustomThumbnail(
          found.customThumbnail ??
            null
        );
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : '作品を読み込めませんでした。'
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const urls = newImages.map(
      (file) =>
        URL.createObjectURL(file)
    );

    setNewImageUrls(urls);

    return () => {
      urls.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [newImages]);

  useEffect(() => {
    if (!newCustomThumbnail) {
      setNewCustomThumbnailUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(
        newCustomThumbnail
      );

    setNewCustomThumbnailUrl(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [newCustomThumbnail]);

  useEffect(() => {
    if (!isSongParody) {
      setSongTitle('');
      setSongUrl('');
      setNewAudioFile(null);
      setRemoveAudio(true);
    }
  }, [isSongParody]);

  const thumbnailSrc =
    useMemo(() => {
      if (
        thumbnailMode ===
        'custom'
      ) {
        return (
          newCustomThumbnailUrl ??
          existingCustomThumbnail?.url ??
          null
        );
      }

      if (
        thumbChoice.kind ===
        'existing'
      ) {
        return (
          existingImages[
            thumbChoice.index
          ]?.url ?? null
        );
      }

      return (
        newImageUrls[
          thumbChoice.index
        ] ?? null
      );
    }, [
      thumbnailMode,
      newCustomThumbnailUrl,
      existingCustomThumbnail,
      thumbChoice,
      existingImages,
      newImageUrls,
    ]);

  const totalImagesCount =
    existingImages.length +
    newImages.length;

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
        : [
            ...current,
            tag,
          ]
    );
  };

  const changeCategory = (
    next: GalleryCategory
  ) => {
    setCategory(next);

    if (
      next === 'commission'
    ) {
      setTags([]);
      setSongTitle('');
      setSongUrl('');
      setNewAudioFile(null);
      setRemoveAudio(true);
    }
  };

  const addImageFiles = (
    files: FileList | null
  ) => {
    if (!files) return;

    const selected =
      Array.from(files).filter(
        (file) =>
          file.type.startsWith(
            'image/'
          )
      );

    if (
      selected.length === 0
    ) {
      return;
    }

    setNewImages((current) => [
      ...current,
      ...selected,
    ]);

    setNewImageWatermarks((current) => [
      ...current,
      ...selected.map(() =>
        defaultWatermarkFor(category, snsId)
      ),
    ]);

    setError('');
  };

  const deleteCloudinaryImages = async (
    publicIds: string[]
  ) => {
    const uniqueIds = Array.from(
      new Set(
        publicIds
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

    if (uniqueIds.length === 0) return;

    const be = backend();
    const token = await be?.getIdToken?.();

    if (!token) {
      throw new Error(
        '削除用のログイン認証を取得できませんでした。いったんログインし直してください。'
      );
    }

    const response = await fetch(
      '/api/cloudinary/delete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          publicIds: uniqueIds,
        }),
      }
    );

    const result = (await response.json()) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        result.error ||
          'Cloudinary画像の削除に失敗しました。'
      );
    }
  };

  const removeExistingImage = (
    index: number
  ) => {
    const removing = existingImages[index];

    if (removing?.publicId) {
      setRemovedImagePublicIds((current) =>
        current.includes(removing.publicId)
          ? current
          : [...current, removing.publicId]
      );
    }

    const next =
      existingImages.filter(
        (_, i) => i !== index
      );

    setExistingImages(next);
    setThumbnailCrop(
      DEFAULT_CROP
    );

    if (
      thumbChoice.kind ===
      'existing'
    ) {
      if (
        next.length > 0
      ) {
        setThumbChoice({
          kind: 'existing',
          index: 0,
        });
      } else if (
        newImages.length > 0
      ) {
        setThumbChoice({
          kind: 'new',
          index: 0,
        });
      }
    }
  };

  const removeNewImage = (
    index: number
  ) => {
    const next =
      newImages.filter(
        (_, i) => i !== index
      );

    setNewImages(next);
    setNewImageWatermarks((current) =>
      current.filter((_, i) => i !== index)
    );
    setThumbnailCrop(
      DEFAULT_CROP
    );

    if (
      thumbChoice.kind ===
      'new'
    ) {
      if (
        existingImages.length > 0
      ) {
        setThumbChoice({
          kind: 'existing',
          index: 0,
        });
      } else if (
        next.length > 0
      ) {
        setThumbChoice({
          kind: 'new',
          index: 0,
        });
      }
    }
  };

  const updateExistingWatermark = (
    index: number,
    patch: Partial<GalleryWatermark>
  ) => {
    setExistingImages((current) =>
      current.map((image, i) =>
        i === index
          ? {
              ...image,
              watermark: {
                ...watermarkForExisting(image, category, snsId),
                ...patch,
              },
            }
          : image
      )
    );
  };

  const updateNewWatermark = (
    index: number,
    patch: Partial<GalleryWatermark>
  ) => {
    setNewImageWatermarks((current) =>
      current.map((watermark, i) =>
        i === index
          ? { ...watermark, ...patch }
          : watermark
      )
    );
  };

  const changeWatermarkColor = (
    kind: 'existing' | 'new',
    index: number,
    color: GalleryWatermarkColor
  ) => {
    const patch: Partial<GalleryWatermark> =
      color === 'none'
        ? { color: 'none', opacity: 0, grid: false }
        : {
            color,
            opacity: getDefaultWatermarkOpacity(color),
            grid: true,
          };

    if (kind === 'existing') {
      updateExistingWatermark(index, patch);
    } else {
      updateNewWatermark(index, patch);
    }
  };

  const updateWatermark = (
    kind: 'existing' | 'new',
    index: number,
    patch: Partial<GalleryWatermark>
  ) => {
    if (kind === 'existing') {
      updateExistingWatermark(index, patch);
    } else {
      updateNewWatermark(index, patch);
    }
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

  const uploadAudioToFirebase =
    async (
      file: File
    ): Promise<string> => {
      const be = backend();

      if (!be) {
        throw new Error(
          'Firebase Storageへ接続できません。'
        );
      }

      const ext =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'mp3';

      return await be.uploadFile(
        file,
        ext
      );
    };

  const handleDeletePost = async () => {
    if (
      !isAdmin ||
      !user ||
      !post ||
      deleting ||
      saving
    ) {
      return;
    }

    const confirmed = window.confirm(
      'この作品を完全に削除しますか？\n\n投稿画像・専用サムネイル・登録済み音源も削除され、元に戻せません。'
    );

    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setProgress('作品を削除しています...');

    try {
      const imagePublicIds = getGalleryImages(post)
        .map((image) => image.publicId)
        .filter(Boolean);

      if (post.customThumbnail?.publicId) {
        imagePublicIds.push(
          post.customThumbnail.publicId
        );
      }

      const oldAudio =
        (
          post.song as
            | SongWithAudio
            | undefined
        )?.audioUrl ?? '';

      // 先に外部ファイルを削除。失敗したら投稿データは残して再試行できるようにする。
      await deleteCloudinaryImages(
        imagePublicIds
      );

      if (oldAudio) {
        const be = backend();
        if (!be) {
          throw new Error(
            'Firebase Storageへ接続できません。'
          );
        }

        await be.deleteFile(oldAudio);
      }

      const nextPosts = originalPosts.filter(
        (item) => item.id !== post.id
      );

      await saveGalleryPosts(
        originalPosts,
        nextPosts,
        user.id
      );

      router.push('/gallery');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '作品の削除に失敗しました。'
      );
    } finally {
      setDeleting(false);
      setProgress('');
    }
  };

  const handleSave =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !isAdmin ||
        !user ||
        !post
      ) {
        setError(
          '管理者としてログインしてください。'
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
        totalImagesCount === 0
      ) {
        setError(
          '画像を1枚以上残してください。'
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
        !newCustomThumbnail &&
        !existingCustomThumbnail
      ) {
        setError(
          'サムネイル専用画像を選択してください。'
        );
        return;
      }

      if (
        newAudioFile &&
        newAudioFile.type &&
        !newAudioFile.type.startsWith(
          'audio/'
        )
      ) {
        setError(
          '音声ファイルを選択してください。'
        );
        return;
      }

      if (saving) return;

      setSaving(true);
      setProgress('');
      setError('');

      let newlyUploadedAudio = '';
      const newlyUploadedCloudinaryIds: string[] = [];
      let saveCompleted = false;

      try {
        const uploadedNewImages:
          GalleryImage[] = [];

        for (
          let i = 0;
          i < newImages.length;
          i += 1
        ) {
          setProgress(
            `追加画像をアップロード中... ${i + 1} / ${newImages.length}`
          );

          const uploaded =
            await uploadToCloudinary(
              newImages[i]
            );

          const watermark = normalizeGalleryWatermark(
            newImageWatermarks[i] ??
              defaultWatermarkFor(category, snsId)
          );

          uploadedNewImages.push({
            ...uploaded,
            watermark: {
              ...watermark,
              opacity: clampOpacity(watermark.opacity),
              gridSize: clampGridSize(watermark.gridSize),
              text: normalizeWatermarkText(watermark.text),
            },
          });
          newlyUploadedCloudinaryIds.push(
            uploaded.publicId
          );
        }

        const finalImages = [
          ...existingImages.map((image) => ({
            ...image,
            watermark: normalizeGalleryWatermark(image.watermark),
          })),
          ...uploadedNewImages,
        ];

        let finalThumbnailIndex:
          number | undefined;

        if (
          thumbnailMode ===
          'post'
        ) {
          if (
            thumbChoice.kind ===
            'existing'
          ) {
            finalThumbnailIndex =
              thumbChoice.index;
          } else {
            finalThumbnailIndex =
              existingImages.length +
              thumbChoice.index;
          }

          if (
            finalThumbnailIndex < 0 ||
            finalThumbnailIndex >=
              finalImages.length
          ) {
            finalThumbnailIndex = 0;
          }
        }

        let finalCustomThumbnail =
          existingCustomThumbnail ??
          undefined;

        if (
          thumbnailMode ===
            'custom' &&
          newCustomThumbnail
        ) {
          setProgress(
            'サムネイル画像をアップロード中...'
          );

          finalCustomThumbnail =
            await uploadToCloudinary(
              newCustomThumbnail
            );

          newlyUploadedCloudinaryIds.push(
            finalCustomThumbnail.publicId
          );
        }

        let finalAudioUrl =
          removeAudio
            ? ''
            : songAudioUrl;

        if (
          isSongParody &&
          newAudioFile
        ) {
          setProgress(
            'MP3をアップロード中...'
          );

          newlyUploadedAudio =
            await uploadAudioToFirebase(
              newAudioFile
            );

          finalAudioUrl =
            newlyUploadedAudio;
        }

        setProgress(
          '変更を保存中...'
        );

        const songValue:
          SongWithAudio | undefined =
          isSongParody &&
          (
            songTitle.trim() ||
            songUrl.trim() ||
            finalAudioUrl
          )
            ? {
                title:
                  songTitle.trim() ||
                  undefined,
                url:
                  songUrl.trim() ||
                  undefined,
                audioUrl:
                  finalAudioUrl ||
                  undefined,
              }
            : undefined;

        const updatedPost:
          GalleryPost = {
          ...post,
          date,
          category,
          characters,
          tags:
            category ===
            'original'
              ? tags
              : [],
          images:
            finalImages,
          imageUrl:
            undefined,
          cloudinaryPublicId:
            undefined,
          thumbnailMode,
          thumbnailIndex:
            thumbnailMode ===
            'post'
              ? finalThumbnailIndex
              : undefined,
          thumbnailCrop,
          customThumbnail:
            thumbnailMode ===
            'custom'
              ? finalCustomThumbnail
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
            songValue as GalleryPost['song'],
        };

        const nextPosts =
          originalPosts.map(
            (item) =>
              item.id === post.id
                ? updatedPost
                : item
          );

        await saveGalleryPosts(
          originalPosts,
          nextPosts,
          user.id
        );

        saveCompleted = true;

        const oldCustomThumbnailId =
          post.customThumbnail?.publicId ?? '';

        const customThumbnailWasRemovedOrReplaced =
          !!oldCustomThumbnailId &&
          (
            thumbnailMode !== 'custom' ||
            !!newCustomThumbnail
          );

        const cloudinaryIdsToDelete = [
          ...removedImagePublicIds,
          ...(customThumbnailWasRemovedOrReplaced
            ? [oldCustomThumbnailId]
            : []),
        ];

        if (cloudinaryIdsToDelete.length > 0) {
          setProgress(
            '使わなくなった画像を削除中...'
          );

          await deleteCloudinaryImages(
            cloudinaryIdsToDelete
          );
        }

        const oldAudio =
          (
            post.song as
              | SongWithAudio
              | undefined
          )?.audioUrl ?? '';

        const shouldDeleteOldAudio =
          !!oldAudio &&
          (
            removeAudio ||
            (
              newlyUploadedAudio &&
              newlyUploadedAudio !== oldAudio
            )
          );

        if (
          shouldDeleteOldAudio
        ) {
          try {
            const be =
              backend();

            if (be) {
              await be.deleteFile(
                oldAudio
              );
            }
          } catch {
            // 保存自体は成功しているため、
            // 古い音声の削除失敗だけで編集を失敗扱いにしない。
          }
        }

        router.push(
          `/gallery/${encodeURIComponent(
            post.id
          )}`
        );

        router.refresh();
      } catch (err) {
        if (!saveCompleted) {
          if (
            newlyUploadedCloudinaryIds.length > 0
          ) {
            try {
              await deleteCloudinaryImages(
                newlyUploadedCloudinaryIds
              );
            } catch {
              // 保存失敗時の後始末失敗は、元のエラー表示を優先する。
            }
          }

          if (newlyUploadedAudio) {
            try {
              const be = backend();
              if (be) {
                await be.deleteFile(
                  newlyUploadedAudio
                );
              }
            } catch {
              // 同上。
            }
          }
        }

        setError(
          err instanceof Error
            ? err.message
            : '保存に失敗しました。'
        );
      } finally {
        setSaving(false);
        setProgress('');
      }
    };


  const renderWatermarkEditor = (
    kind: 'existing' | 'new',
    index: number,
    label: string,
    watermark: GalleryWatermark
  ) => {
    const disabled = watermark.color === 'none';
    const gridDisabled = disabled || !watermark.grid;

    return (
      <div
        key={`${kind}-${index}-watermark`}
        style={{
          padding: '16px',
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: '10px',
          background: 'rgba(255,255,255,.025)',
          display: 'grid',
          gap: '18px',
        }}
      >
        <strong style={{ fontSize: '12px', letterSpacing: '.08em' }}>
          {label}
        </strong>

        <div style={{ display: 'grid', gap: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '10px', letterSpacing: '.12em' }}>
            COLOR
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
            {([
              ['white', 'WHITE'],
              ['black', 'BLACK'],
              ['none', 'NONE'],
            ] as const).map(([value, text]) => {
              const active = watermark.color === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => changeWatermarkColor(kind, index, value)}
                  style={{
                    minHeight: '38px',
                    borderRadius: '8px',
                    border: active
                      ? '1px solid rgba(255,255,255,.9)'
                      : '1px solid rgba(255,255,255,.2)',
                    background: active
                      ? 'rgba(255,255,255,.14)'
                      : 'rgba(255,255,255,.035)',
                    color: '#f5f5f5',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '9px', opacity: disabled ? 0.35 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '10px', letterSpacing: '.12em' }}>
              OPACITY
            </span>
            <strong style={{ fontSize: '12px' }}>{watermark.opacity}%</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 38px', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => updateWatermark(kind, index, { opacity: clampOpacity(watermark.opacity - 1) })}
              style={{ height: '36px' }}
            >−</button>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              disabled={disabled}
              value={watermark.opacity}
              onChange={(e) => updateWatermark(kind, index, { opacity: clampOpacity(Number(e.target.value)) })}
              style={{ width: '100%' }}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => updateWatermark(kind, index, { opacity: clampOpacity(watermark.opacity + 1) })}
              style={{ height: '36px' }}
            >＋</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '9px', opacity: gridDisabled ? 0.35 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '10px', letterSpacing: '.12em' }}>
              GRID SIZE
            </span>
            <strong style={{ fontSize: '12px' }}>{watermark.gridSize}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 38px', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={gridDisabled}
              onClick={() => updateWatermark(kind, index, { gridSize: clampGridSize(watermark.gridSize - 10) })}
              style={{ height: '36px' }}
            >−</button>
            <input
              type="range"
              min="60"
              max="500"
              step="10"
              disabled={gridDisabled}
              value={watermark.gridSize}
              onChange={(e) => updateWatermark(kind, index, { gridSize: clampGridSize(Number(e.target.value)) })}
              style={{ width: '100%' }}
            />
            <button
              type="button"
              disabled={gridDisabled}
              onClick={() => updateWatermark(kind, index, { gridSize: clampGridSize(watermark.gridSize + 10) })}
              style={{ height: '36px' }}
            >＋</button>
          </div>
        </div>

        <label style={{ display: 'grid', gap: '8px', opacity: disabled ? 0.35 : 1 }}>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '10px', letterSpacing: '.12em' }}>
            ID
          </span>
          <input
            type="text"
            disabled={disabled}
            value={watermark.text}
            onChange={(e) => updateWatermark(kind, index, { text: e.target.value })}
            onBlur={() => updateWatermark(kind, index, { text: normalizeWatermarkText(watermark.text) })}
            placeholder={category === 'commission' ? '@artist' : ORIGINAL_WATERMARK_ID}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', opacity: disabled ? 0.35 : 1 }}>
          <span style={{ display: 'grid', gap: '3px' }}>
            <strong style={{ fontSize: '11px', letterSpacing: '.08em' }}>
              DIAGONAL GRID
            </strong>
            <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '10px' }}>
              大きな斜め格子を画像全体に表示
            </span>
          </span>
          <input
            type="checkbox"
            disabled={disabled}
            checked={watermark.grid}
            onChange={(e) => updateWatermark(kind, index, { grid: e.target.checked })}
          />
        </label>
      </div>
    );
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

  if (loading) {
    return (
      <main
        style={{
          padding: '80px 32px',
          color: '#f5f5f5',
          textAlign: 'center',
        }}
      >
        LOADING...
      </main>
    );
  }

  if (
    !isAdmin ||
    !user
  ) {
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

  if (!post) {
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
          NOT FOUND
        </h1>

        <p>
          編集する作品が見つかりませんでした。
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

  return (
    <>
      <main
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding:
            '48px 32px 80px',
          color: '#f5f5f5',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '18px',
            marginBottom:
              '30px',
          }}
        >
          <div>
            <h1
              style={{
                margin:
                  '0 0 7px',
                fontSize: '30px',
                letterSpacing:
                  '.08em',
              }}
            >
              EDIT ILLUSTRATION
            </h1>

            <p
              style={{
                margin: 0,
                fontSize:
                  '12px',
                color:
                  'rgba(255,255,255,.5)',
              }}
            >
              {post.id}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/gallery/${encodeURIComponent(
                  post.id
                )}`
              )
            }
            style={{
              padding:
                '9px 13px',
              borderRadius:
                '8px',
              border:
                '1px solid rgba(255,255,255,.18)',
              background:
                'rgba(255,255,255,.07)',
              color:
                '#f5f5f5',
              cursor:
                'pointer',
            }}
          >
            ← CANCEL
          </button>
        </div>

        <form
          onSubmit={
            handleSave
          }
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(320px, 460px) 1fr',
            gap: '42px',
            alignItems:
              'start',
          }}
        >
          <section>
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
                IMAGES
              </legend>

              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                {existingImages.map(
                  (
                    image,
                    index
                  ) => (
                    <div
                      key={
                        image.publicId
                      }
                      style={{
                        position:
                          'relative',
                        aspectRatio:
                          '1 / 1',
                        borderRadius:
                          '8px',
                        overflow:
                          'hidden',
                        background:
                          'rgba(0,0,0,.2)',
                      }}
                    >
                      <WatermarkedImage
                        src={image.url}
                        alt={`existing ${index + 1}`}
                        watermark={watermarkForExisting(
                          image,
                          category,
                          snsId
                        )}
                        fit="contain"
                      />

                      <span
                        style={{
                          position:
                            'absolute',
                          left: '8px',
                          top: '8px',
                          padding:
                            '5px 8px',
                          borderRadius:
                            '999px',
                          background:
                            'rgba(0,0,0,.7)',
                          fontSize:
                            '10px',
                        }}
                      >
                        {index +
                          1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeExistingImage(
                            index
                          )
                        }
                        style={{
                          position:
                            'absolute',
                          right: '8px',
                          top: '8px',
                          width:
                            '28px',
                          height:
                            '28px',
                          borderRadius:
                            '999px',
                          border:
                            '1px solid rgba(255,255,255,.28)',
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

                {newImageUrls.map(
                  (
                    url,
                    index
                  ) => (
                    <div
                      key={`${url}-${index}`}
                      style={{
                        position:
                          'relative',
                        aspectRatio:
                          '1 / 1',
                        borderRadius:
                          '8px',
                        overflow:
                          'hidden',
                        background:
                          'rgba(0,0,0,.2)',
                      }}
                    >
                      <WatermarkedImage
                        src={url}
                        alt={`new ${index + 1}`}
                        watermark={
                          newImageWatermarks[index] ??
                          defaultWatermarkFor(category, snsId)
                        }
                        fit="contain"
                      />

                      <span
                        style={{
                          position:
                            'absolute',
                          left: '8px',
                          top: '8px',
                          padding:
                            '5px 8px',
                          borderRadius:
                            '999px',
                          background:
                            'rgba(0,0,0,.7)',
                          fontSize:
                            '10px',
                        }}
                      >
                        ＋
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeNewImage(
                            index
                          )
                        }
                        style={{
                          position:
                            'absolute',
                          right: '8px',
                          top: '8px',
                          width:
                            '28px',
                          height:
                            '28px',
                          borderRadius:
                            '999px',
                          border:
                            '1px solid rgba(255,255,255,.28)',
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

              <label
                style={{
                  ...fieldStyle,
                  marginTop:
                    '16px',
                }}
              >
                <span>
                  画像を追加
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    addImageFiles(
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
            </fieldset>

            <fieldset
              style={{
                marginTop: '22px',
                border: '1px solid rgba(255,255,255,.18)',
                borderRadius: '10px',
                padding: '18px',
                display: 'grid',
                gap: '16px',
              }}
            >
              <legend style={{ padding: '0 8px' }}>
                WATERMARK
              </legend>

              <p style={{ margin: 0, color: 'rgba(255,255,255,.48)', fontSize: '11px', lineHeight: 1.7 }}>
                画像ごとに透かしを編集できます。WHITEは25%、BLACKは5%が初期値です。
              </p>

              {existingImages.map((image, index) =>
                renderWatermarkEditor(
                  'existing',
                  index,
                  `IMAGE ${index + 1}`,
                  watermarkForExisting(image, category, snsId)
                )
              )}

              {newImages.map((file, index) =>
                renderWatermarkEditor(
                  'new',
                  index,
                  `NEW IMAGE ${index + 1} — ${file.name}`,
                  newImageWatermarks[index] ??
                    defaultWatermarkFor(category, snsId)
                )
              )}
            </fieldset>

            <fieldset
              style={{
                marginTop:
                  '22px',
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
                THUMBNAIL
              </legend>

              <div
                style={{
                  display:
                    'flex',
                  flexWrap:
                    'wrap',
                  gap: '18px',
                  marginBottom:
                    '15px',
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
                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(68px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {existingImages.map(
                    (
                      image,
                      index
                    ) => (
                      <button
                        key={
                          image.publicId
                        }
                        type="button"
                        onClick={() => {
                          setThumbChoice({
                            kind: 'existing',
                            index,
                          });
                          setThumbnailCrop(
                            DEFAULT_CROP
                          );
                        }}
                        style={{
                          padding: 0,
                          aspectRatio:
                            '1 / 1',
                          borderRadius:
                            '7px',
                          overflow:
                            'hidden',
                          border:
                            thumbChoice.kind ===
                              'existing' &&
                            thumbChoice.index ===
                              index
                              ? '2px solid #fff'
                              : '1px solid rgba(255,255,255,.2)',
                          background:
                            'rgba(255,255,255,.05)',
                          cursor:
                            'pointer',
                        }}
                      >
                        <img
                          src={
                            image.url
                          }
                          alt=""
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

                  {newImageUrls.map(
                    (
                      url,
                      index
                    ) => (
                      <button
                        key={`${url}-thumb`}
                        type="button"
                        onClick={() => {
                          setThumbChoice({
                            kind: 'new',
                            index,
                          });
                          setThumbnailCrop(
                            DEFAULT_CROP
                          );
                        }}
                        style={{
                          padding: 0,
                          aspectRatio:
                            '1 / 1',
                          borderRadius:
                            '7px',
                          overflow:
                            'hidden',
                          border:
                            thumbChoice.kind ===
                              'new' &&
                            thumbChoice.index ===
                              index
                              ? '2px solid #fff'
                              : '1px solid rgba(255,255,255,.2)',
                          background:
                            'rgba(255,255,255,.05)',
                          cursor:
                            'pointer',
                        }}
                      >
                        <img
                          src={url}
                          alt=""
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
              )}

              {thumbnailMode ===
                'custom' && (
                <label
                  style={{
                    ...fieldStyle,
                    marginTop:
                      '8px',
                  }}
                >
                  <span>
                    サムネイル専用画像
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNewCustomThumbnail(
                        e.target
                          .files?.[0] ??
                          null
                      )
                    }
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
                        '220px',
                      maxWidth:
                        '100%',
                      aspectRatio:
                        '1 / 1',
                      overflow:
                        'hidden',
                      borderRadius:
                        '9px',
                      border:
                        '1px solid rgba(255,255,255,.2)',
                      background:
                        'rgba(255,255,255,.05)',
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
                      alt=""
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
              gap: '24px',
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
              <>
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

                {isSongParody && (
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
                        onChange={(e) =>
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
                        onChange={(e) =>
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
                        MP3 / AUDIO
                      </span>

                      <input
                        type="file"
                        accept="audio/*,.mp3"
                        onChange={(e) => {
                          setNewAudioFile(
                            e.target
                              .files?.[0] ??
                              null
                          );
                          setRemoveAudio(
                            false
                          );
                        }}
                        style={{
                          color:
                            '#f5f5f5',
                        }}
                      />
                    </label>

                    {songAudioUrl &&
                      !removeAudio &&
                      !newAudioFile && (
                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          gap:
                            '12px',
                          padding:
                            '10px 12px',
                          borderRadius:
                            '8px',
                          background:
                            'rgba(255,255,255,.06)',
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              '11px',
                            color:
                              'rgba(255,255,255,.62)',
                          }}
                        >
                          登録済み音源あり
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setRemoveAudio(
                              true
                            );
                            setNewAudioFile(
                              null
                            );
                          }}
                          style={{
                            border:
                              '1px solid rgba(255,255,255,.2)',
                            borderRadius:
                              '7px',
                            background:
                              'transparent',
                            color:
                              '#fff',
                            padding:
                              '6px 9px',
                            cursor:
                              'pointer',
                          }}
                        >
                          音源を削除
                        </button>
                      </div>
                    )}

                    {newAudioFile && (
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            '11px',
                          color:
                            'rgba(255,255,255,.58)',
                        }}
                      >
                        新しい音源: {newAudioFile.name}
                      </p>
                    )}
                  </fieldset>
                )}
              </>
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
                    onChange={(e) =>
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
                    onChange={(e) =>
                      setSnsId(
                        e.target.value
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

            {progress && (
              <p>
                {progress}
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
              type="button"
              onClick={handleDeletePost}
              disabled={saving || deleting}
              style={{
                width: '100%',
                minHeight: '46px',
                padding: '12px 18px',
                border:
                  '1px solid rgba(255,120,120,.5)',
                borderRadius: '10px',
                background:
                  'rgba(160,35,35,.15)',
                color: '#ffb0b0',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '.06em',
                cursor:
                  saving || deleting
                    ? 'wait'
                    : 'pointer',
                opacity:
                  saving || deleting
                    ? 0.6
                    : 1,
              }}
            >
              {deleting
                ? 'DELETING...'
                : 'DELETE ILLUSTRATION'}
            </button>

            <button
              type="submit"
              disabled={saving || deleting}
              style={{
                width: '100%',
                minHeight:
                  '50px',
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
                  saving || deleting
                    ? 'wait'
                    : 'pointer',
                opacity:
                  saving || deleting
                    ? 0.65
                    : 1,
              }}
            >
              {saving
                ? 'SAVING...'
                : 'SAVE CHANGES'}
            </button>
          </section>
        </form>
      </main>

      {thumbnailSrc && (
        <CropEditor
          open={cropOpen}
          src={thumbnailSrc}
          aspect="1:1"
          initial={
            thumbnailCrop
          }
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
