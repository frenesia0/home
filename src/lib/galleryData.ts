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

export interface GalleryPost {
  id: string;
  title?: string;
  date: string;
  category: GalleryCategory;

  // 新形式：キャラクターとタグを分離
  characters?: GalleryCharacter[];
  tags?: GalleryTag[];

  // 新形式：1投稿に複数画像を持てる
  images?: GalleryImage[];

  // 旧形式との互換用。既存投稿を壊さないため当面残す
  imageUrl?: string;
  cloudinaryPublicId?: string;

  // 旧形式との互換用。以前は shiki / solas / reference / song-inspired を
  // すべて同じ tags 配列に入れていたため、読み取り時に分離する
  legacyTags?: string[];

  authorId: string;
  visibility: 'public';
  createdAt: string;

  // backend側のListItem型と互換にするためのインデックスシグネチャ
  [key: string]: unknown;
}

/**
 * 新旧どちらの形式でも、投稿内の画像を同じ形で取得する。
 * 既存投稿は imageUrl / cloudinaryPublicId、
 * 新規投稿は images[] を使う。
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
 * 旧形式では item.tags に shiki / solas が混在していたため、
 * それをキャラクターとして読み替える。
 */
export function getGalleryCharacters(post: GalleryPost): GalleryCharacter[] {
  if (Array.isArray(post.characters)) {
    return post.characters.filter(
      (character): character is GalleryCharacter =>
        character === 'shiki' || character === 'solas'
    );
  }

  const legacy = Array.isArray((post as { tags?: unknown }).tags)
    ? ((post as { tags?: unknown[] }).tags ?? [])
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
 */
export function getGalleryTags(post: GalleryPost): GalleryTag[] {
  if (Array.isArray(post.tags)) {
    const hasNewOnly = post.tags.every(
      (tag) =>
        tag === 'reference' ||
        tag === 'song-parody' ||
        tag === 'manga' ||
        tag === 'rakugaki'
    );

    if (hasNewOnly) {
      return post.tags;
    }
  }

  const legacy = Array.isArray((post as { tags?: unknown }).tags)
    ? ((post as { tags?: unknown[] }).tags ?? [])
    : Array.isArray(post.legacyTags)
      ? post.legacyTags
      : [];

  const converted: GalleryTag[] = [];

  for (const item of legacy) {
    if (item === 'reference') converted.push('reference');
    if (item === 'song-inspired' || item === 'song-parody') {
      converted.push('song-parody');
    }
    if (item === 'manga') converted.push('manga');
    if (item === 'rakugaki') converted.push('rakugaki');
  }

  return Array.from(new Set(converted));
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
