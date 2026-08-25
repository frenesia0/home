'use client';

import {
  fetchList,
  syncList,
  subscribeTable,
} from '@/lib/db';

import type {
  CropValue,
} from '@/components/ui/CropEditor';


/* =========================================================
   BASIC TYPES
========================================================= */

export type GalleryCategory =
  | 'original'
  | 'commission';

export type GalleryCharacter =
  | 'shiki'
  | 'solas';

export type GalleryTag =
  | 'reference'
  | 'song-parody'
  | 'manga'
  | 'rakugaki'
  | 'tachie';


/* =========================================================
   WATERMARK
========================================================= */

export type GalleryWatermarkColor =
  | 'white'
  | 'black'
  | 'none';


export interface GalleryWatermark {
  /**
   * white:
   * 白いウォーターマーク
   *
   * black:
   * 黒いウォーターマーク
   *
   * none:
   * ウォーターマークなし
   */
  color:
    GalleryWatermarkColor;


  /**
   * 不透明度
   *
   * 0〜100
   *
   * WHITE初期値:
   * 25
   *
   * BLACK初期値:
   * 5
   */
  opacity:
    number;


  /**
   * 右下に表示するID
   *
   * ORIGINAL:
   * @frenesia0
   *
   * COMMISSION:
   * 絵師さんのSNS ID
   */
  text:
    string;


  /**
   * 大きな斜め格子を表示するか
   */
  grid:
    boolean;


  /**
   * 斜め格子の大きさ
   *
   * 基準値:
   * 180
   *
   * UI上では
   * 60〜500程度で調整する
   */
  gridSize:
    number;
}


/**
 * ORIGINAL用の標準ウォーターマーク
 */
export const DEFAULT_ORIGINAL_WATERMARK: GalleryWatermark = {
  color: 'none',
  opacity: 0,
  text: '@frenesia0',
  grid: false,
  gridSize: 180,
};

/**
 * 色ごとの初期不透明度
 */
export function getDefaultWatermarkOpacity(
  color:
    GalleryWatermarkColor
): number {
  if (
    color === 'black'
  ) {
    return 5;
  }

  if (
    color === 'white'
  ) {
    return 25;
  }

  return 0;
}


/**
 * SNS IDを
 * ウォーターマーク用の形式に整える
 *
 * example
 *
 * frenesia0
 *
 * ↓
 *
 * @frenesia0
 */
export function normalizeWatermarkText(
  value:
    string
): string {
  const trimmed =
    value.trim();

  if (
    !trimmed
  ) {
    return '';
  }

  if (
    trimmed.startsWith(
      '@'
    )
  ) {
    return trimmed;
  }

  return `@${trimmed}`;
}


/**
 * 新しいウォーターマーク設定を作る
 */
export function createGalleryWatermark(
  color: GalleryWatermarkColor = 'none',
  text = '@frenesia0'
): GalleryWatermark {
  return {
    color,

    opacity:
      getDefaultWatermarkOpacity(
        color
      ),

    text:
      normalizeWatermarkText(
        text
      ),

    grid:
      color !==
      'none',

    gridSize:
      180,
  };
}


/**
 * 保存済みのウォーターマーク設定を
 * 安全な値に整える
 *
 * 古い投稿に watermark がない場合も
 * WHITE / 25% / @frenesia0 / GRID ON / 180
 * として扱える
 */
export function normalizeGalleryWatermark(
  watermark:
    | GalleryWatermark
    | undefined
): GalleryWatermark {
  if (
    !watermark
  ) {
    return {
      ...DEFAULT_ORIGINAL_WATERMARK,
    };
  }


  const color:
    GalleryWatermarkColor =
      watermark.color ===
        'black' ||
      watermark.color ===
        'none'
        ? watermark.color
        : 'white';


  const rawOpacity =
    typeof watermark.opacity ===
      'number' &&
    Number.isFinite(
      watermark.opacity
    )
      ? watermark.opacity
      : getDefaultWatermarkOpacity(
          color
        );


  const opacity =
    Math.min(
      100,
      Math.max(
        0,
        rawOpacity
      )
    );


  const text =
    typeof watermark.text ===
      'string'
      ? normalizeWatermarkText(
          watermark.text
        )
      : '@frenesia0';


  const gridSize =
    typeof watermark.gridSize ===
      'number' &&
    Number.isFinite(
      watermark.gridSize
    )
      ? Math.min(
          500,
          Math.max(
            60,
            watermark.gridSize
          )
        )
      : 180;


  return {
    color,

    opacity:
      color ===
      'none'
        ? 0
        : opacity,

    text,

    grid:
      color ===
      'none'
        ? false
        : watermark.grid !==
          false,

    gridSize,
  };
}


/* =========================================================
   IMAGE
========================================================= */

export interface GalleryImage {
  url:
    string;

  publicId:
    string;


  /**
   * 画像ごとのウォーターマーク設定
   *
   * optional にしてあるため
   * 既存投稿も壊れない
   */
  watermark?:
    GalleryWatermark;
}


/* =========================================================
   COMMISSION
========================================================= */

export interface GalleryCommission {
  artistName:
    string;

  snsId?:
    string;

  snsUrl?:
    string;
}


/* =========================================================
   SONG
========================================================= */

export interface GallerySong {
  title?:
    string;

  url?:
    string;
}


/* =========================================================
   THUMBNAIL
========================================================= */

export type GalleryThumbnailMode =
  | 'post'
  | 'custom';


/* =========================================================
   POST
========================================================= */

export interface GalleryPost {
  id:
    string;

  title?:
    string;

  date:
    string;

  category:
    GalleryCategory;


  characters?:
    GalleryCharacter[];


  tags?:
    GalleryTag[];


  images?:
    GalleryImage[];


  thumbnailMode?:
    GalleryThumbnailMode;


  thumbnailIndex?:
    number;


  thumbnailCrop?:
    CropValue;


  customThumbnail?:
    GalleryImage;


  commission?:
    GalleryCommission;


  /**
   * SONG PARODYのときだけ使用
   */
  song?:
    GallerySong;


  /* ---------------------------------------------------------
     旧形式との互換
  --------------------------------------------------------- */

  imageUrl?:
    string;


  cloudinaryPublicId?:
    string;


  legacyTags?:
    string[];


  authorId:
    string;


  visibility:
    'public';


  createdAt:
    string;


  [key: string]:
    unknown;
}


/* =========================================================
   COLLECTION
========================================================= */

export const GALLERY_COLLECTION =
  'gallery';


/* =========================================================
   IMAGE HELPERS
========================================================= */

export function getGalleryImages(
  post:
    GalleryPost
): GalleryImage[] {
  if (
    Array.isArray(
      post.images
    ) &&
    post.images.length >
      0
  ) {
    return post.images.filter(
      (
        image
      ): image is GalleryImage =>
        typeof image?.url ===
          'string' &&
        image.url.length >
          0 &&
        typeof image
          ?.publicId ===
          'string' &&
        image.publicId.length >
          0
    );
  }


  /*
   * 旧形式との互換
   */
  if (
    typeof post.imageUrl ===
      'string' &&
    post.imageUrl.length >
      0 &&
    typeof post
      .cloudinaryPublicId ===
      'string' &&
    post
      .cloudinaryPublicId
      .length >
      0
  ) {
    return [
      {
        url:
          post.imageUrl,

        publicId:
          post.cloudinaryPublicId,
      },
    ];
  }


  return [];
}


/**
 * 画像のウォーターマーク設定を取得
 *
 * 古い画像なら
 * デフォルト設定を返す
 */
export function getGalleryImageWatermark(
  image:
    GalleryImage
): GalleryWatermark {
  return normalizeGalleryWatermark(
    image.watermark
  );
}


/* =========================================================
   THUMBNAIL HELPERS
========================================================= */

export function getGalleryThumbnailIndex(
  post:
    GalleryPost
): number {
  const images =
    getGalleryImages(
      post
    );


  if (
    images.length ===
    0
  ) {
    return 0;
  }


  const index =
    typeof post.thumbnailIndex ===
      'number'
      ? Math.floor(
          post.thumbnailIndex
        )
      : 0;


  if (
    index <
      0 ||
    index >=
      images.length
  ) {
    return 0;
  }


  return index;
}


export function getGalleryThumbnailImage(
  post:
    GalleryPost
): GalleryImage | null {
  if (
    post.thumbnailMode ===
      'custom' &&
    post.customThumbnail &&
    typeof post
      .customThumbnail
      .url ===
      'string' &&
    post.customThumbnail
      .url.length >
      0 &&
    typeof post
      .customThumbnail
      .publicId ===
      'string' &&
    post.customThumbnail
      .publicId.length >
      0
  ) {
    return post
      .customThumbnail;
  }


  const images =
    getGalleryImages(
      post
    );


  if (
    images.length ===
    0
  ) {
    return null;
  }


  return (
    images[
      getGalleryThumbnailIndex(
        post
      )
    ] ??
    images[0] ??
    null
  );
}


/* =========================================================
   CHARACTER HELPERS
========================================================= */

export function getGalleryCharacters(
  post:
    GalleryPost
): GalleryCharacter[] {
  if (
    Array.isArray(
      post.characters
    )
  ) {
    return post.characters.filter(
      (
        character
      ): character is GalleryCharacter =>
        character ===
          'shiki' ||
        character ===
          'solas'
    );
  }


  const rawTags =
    (
      post as {
        tags?:
          unknown;
      }
    ).tags;


  const legacy =
    Array.isArray(
      rawTags
    )
      ? rawTags
      : Array.isArray(
            post.legacyTags
          )
        ? post.legacyTags
        : [];


  return legacy.filter(
    (
      item
    ): item is GalleryCharacter =>
      item ===
        'shiki' ||
      item ===
        'solas'
  );
}


/* =========================================================
   TAG HELPERS
========================================================= */

export function getGalleryTags(
  post:
    GalleryPost
): GalleryTag[] {
  if (
    post.category ===
    'commission'
  ) {
    return [];
  }


  const rawTags =
    (
      post as {
        tags?:
          unknown;
      }
    ).tags;


  const source =
    Array.isArray(
      rawTags
    )
      ? rawTags
      : Array.isArray(
            post.legacyTags
          )
        ? post.legacyTags
        : [];


  const converted:
    GalleryTag[] =
      [];


  for (
    const item of
    source
  ) {
    if (
      item ===
      'reference'
    ) {
      converted.push(
        'reference'
      );
    }


    if (
      item ===
        'song-inspired' ||
      item ===
        'song-parody'
    ) {
      converted.push(
        'song-parody'
      );
    }


    if (
      item ===
      'manga'
    ) {
      converted.push(
        'manga'
      );
    }


    if (
      item ===
      'rakugaki'
    ) {
      converted.push(
        'rakugaki'
      );
    }


    if (
      item ===
      'tachie'
    ) {
      converted.push(
        'tachie'
      );
    }
  }


  return Array.from(
    new Set(
      converted
    )
  );
}


/* =========================================================
   COMMISSION HELPERS
========================================================= */

export function getGalleryCommission(
  post:
    GalleryPost
): GalleryCommission | null {
  if (
    post.category !==
      'commission' ||
    !post.commission ||
    typeof post
      .commission
      .artistName !==
      'string'
  ) {
    return null;
  }


  return {
    artistName:
      post
        .commission
        .artistName,


    snsId:
      typeof post
        .commission
        .snsId ===
        'string'
        ? post
            .commission
            .snsId
        : undefined,


    snsUrl:
      typeof post
        .commission
        .snsUrl ===
        'string'
        ? post
            .commission
            .snsUrl
        : undefined,
  };
}


/* =========================================================
   SONG HELPERS
========================================================= */

export function getGallerySong(
  post:
    GalleryPost
): GallerySong | null {
  if (
    post.category !==
      'original' ||
    !getGalleryTags(
      post
    ).includes(
      'song-parody'
    )
  ) {
    return null;
  }


  const song =
    post.song;


  if (
    !song ||
    typeof song !==
      'object'
  ) {
    return null;
  }


  const title =
    typeof song.title ===
      'string' &&
    song.title.trim()
      ? song.title.trim()
      : undefined;


  const url =
    typeof song.url ===
      'string' &&
    song.url.trim()
      ? song.url.trim()
      : undefined;


  if (
    !title &&
    !url
  ) {
    return null;
  }


  return {
    title,
    url,
  };
}


/* =========================================================
   FETCH
========================================================= */

export async function fetchGalleryPosts(): Promise<
  GalleryPost[]
> {
  return fetchList<GalleryPost>(
    GALLERY_COLLECTION
  );
}


/* =========================================================
   SAVE
========================================================= */

export async function saveGalleryPosts(
  previous:
    GalleryPost[],

  next:
    GalleryPost[],

  uid:
    string | null
): Promise<void> {
  await syncList<GalleryPost>(
    GALLERY_COLLECTION,
    previous,
    next,
    uid
  );
}


/* =========================================================
   SUBSCRIBE
========================================================= */

export function subscribeGallery(
  onChange:
    () => void
): () => void {
  return subscribeTable(
    GALLERY_COLLECTION,
    onChange
  );
}
