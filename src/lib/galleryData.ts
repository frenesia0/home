'use client';

import { fetchList, syncList, subscribeTable } from '@/lib/db';

export type GalleryCategory = 'original' | 'commission';
export type GalleryCharacterTag =
  | 'shiki'
  | 'solas'
  | 'reference'
  | 'song-inspired';

export interface GalleryImage {
  url: string;
  publicId: string;
}

export interface GalleryPost {
  id: string;
  title?: string;
  date: string;
  category: GalleryCategory;
  tags: GalleryCharacterTag[];

  // 新形式：1投稿に複数画像を持てる
  images?: GalleryImage[];

  // 旧形式との互換用。既存投稿を壊さないため当面残す
  imageUrl?: string;
  cloudinaryPublicId?: string;

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
