'use client';
// 認証コンテキスト (v2.0) — バックエンドアダプター（Supabase / Firebase）へ処理を委譲する。
// バックエンド設定がない場合（開発・オフライン）は、ブラウザ内のローカルアカウントで動作する。

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { backend, isServerMode } from './backend';
import { setCurrentUserId } from './currentUser';
import { getSetting, setSetting } from './settingStore';

export type Role = 'admin' | 'member' | 'guest';

export interface User {
  id: string;
  nickname: string;
  role: Role;
  avatarUrl?: string;
  avatarColor?: string;
  email?: string;
}

type Result = {
  ok: boolean;
  error?: string;
};

interface AuthCtx {
  user: User | null;
  isAdmin: boolean;

  login: (
    id: string,
    password: string
  ) => Promise<Result>;

  loginWithGoogle: () => Promise<Result>;

  signup: (
    id: string,
    password: string,
    nickname: string,
    inviteCode: string,
    email?: string
  ) => Promise<Result>;

  findId: (
    email: string
  ) => Promise<Result & {
    foundId?: string;
  }>;

  resetPassword: (
    email: string
  ) => Promise<Result & {
    tempPassword?: string;
  }>;

  logout: () => Promise<void>;

  updateProfile: (
    patch: {
      nickname?: string;
      avatarUrl?: string | null;
      avatarColor?: string | null;
      currentPassword?: string;
      newPassword?: string;
    }
  ) => Promise<Result>;

  mock: boolean;
}

const Ctx =
  createContext<AuthCtx | null>(null);

const MOCK_KEY =
  'ohome.mockuser.v1';

const MOCK_REG_KEY =
  'ohome.mockreg.v1';

const INVITE_KEY =
  'ohome.invite.v1';

const SETUP_KEY =
  'ohome.setup.v1';

/**
 * Vercel の Environment Variables に設定した
 * 管理者用 Firebase UID。
 *
 * NEXT_PUBLIC_ なのでブラウザから参照可能。
 * 秘密情報として扱うものではない。
 *
 * 本当の書き込み制限は後で
 * Firestore Security Rules 側にも設定する。
 */
const ADMIN_UID =
  process.env.NEXT_PUBLIC_ADMIN_UID?.trim() ?? '';

/** 現在の招待コード */
export function inviteCode(): string {
  return (
    getSetting<string>(
      INVITE_KEY,
      'WELCOME'
    ) || 'WELCOME'
  );
}

export function setInviteCode(
  code: string
) {
  setSetting(
    INVITE_KEY,
    code.trim()
  );
}

export function isSetupDone(): boolean {
  try {
    return !!localStorage.getItem(
      SETUP_KEY
    );
  } catch {
    return false;
  }
}

export function markSetupDone() {
  try {
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        done: true,
        at: new Date().toISOString(),
      })
    );
  } catch {
    /* 無視 */
  }
}

/* ---------- ローカルアカウント ---------- */

const MOCK_ACCOUNTS: Record<
  string,
  {
    password: string;
    user: User;
  }
> = {
  admin: {
    password: '0000',
    user: {
      id: 'admin',
      nickname: '管理者',
      role: 'admin',
    },
  },

  guest: {
    password: '0000',
    user: {
      id: 'guest',
      nickname: '知人メンバー',
      role: 'member',
    },
  },
};

function mockRegistry(): Record<
  string,
  {
    password: string;
    user: User;
  }
> {
  try {
    return JSON.parse(
      localStorage.getItem(
        MOCK_REG_KEY
      ) ?? '{}'
    );
  } catch {
    return {};
  }
}

/** メンバープロフィール取得 */
export function mockMemberInfo(
  id: string
): User | null {
  const hit =
    mockRegistry()[id]?.user ??
    (
      isSetupDone()
        ? undefined
        : MOCK_ACCOUNTS[id]?.user
    );

  return hit
    ? { ...hit }
    : null;
}

export interface SetupInput {
  adminId: string;
  adminPw: string;
  adminNick?: string;
  guestPw?: string;
}

/** ローカルアカウント初期設定 */
export function completeSetup(
  v: SetupInput
): {
  ok: boolean;
  error?: string;
} {
  const id =
    v.adminId.trim();

  if (
    !id ||
    !v.adminPw
  ) {
    return {
      ok: false,
      error:
        '管理者IDとパスワードを入力してください。',
    };
  }

  try {
    const reg =
      mockRegistry();

    reg[id] = {
      password:
        v.adminPw,

      user: {
        id,
        nickname:
          v.adminNick?.trim() ||
          '管理者',
        role: 'admin',
      },
    };

    if (
      v.guestPw?.trim()
    ) {
      reg.guest = {
        password:
          v.guestPw.trim(),

        user: {
          id: 'guest',
          nickname: 'ゲスト',
          role: 'member',
        },
      };
    }

    localStorage.setItem(
      MOCK_REG_KEY,
      JSON.stringify(reg)
    );

    markSetupDone();

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      error:
        '設定を保存できませんでした。',
    };
  }
}

/* ---------- コンテキスト ---------- */

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const server =
    isServerMode();

  const be =
    backend();

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  /**
   * 管理者判定
   *
   * Firebase / Supabase 接続時：
   *   user.id が ADMIN_UID と完全一致する場合だけ admin
   *
   * ローカルモード：
   *   従来どおり role === 'admin'
   */
  const isAdmin =
    server
      ? (
          !!user &&
          !!ADMIN_UID &&
          user.id === ADMIN_UID
        )
      : user?.role === 'admin';

  /**
   * サーバーモードでは、Vercelに登録した管理者UIDと一致する
   * 1アカウントだけをログイン状態として受け入れる。
   *
   * 別アカウントでFirebase認証自体が成功しても、
   * ここで即ログアウトしてO.HOMEにはログイン状態を残さない。
   */
  const acceptServerUser = useCallback(
    async (next: User | null): Promise<boolean> => {
      if (!next) {
        setUser(null);
        return false;
      }

      if (!ADMIN_UID || next.id !== ADMIN_UID) {
        setUser(null);

        try {
          await be?.signOut();
        } catch {
          /* 無視 */
        }

        return false;
      }

      setUser({
        ...next,
        role: 'admin',
      });

      return true;
    },
    [be]
  );

  useEffect(() => {
    if (
      !server ||
      !be
    ) {
      try {
        const raw =
          localStorage.getItem(
            MOCK_KEY
          );

        if (raw) {
          setUser(
            JSON.parse(raw)
          );
        }
      } catch {
        /* 無視 */
      }

      return;
    }

    let alive = true;

    void be
      .currentUser()
      .then(async u => {
        if (!alive) return;

        await acceptServerUser(
          u as User | null
        );
      });

    const off =
      be.onAuthChange(
        u => {
          if (!alive) return;

          void acceptServerUser(
            u as User | null
          );
        }
      );

    return () => {
      alive = false;
      off();
    };
  }, [
    server,
    be,
    acceptServerUser,
  ]);

  const login =
    useCallback(
      async (
        id: string,
        password: string
      ): Promise<Result> => {
        if (
          server &&
          be
        ) {
          const r =
            await be.signIn(
              id.trim(),
              password
            );

          if (!r.ok) {
            return {
              ok: false,
              error:
                r.error ??
                'ログインに失敗しました。',
            };
          }

          const current =
            await be.currentUser();

          const allowed =
            await acceptServerUser(
              current as User | null
            );

          if (!allowed) {
            return {
              ok: false,
              error:
                'このアカウントではログインできません。',
            };
          }

          return {
            ok: true,
          };
        }

        const acc =
          mockRegistry()[id] ??
          (
            isSetupDone()
              ? undefined
              : MOCK_ACCOUNTS[id]
          );

        if (
          !acc ||
          acc.password !== password
        ) {
          return {
            ok: false,
            error:
              'IDまたはパスワードが正しくありません。',
          };
        }

        setUser(
          acc.user
        );

        try {
          localStorage.setItem(
            MOCK_KEY,
            JSON.stringify(
              acc.user
            )
          );
        } catch {
          /* 無視 */
        }

        return {
          ok: true,
        };
      },
      [
        server,
        be,
        acceptServerUser,
      ]
    );

  const loginWithGoogle =
    useCallback(
      async (): Promise<Result> => {
        if (
          !server ||
          !be
        ) {
          return {
            ok: false,
            error:
              'GoogleログインにはFirebase接続が必要です。',
          };
        }

        if (
          !be.signInWithGoogle
        ) {
          return {
            ok: false,
            error:
              '現在のバックエンドではGoogleログインを使用できません。',
          };
        }

        const r =
          await be.signInWithGoogle();

        if (!r.ok) {
          return {
            ok: false,
            error:
              r.error ??
              'Googleログインに失敗しました。',
          };
        }

        try {
          const u =
            await be.currentUser();

          const allowed =
            await acceptServerUser(
              u as User | null
            );

          if (!allowed) {
            return {
              ok: false,
              error:
                'このアカウントではログインできません。',
            };
          }
        } catch {
          return {
            ok: false,
            error:
              'ログイン状態を確認できませんでした。',
          };
        }

        return {
          ok: true,
        };
      },
      [
        server,
        be,
        acceptServerUser,
      ]
    );

  /* ---------- 会員登録 ---------- */

  const signup =
    useCallback(
      async (
        id: string,
        password: string,
        nickname: string,
        code: string
      ): Promise<Result> => {
        if (
          !id ||
          !password ||
          !nickname
        ) {
          return {
            ok: false,
            error:
              'ID・パスワード・ニックネームをすべて入力してください。',
          };
        }

        if (
          code !== inviteCode()
        ) {
          return {
            ok: false,
            error:
              '招待コードが正しくありません。',
          };
        }

        if (
          server &&
          be
        ) {
          return {
            ok: false,
            error:
              'このサイトでは新規会員登録を受け付けていません。',
          };
        }

        if (
          MOCK_ACCOUNTS[id] ||
          mockRegistry()[id]
        ) {
          return {
            ok: false,
            error:
              'すでに使用されているIDです。',
          };
        }

        const reg =
          mockRegistry();

        reg[id] = {
          password,

          user: {
            id,
            nickname,
            role: 'member',
          },
        };

        try {
          localStorage.setItem(
            MOCK_REG_KEY,
            JSON.stringify(reg)
          );
        } catch {
          /* 無視 */
        }

        return {
          ok: true,
        };
      },
      [
        server,
        be,
      ]
    );

  /* ---------- ID確認 ---------- */

  const findId =
    useCallback(
      async (
        email: string
      ): Promise<
        Result & {
          foundId?: string;
        }
      > => {
        if (
          !email.trim()
        ) {
          return {
            ok: false,
            error:
              'メールアドレスを入力してください。',
          };
        }

        if (server) {
          return {
            ok: false,
            error:
              'メールアドレスがそのままIDです。そのままログインしてください。',
          };
        }

        const hit =
          Object.values(
            mockRegistry()
          ).find(
            a =>
              a.user.email?.toLowerCase() ===
              email
                .trim()
                .toLowerCase()
          );

        return hit
          ? {
              ok: true,
              foundId:
                hit.user.id,
            }
          : {
              ok: false,
              error:
                'このメールアドレスで登録されたアカウントはありません。',
            };
      },
      [
        server,
      ]
    );

  /* ---------- パスワード再設定 ---------- */

  const resetPassword =
    useCallback(
      async (
        email: string
      ): Promise<
        Result & {
          tempPassword?: string;
        }
      > => {
        if (
          !email.trim()
        ) {
          return {
            ok: false,
            error:
              'メールアドレスを入力してください。',
          };
        }

        if (
          server &&
          be
        ) {
          const r =
            await be.resetPassword(
              email.trim()
            );

          return r.ok
            ? {
                ok: true,
              }
            : {
                ok: false,
                error:
                  r.error,
              };
        }

        const reg =
          mockRegistry();

        const hit =
          Object.entries(
            reg
          ).find(
            (
              [, a]
            ) =>
              a.user.email?.toLowerCase() ===
              email
                .trim()
                .toLowerCase()
          );

        if (!hit) {
          return {
            ok: false,
            error:
              'このメールアドレスで登録されたアカウントはありません。',
          };
        }

        const temp =
          Math.random()
            .toString(36)
            .slice(2, 8);

        reg[hit[0]] = {
          ...hit[1],
          password: temp,
        };

        try {
          localStorage.setItem(
            MOCK_REG_KEY,
            JSON.stringify(reg)
          );
        } catch {
          /* 無視 */
        }

        return {
          ok: true,
          tempPassword: temp,
        };
      },
      [
        server,
        be,
      ]
    );

  /* ---------- プロフィール ---------- */

  const updateProfile =
    useCallback(
      async (
        patch: {
          nickname?: string;
          avatarUrl?: string | null;
          avatarColor?: string | null;
          currentPassword?: string;
          newPassword?: string;
        }
      ): Promise<Result> => {
        if (!user) {
          return {
            ok: false,
            error:
              'ログインが必要です。',
          };
        }

        if (
          server &&
          be
        ) {
          const r =
            await be.updateProfile(
              patch
            );

          if (!r.ok) {
            return r;
          }

          setUser(
            u =>
              u
                ? {
                    ...u,

                    nickname:
                      patch.nickname?.trim() ||
                      u.nickname,

                    avatarUrl:
                      patch.avatarUrl === null
                        ? undefined
                        : (
                            patch.avatarUrl ??
                            u.avatarUrl
                          ),

                    avatarColor:
                      patch.avatarColor === null
                        ? undefined
                        : (
                            patch.avatarColor ??
                            u.avatarColor
                          ),
                  }
                : u
          );

          return {
            ok: true,
          };
        }

        const reg =
          mockRegistry();

        const cur =
          reg[user.id] ??
          (
            isSetupDone()
              ? undefined
              : MOCK_ACCOUNTS[
                  user.id
                ]
          );

        if (!cur) {
          return {
            ok: false,
            error:
              'アカウントが見つかりません。',
          };
        }

        if (
          patch.newPassword &&
          patch.currentPassword !==
            cur.password
        ) {
          return {
            ok: false,
            error:
              '現在のパスワードが正しくありません。',
          };
        }

        const nextUser: User = {
          ...cur.user,

          nickname:
            patch.nickname?.trim() ||
            cur.user.nickname,

          avatarUrl:
            patch.avatarUrl === null
              ? undefined
              : (
                  patch.avatarUrl ??
                  cur.user.avatarUrl
                ),

          avatarColor:
            patch.avatarColor === null
              ? undefined
              : (
                  patch.avatarColor ??
                  cur.user.avatarColor
                ),
        };

        reg[user.id] = {
          password:
            patch.newPassword ||
            cur.password,

          user:
            nextUser,
        };

        try {
          localStorage.setItem(
            MOCK_REG_KEY,
            JSON.stringify(reg)
          );

          localStorage.setItem(
            MOCK_KEY,
            JSON.stringify(
              nextUser
            )
          );
        } catch {
          /* 無視 */
        }

        setUser(
          nextUser
        );

        return {
          ok: true,
        };
      },
      [
        server,
        be,
        user,
      ]
    );

  /* ---------- ログアウト ---------- */

  const logout =
    useCallback(
      async () => {
        if (
          server &&
          be
        ) {
          await be.signOut();

          setUser(
            null
          );

          return;
        }

        setUser(
          null
        );

        try {
          localStorage.removeItem(
            MOCK_KEY
          );
        } catch {
          /* 無視 */
        }
      },
      [
        server,
        be,
      ]
    );

  /**
   * 管理者なら body.admin
   *
   * 今まで：
   * user.role === 'admin'
   *
   * 変更後：
   * Firebase接続時は
   * ADMIN_UID と user.id が一致した場合だけ admin
   */
  useEffect(() => {
    document.body.classList.toggle(
      'admin',
      isAdmin
    );

    setCurrentUserId(
      user?.id ?? null
    );
  }, [
    user,
    isAdmin,
  ]);

  return (
    <Ctx.Provider
      value={{
        user,
        isAdmin,

        login,
        loginWithGoogle,
        signup,
        findId,
        resetPassword,
        logout,
        updateProfile,

        mock: !server,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx =
    useContext(Ctx);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}
