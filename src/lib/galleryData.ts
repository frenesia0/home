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

export type GalleryThumbnailMode = 'post' | 'custom';

export interface GalleryPost {
  id: string;
  title?: string;
  date: string;
  category: GalleryCategory;

  // キャラクターとタグは別管理
  characters?: GalleryCharacter[];
  tags?: GalleryTag[];

  // 1投稿に複数画像
  images?: GalleryImage[];

  // Gallery一覧のサムネイル方式
  // post: 投稿画像から選択 / custom: サムネイル専用画像
  thumbnailMode?: GalleryThumbnailMode;

  // post方式で使う投稿画像。0 = 1枚目、1 = 2枚目...
  thumbnailIndex?: number;

  // サムネイルの1:1表示範囲
  thumbnailCrop?: CropValue;

  // custom方式で使う一覧専用画像。投稿本文の画像枚数には含めない
  customThumbnail?: GalleryImage;

  // COMMISSIONのときだけ使用
  commission?: GalleryCommission;

  // 旧形式との互換用
  imageUrl?: string;
  cloudinaryPublicId?: string;
  legacyTags?: string[];

  authorId: string;
  visibility: 'public';
  createdAt: string;

  // backend側のListItem型と互換にする
  [key: string]: unknown;
}

/**
 * 新Gallery専用のFirestoreコレクション名。
 *
 * 旧O.HOMEの「絵バックアップ」は gallery コレクションを使用しているため、
 * 新しい /gallery 機能は illustrations に分離する。
 */
export const GALLERY_COLLECTION = 'illustrations';

/**
 * 新旧どちらの形式でも画像を取得する。
 */
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
    return [
      {
        url: post.imageUrl,
        publicId: post.cloudinaryPublicId,
      },
    ];
  }

  return [];
}

/**
 * サムネイルに使う画像の番号を安全に取得する。
 * 未設定・範囲外なら1枚目を使う。
 */
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

/**
 * サムネイルに使う代表画像を取得する。
 * 専用画像が選ばれている場合はそちらを優先する。
 */
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

/**
 * 新旧どちらの形式でもキャラクター情報を取得する。
 * 旧形式では tags に shiki / solas が混在していたため読み替える。
 */
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

/**
 * 新旧どちらの形式でもタグ情報を取得する。
 * 旧形式の song-inspired は song-parody として読み替える。
 * COMMISSIONではタグを表示・検索対象にしない。
 */
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

/**
 * COMMISSION情報を安全に取得する。
 */
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

/** 新Gallery一覧をFirestoreから取得する */
export async function fetchGalleryPosts(): Promise<GalleryPost[]> {
  return fetchList<GalleryPost>(GALLERY_COLLECTION);
}

/** 新Gallery一覧の変更をFirestoreへ同期する */
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

/** 新Galleryコレクションの変更を購読する */
export function subscribeGallery(
  onChange: () => void
): () => void {
  return subscribeTable(
    GALLERY_COLLECTION,
    onChange
  );
}
