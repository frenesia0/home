'use client';
// バックエンドアダプター (v2.0) — Supabase / Firebase を同じインターフェースで扱う。
// 画面側はこの型だけを見て、実際にどのバックエンドを使っているかは意識しない。

export type BackendKind = 'supabase' | 'firebase';

/** 接続設定 */
export type BackendConfig =
  | {
      kind: 'supabase';
      url: string;
      anonKey: string;
    }
  | {
      kind: 'firebase';
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      appId: string;
      messagingSenderId?: string;
      /** FirestoreデータベースID。空欄なら(default) */
      databaseId?: string;
    };

/** ログインユーザー */
export interface BackendUser {
  id: string;
  nickname: string;
  role: 'admin' | 'member';
  email?: string;
  avatarUrl?: string;
  avatarColor?: string;
}

/** 接続・ルール確認結果 */
export interface BackendCheck {
  ok: boolean;
  reachable: boolean;
  schema: boolean;
  hasAdmin: boolean;
  message: string;
}

/** 一覧に保存できる基本形 */
export interface ListItem {
  id: string;
  [k: string]: unknown;
}

export interface Backend {
  kind: BackendKind;

  /* ---- 接続確認 ---- */
  check(): Promise<BackendCheck>;

  /* ---- 認証 ---- */
  currentUser(): Promise<BackendUser | null>;
  onAuthChange(
    cb: (u: BackendUser | null) => void
  ): () => void;

  /** メール / パスワードログイン */
  signIn(
    id: string,
    password: string
  ): Promise<{
    ok: boolean;
    error?: string;
  }>;

  /** Googleログイン */
  signInWithGoogle?(): Promise<{
    ok: boolean;
    error?: string;
  }>;

  signUp(
    id: string,
    password: string,
    nickname: string
  ): Promise<{
    ok: boolean;
    error?: string;
  }>;

  signOut(): Promise<void>;

  resetPassword(
    email: string
  ): Promise<{
    ok: boolean;
    error?: string;
  }>;

  updateProfile(
    patch: {
      nickname?: string;
      avatarUrl?: string | null;
      avatarColor?: string | null;
    }
  ): Promise<{
    ok: boolean;
    error?: string;
  }>;

  /** 最初のアカウントを管理者として登録 */
  claimOwner(): Promise<{
    ok: boolean;
    error?: string;
  }>;

  /** 会員一覧 */
  listMembers(): Promise<
    {
      id: string;
      nickname: string;
      role: 'admin' | 'member';
      email?: string;
    }[]
  >;

  /**
   * 現在ログイン中ユーザーの認証トークンを取得する。
   * FirebaseではIDトークンを返す。
   *
   * Cloudinary削除APIなど、サーバー側で
   * 「本当にログイン中の管理者本人か」を確認するために使う。
   *
   * Firebase以外では未実装でもよいのでoptional。
   */
  getIdToken?(): Promise<string | null>;

  /* ---- 一覧（コンテンツ） ---- */
  fetchList<T extends ListItem>(
    coll: string
  ): Promise<T[]>;

  syncList<T extends ListItem>(
    coll: string,
    prev: T[],
    next: T[],
    uid: string | null
  ): Promise<void>;

  subscribe(
    coll: string,
    onChange: () => void
  ): () => void;

  /* ---- 設定 ---- */
  fetchSetting<T>(
    key: string
  ): Promise<T | null>;

  saveSetting(
    key: string,
    value: unknown
  ): Promise<void>;

  fetchAllSettings(): Promise<
    Record<string, unknown>
  >;

  /* ---- 画像・ファイル ---- */
  uploadFile(
    blob: Blob,
    ext: string
  ): Promise<string>;

  listFiles(): Promise<
    {
      ref: string;
      size: number;
    }[]
  >;

  deleteFile(
    ref: string
  ): Promise<void>;

  /** 会員プロフィール削除 */
  deleteMember(
    id: string
  ): Promise<void>;
}

/** localStorageキー → コレクション/テーブル */
export const COLLECTION_OF: Record<
  string,
  string
> = {
  'ohome.board.v1': 'posts',
  'ohome.guest.v1': 'guestbook',
  'ohome.chars.v1': 'characters',
  'ohome.rels.v1': 'relations',
  'ohome.backup.v1': 'gallery',
  'ohome.road.v1': 'roadview',
  'ohome.trpg.v1': 'trpg_logs',
  'ohome.trpgbody.v1': 'trpg_log_bodies',
  'ohome.tchars.v1': 'trpg_chars',
  'ohome.dotori.v1': 'dotori',
  'ohome.playlog.v1': 'playlog',
  'ohome.rp.v1': 'rp_rooms',
  'ohome.threads.v1': 'threads',
  'ohome.diary.v1': 'diary',
  'ohome.memo.v1': 'memos',
  'ohome.comm.v1': 'commissions',
  'ohome.commapply.v1': 'applicants',
  'ohome.moods.v1': 'moods',
};

export const CONTENT_COLLECTIONS =
  Object.values(COLLECTION_OF);

/** 項目配列の差分を取得 */
export function diffList<
  T extends ListItem
>(
  prev: T[],
  next: T[]
) {
  const prevMap =
    new Map(
      prev.map(
        (it, i) => [
          it.id,
          {
            it,
            i,
          },
        ]
      )
    );

  const nextIds =
    new Set(
      next.map(
        (it) => it.id
      )
    );

  const inserts: {
    item: T;
    sort: number;
  }[] = [];

  const updates: {
    item: T;
    sort: number;
  }[] = [];

  next.forEach(
    (it, i) => {
      const before =
        prevMap.get(it.id);

      if (!before) {
        inserts.push({
          item: it,
          sort: i,
        });
      } else if (
        before.i !== i ||
        JSON.stringify(before.it) !==
          JSON.stringify(it)
      ) {
        updates.push({
          item: it,
          sort: i,
        });
      }
    }
  );

  const deletes =
    prev
      .filter(
        (it) =>
          !nextIds.has(it.id)
      )
      .map(
        (it) => it.id
      );

  return {
    inserts,
    updates,
    deletes,
  };
}

/**
 * 権限判定用のメタ情報を取得。
 *
 * listHiddenを持つ項目は一覧公開状態をvisibilityへ反映する。
 */
export function metaOf(
  item: ListItem,
  uid: string | null
) {
  const rawAuthor =
    typeof item.authorId === 'string'
      ? item.authorId
      : '';

  const authorId =
    rawAuthor ||
    uid ||
    null;

  const hasListHidden =
    typeof item.listHidden ===
    'boolean';

  const visibility =
    hasListHidden
      ? (
          item.listHidden
            ? 'private'
            : 'public'
        )
      : (
          typeof item.visibility ===
          'string'
            ? item.visibility
            : 'public'
        );

  return {
    authorId,
    visibility,
  };
}
