'use client';

import { fetchList, syncList, subscribeTable } from '@/lib/db';

export type GalleryCategory = 'original' | 'commission';
export type GalleryCharacterTag = 'shiki' | 'solas' | 'reference';

export interface GalleryPost {
  id: string;
  title: string;
  date: string;
  category: GalleryCategory;
  tags: GalleryCharacterTag[];
  imageUrl: string;
  cloudinaryPublicId: string;
  authorId: string;
  visibility: 'public';
  createdAt: string;

  // backend側のListItem型と互換にするためのインデックスシグネチャ
  [key: string]: unknown;
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
