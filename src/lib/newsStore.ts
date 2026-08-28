export type NewsTag =
  | 'news'
  | 'world'
  | 'solas'
  | 'shiki';

export type NewsStatus =
  | 'draft'
  | 'published';

export interface NewsArticle {
  id: string;
  title: string;
  date: string;
  bodyHtml: string;
  tag: NewsTag;
  status: NewsStatus;
  createdAt: string;
  updatedAt: string;

  // Firestoreで一般公開 / 下書きを分ける
  visibility: 'public' | 'private';

  // 作成者
  authorId?: string;
}

export const NEWS_SEED: NewsArticle[] = [];

export const NEWS_TAGS: {
  value: NewsTag;
  label: string;
}[] = [
  { value: 'news', label: 'NEWS' },
{
  value: 'world',
  label: 'WORLD',
},
  { value: 'shiki', label: 'SHIKI' },
  { value: 'solas', label: 'SOLAS' },
];

export const newsTagLabel = (tag: NewsTag): string =>
  NEWS_TAGS.find(item => item.value === tag)?.label ?? tag;
