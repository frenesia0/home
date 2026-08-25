'use client';

import { fetchList, syncList, subscribeTable } from '@/lib/db';

export type GalleryCategory = 'original' | 'commission';

export type GalleryCharacter =
  | 'shiki'
  | 'solas';

export type GalleryTag =
  | 'reference'
  | 'song-parody'
  | 'manga'
  | 'rakugaki';

export interface GalleryImage {
  url: string;
  publicId: string;
}

export interface GalleryCommission {
  artistName: string;
  snsId?: string;
  snsUrl?: string;
}

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

  // 詳細画面で表示する自由メモ
  memo?: string;

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

/** Gallery一覧をFirestoreから取得する */
export async function fetchGalleryPosts(): Promise<GalleryPost[]> {
  return fetchList<GalleryPost>('gallery');
}

/** Gallery一覧の変更をFirestoreへ同期する */
export async function saveGalleryPosts(
  previous: GalleryPost[],
  next: GalleryPost[],
  uid: string | null,
): Promise<void> {
  await syncList<GalleryPost>('gallery', previous, next, uid);
}

/** Galleryコレクションの変更を購読する */
export function subscribeGallery(onChange: () => void): () => void {
  return subscribeTable('gallery', onChange);
}
