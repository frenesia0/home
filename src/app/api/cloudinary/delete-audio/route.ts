import {
  NextRequest,
  NextResponse,
} from 'next/server';

import crypto from 'crypto';


type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
  }>;

  error?: {
    message?: string;
  };
};


type CloudinaryDestroyResponse = {
  result?: string;

  error?: {
    message?: string;
  };
};


async function verifyAdminToken(
  token: string
): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: string;
    }
> {
  const firebaseApiKey =
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY
      ?.trim();

  const adminUid =
    process.env
      .NEXT_PUBLIC_ADMIN_UID
      ?.trim();

  if (!firebaseApiKey) {
    return {
      ok: false,
      reason:
        'Vercelに NEXT_PUBLIC_FIREBASE_API_KEY が設定されていません。',
    };
  }

  if (!adminUid) {
    return {
      ok: false,
      reason:
        'Vercelに NEXT_PUBLIC_ADMIN_UID が設定されていません。',
    };
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
          firebaseApiKey
        )}`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              idToken:
                token,
            }),

          cache:
            'no-store',
        }
      );
  } catch (
    error
  ) {
    return {
      ok: false,
      reason:
        error instanceof
        Error
          ? `Firebaseへの認証確認通信に失敗しました：${error.message}`
          : 'Firebaseへの認証確認通信に失敗しました。',
    };
  }

  let result:
    FirebaseLookupResponse;

  try {
    result =
      (await response.json()) as
        FirebaseLookupResponse;
  } catch {
    return {
      ok: false,
      reason:
        `Firebaseの認証確認結果を読み取れませんでした（HTTP ${response.status}）。`,
    };
  }

  if (
    !response.ok
  ) {
    return {
      ok: false,
      reason:
        `Firebase認証確認エラー（HTTP ${response.status}）：${
          result.error
            ?.message ??
          '詳細不明'
        }`,
    };
  }

  const uid =
    result.users?.[0]
      ?.localId
      ?.trim() ??
    '';

  if (!uid) {
    return {
      ok: false,
      reason:
        'FirebaseからログインユーザーのUIDを取得できませんでした。',
    };
  }

  if (
    uid !==
    adminUid
  ) {
    return {
      ok: false,
      reason:
        'ログイン中のFirebase UIDと、Vercelの管理者UIDが一致していません。',
    };
  }

  return {
    ok: true,
  };
}


function getPublicIdFromCloudinaryAudioUrl(
  value: string
): string {
  let url:
    URL;

  try {
    url =
      new URL(
        value
      );
  } catch {
    throw new Error(
      'Cloudinary音源URLの形式が正しくありません。'
    );
  }

  if (
    url.hostname !==
    'res.cloudinary.com'
  ) {
    throw new Error(
      'Cloudinary以外の音源URLは削除できません。'
    );
  }

  const marker =
    '/video/upload/';

  const markerIndex =
    url.pathname.indexOf(
      marker
    );

  if (
    markerIndex <
    0
  ) {
    throw new Error(
      'Cloudinary音源URLからpublic_idを取得できませんでした。'
    );
  }

  let path =
    url.pathname.slice(
      markerIndex +
        marker.length
    );

  path =
    decodeURIComponent(
      path
    );

  /*
   * Cloudinary URL:
   * /video/upload/v1234567890/folder/name.mp3
   *
   * version部分はpublic_idではないので除外。
   */
  path =
    path.replace(
      /^v\d+\//,
      ''
    );

  /*
   * 最後の拡張子だけ除外する。
   * フォルダ名やファイル名中の "." は保持する。
   */
  path =
    path.replace(
      /\.[^/.]+$/,
      ''
    );

  const publicId =
    path.trim();

  if (!publicId) {
    throw new Error(
      'Cloudinary音源のpublic_idが空です。'
    );
  }

  return publicId;
}


async function destroyCloudinaryAudio(
  audioUrl:
    string
): Promise<void> {
  const cloudName =
    process.env
      .CLOUDINARY_CLOUD_NAME
      ?.trim();

  const apiKey =
    process.env
      .CLOUDINARY_API_KEY
      ?.trim();

  const apiSecret =
    process.env
      .CLOUDINARY_API_SECRET
      ?.trim();

  if (
    !cloudName ||
    !apiKey ||
    !apiSecret
  ) {
    throw new Error(
      'Cloudinaryの管理用設定が不足しています。'
    );
  }

  const publicId =
    getPublicIdFromCloudinaryAudioUrl(
      audioUrl
    );

  const timestamp =
    Math.floor(
      Date.now() /
        1000
    );

  const signature =
    crypto
      .createHash(
        'sha1'
      )
      .update(
        `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
      )
      .digest(
        'hex'
      );

  const form =
    new URLSearchParams();

  form.set(
    'public_id',
    publicId
  );

  form.set(
    'timestamp',
    String(
      timestamp
    )
  );

  form.set(
    'api_key',
    apiKey
  );

  form.set(
    'signature',
    signature
  );

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/video/destroy`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body:
          form.toString(),

        cache:
          'no-store',
      }
    );

  const result =
    (await response.json()) as
      CloudinaryDestroyResponse;

  if (
    !response.ok
  ) {
    throw new Error(
      result.error
        ?.message ??
        `Cloudinary音源を削除できませんでした（HTTP ${response.status}）。`
    );
  }

  /*
   * "not found" は既に消えている場合もあるので
   * 削除済みと同等に扱う。
   */
  if (
    result.result !==
      'ok' &&
    result.result !==
      'not found'
  ) {
    throw new Error(
      `Cloudinary音源の削除結果が不明です：${
        result.result ??
        '詳細不明'
      }`
    );
  }
}


export async function POST(
  request:
    NextRequest
) {
  try {
    const authHeader =
      request.headers.get(
        'authorization'
      );

    const token =
      authHeader
        ?.startsWith(
          'Bearer '
        )
        ? authHeader
            .slice(7)
            .trim()
        : '';

    if (!token) {
      return NextResponse.json(
        {
          error:
            'ログイン情報がありません。',
        },
        {
          status:
            401,
        }
      );
    }

    const verification =
      await verifyAdminToken(
        token
      );

    if (
      !verification.ok
    ) {
      return NextResponse.json(
        {
          error:
            verification.reason,
        },
        {
          status:
            403,
        }
      );
    }

    const body =
      (await request.json()) as {
        audioUrl?: unknown;
      };

    const audioUrl =
      typeof body.audioUrl ===
        'string'
        ? body.audioUrl.trim()
        : '';

    if (!audioUrl) {
      return NextResponse.json(
        {
          error:
            '削除するCloudinary音源URLがありません。',
        },
        {
          status:
            400,
        }
      );
    }

    await destroyCloudinaryAudio(
      audioUrl
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (
    error
  ) {
    console.error(
      'Cloudinary audio delete failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Cloudinary音源の削除に失敗しました。',
      },
      {
        status:
          500,
      }
    );
  }
}
