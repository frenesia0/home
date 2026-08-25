'use client';

import { fetchList, syncList, subscribeTable } from '@/lib/db';
import type { CropValue } from '@/components/ui/CropEditor';

export type GalleryCategory = 'original' | 'commission';

export type GalleryCharacter =
  | 'shiki'
  | 'solas';

export type GalleryTag =
  | 'reference'
  | 'song-parody'
  | 'manga'
  | 'rakugaki'
  | 'tachie';

export interface GalleryImage {
  url: string;
  publicId: string;
}

export interface GalleryCommission {
  artistName: string;
  snsId?: string;
  snsUrl?: string;
}

export interface GallerySong {
  title?: string;
  url?: string;
}

export type GalleryThumbnailMode = 'post' | 'custom';

export interface GalleryPost {
  id: string;
  title?: string;
  date: string;
  category: GalleryCategory;

  characters?: GalleryCharacter[];
  tags?: GalleryTag[];

  images?: GalleryImage[];

  thumbnailMode?: GalleryThumbnailMode;
  thumbnailIndex?: number;
  thumbnailCrop?: CropValue;
  customThumbnail?: GalleryImage;

  commission?: GalleryCommission;

  // SONG PARODYのときだけ使用。どちらも任意
  song?: GallerySong;

  // 旧形式との互換用
  imageUrl?: string;
  cloudinaryPublicId?: string;
  legacyTags?: string[];

  authorId: string;
  visibility: 'public';
  createdAt: string;

  [key: string]: unknown;
}

export const GALLERY_COLLECTION = 'illustrations';

export function getGalleryImages(post: GalleryPost): GalleryImage[] {
  if (Array.isArray(post.images) && post.images.length > 0) {
    return post.images.filter(
      (image) =>
        typeof image?.url === 'string' &&
        image.url.length > 0 &&
        typeof image?.publicId === 'string' &&
        image.publicId.length > 0
    );
  }

  if (
    typeof post.imageUrl === 'string' &&
    post.imageUrl.length > 0 &&
    typeof post.cloudinaryPublicId === 'string' &&
    post.cloudinaryPublicId.length > 0
  ) {
    return [{
      url: post.imageUrl,
      publicId: post.cloudinaryPublicId,
    }];
  }

  return [];
}

export function getGalleryThumbnailIndex(post: GalleryPost): number {
  const images = getGalleryImages(post);
  if (images.length === 0) return 0;

  const index =
    typeof post.thumbnailIndex === 'number'
      ? Math.floor(post.thumbnailIndex)
      : 0;

  if (index < 0 || index >= images.length) return 0;
  return index;
}

export function getGalleryThumbnailImage(
  post: GalleryPost
): GalleryImage | null {
  if (
    post.thumbnailMode === 'custom' &&
    post.customThumbnail &&
    typeof post.customThumbnail.url === 'string' &&
    post.customThumbnail.url.length > 0 &&
    typeof post.customThumbnail.publicId === 'string' &&
    post.customThumbnail.publicId.length > 0
  ) {
    return post.customThumbnail;
  }

  const images = getGalleryImages(post);
  if (images.length === 0) return null;

  return images[getGalleryThumbnailIndex(post)] ?? images[0] ?? null;
}

export function getGalleryCharacters(post: GalleryPost): GalleryCharacter[] {
  if (Array.isArray(post.characters)) {
    return post.characters.filter(
      (character): character is GalleryCharacter =>
        character === 'shiki' || character === 'solas'
    );
  }

  const rawTags = (post as { tags?: unknown }).tags;
  const legacy = Array.isArray(rawTags)
    ? rawTags
    : Array.isArray(post.legacyTags)
      ? post.legacyTags
      : [];

  return legacy.filter(
    (item): item is GalleryCharacter =>
      item === 'shiki' || item === 'solas'
  );
}

export function getGalleryTags(post: GalleryPost): GalleryTag[] {
  if (post.category === 'commission') return [];

  const rawTags = (post as { tags?: unknown }).tags;
  const source = Array.isArray(rawTags)
    ? rawTags
    : Array.isArray(post.legacyTags)
      ? post.legacyTags
      : [];

  const converted: GalleryTag[] = [];

  for (const item of source) {
    if (item === 'reference') converted.push('reference');

    if (item === 'song-inspired' || item === 'song-parody') {
      converted.push('song-parody');
    }

    if (item === 'manga') converted.push('manga');
    if (item === 'rakugaki') converted.push('rakugaki');
    if (item === 'tachie') converted.push('tachie');
  }

  return Array.from(new Set(converted));
}

export function getGalleryCommission(
  post: GalleryPost
): GalleryCommission | null {
  if (
    post.category !== 'commission' ||
    !post.commission ||
    typeof post.commission.artistName !== 'string'
  ) {
    return null;
  }

  return {
    artistName: post.commission.artistName,
    snsId:
      typeof post.commission.snsId === 'string'
        ? post.commission.snsId
        : undefined,
    snsUrl:
      typeof post.commission.snsUrl === 'string'
        ? post.commission.snsUrl
        : undefined,
  };
}

export function getGallerySong(post: GalleryPost): GallerySong | null {
  if (
    post.category !== 'original' ||
    !getGalleryTags(post).includes('song-parody')
  ) {
    return null;
  }

  const song = post.song;
  if (!song || typeof song !== 'object') return null;

  const title =
    typeof song.title === 'string' && song.title.trim()
      ? song.title.trim()
      : undefined;

  const url =
    typeof song.url === 'string' && song.url.trim()
      ? song.url.trim()
      : undefined;

  if (!title && !url) return null;
  return { title, url };
}

export async function fetchGalleryPosts(): Promise<GalleryPost[]> {
  return fetchList<GalleryPost>(GALLERY_COLLECTION);
}

export async function saveGalleryPosts(
  previous: GalleryPost[],
  next: GalleryPost[],
  uid: string | null,
): Promise<void> {
  await syncList<GalleryPost>(
    GALLERY_COLLECTION,
    previous,
    next,
    uid
  );
}

export function subscribeGallery(
  onChange: () => void
): () => void {
  return subscribeTable(
    GALLERY_COLLECTION,
    onChange
  );
}
