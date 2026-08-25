import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

type DeleteRequestBody = {
  publicIds?: string[];
};

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

type VerifyResult =
  | {
      ok: true;
      uid: string;
    }
  | {
      ok: false;
      reason: string;
    };

async function verifyAdminToken(
  token: string
): Promise<VerifyResult> {
  const firebaseApiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();

  const adminUid =
    process.env.NEXT_PUBLIC_ADMIN_UID?.trim();

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

  let response: Response;

  try {
    response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        firebaseApiKey
      )}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: token,
        }),
        cache: 'no-store',
      }
    );
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `Firebaseへの認証確認通信に失敗しました：${error.message}`
          : 'Firebaseへの認証確認通信に失敗しました。',
    };
  }

  let result: FirebaseLookupResponse;

  try {
    result =
      (await response.json()) as FirebaseLookupResponse;
  } catch {
    return {
      ok: false,
      reason:
        `Firebaseの認証確認結果を読み取れませんでした（HTTP ${response.status}）。`,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason:
        `Firebase認証確認エラー（HTTP ${response.status}）：${
          result.error?.message ??
          '詳細不明'
        }`,
    };
  }

  const uid =
    result.users?.[0]?.localId?.trim() ?? '';

  if (!uid) {
    return {
      ok: false,
      reason:
        'FirebaseからログインユーザーのUIDを取得できませんでした。',
    };
  }

  if (uid !== adminUid) {
    return {
      ok: false,
      reason:
        'ログイン中のFirebase UIDと、Vercelの管理者UIDが一致していません。',
    };
  }

  return {
    ok: true,
    uid,
  };
}

function createCloudinarySignature(
  publicId: string,
  timestamp: number,
  apiSecret: string
) {
  const signatureBase =
    `invalidate=true&public_id=${publicId}&timestamp=${timestamp}`;

  return createHash('sha1')
    .update(
      `${signatureBase}${apiSecret}`
    )
    .digest('hex');
}

async function deleteCloudinaryImage(
  publicId: string
): Promise<void> {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim();

  const apiKey =
    process.env.CLOUDINARY_API_KEY?.trim();

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET?.trim();

  if (
    !cloudName ||
    !apiKey ||
    !apiSecret
  ) {
    throw new Error(
      'Cloudinaryの削除用設定が不足しています。'
    );
  }

  const timestamp =
    Math.floor(Date.now() / 1000);

  const signature =
    createCloudinarySignature(
      publicId,
      timestamp,
      apiSecret
    );

  const form =
    new URLSearchParams();

  form.set(
    'public_id',
    publicId
  );

  form.set(
    'timestamp',
    String(timestamp)
  );

  form.set(
    'api_key',
    apiKey
  );

  form.set(
    'signature',
    signature
  );

  form.set(
    'invalidate',
    'true'
  );

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        cache: 'no-store',
      }
    );

  const result =
    (await response.json()) as CloudinaryDestroyResponse;

  if (
    !response.ok ||
    (
      result.result !== 'ok' &&
      result.result !== 'not found'
    )
  ) {
    throw new Error(
      result.error?.message ||
        `Cloudinary画像「${publicId}」を削除できませんでした。`
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const authHeader =
      request.headers.get(
        'authorization'
      );

    const token =
      authHeader?.startsWith(
        'Bearer '
      )
        ? authHeader.slice(7).trim()
        : '';

    if (!token) {
      return NextResponse.json(
        {
          error:
            '削除APIにFirebaseのログイン情報が届いていません。',
        },
        {
          status: 401,
        }
      );
    }

    const verification =
      await verifyAdminToken(
        token
      );

    if (!verification.ok) {
      console.error(
        '[gallery delete] admin verification failed:',
        verification.reason
      );

      return NextResponse.json(
        {
          error:
            verification.reason,
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as DeleteRequestBody;

    const publicIds =
      Array.from(
        new Set(
          (
            body.publicIds ??
            []
          )
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                  'string' &&
                value.trim()
                  .length > 0
            )
            .map(
              (value) =>
                value.trim()
            )
        )
      );

    if (
      publicIds.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        deleted: [],
      });
    }

    const deleted:
      string[] = [];

    for (
      const publicId of
      publicIds
    ) {
      await deleteCloudinaryImage(
        publicId
      );

      deleted.push(
        publicId
      );
    }

    return NextResponse.json({
      ok: true,
      deleted,
    });
  } catch (err) {
    console.error(
      'Cloudinary delete failed:',
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : '画像の削除に失敗しました。',
      },
      {
        status: 500,
      }
    );
  }
}
