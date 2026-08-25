import {
  NextRequest,
  NextResponse,
} from 'next/server';

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
  }>;
  error?: {
    message?: string;
  };
};

type CloudinaryResource = {
  public_id?: string;
  bytes?: number;
};

type CloudinaryResourcesResponse = {
  resources?: CloudinaryResource[];
  next_cursor?: string;
  error?: {
    message?: string;
  };
};

async function verifyAdminToken(
  token: string
): Promise<
  | { ok: true }
  | { ok: false; reason: string }
> {
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
          'Content-Type':
            'application/json',
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
    result.users?.[0]?.localId?.trim() ??
    '';

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

  return { ok: true };
}

async function fetchCloudinaryUsage() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim();

  const apiKey =
    process.env.CLOUDINARY_API_KEY?.trim();

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinaryの管理用設定が不足しています。'
    );
  }

  const auth = Buffer.from(
    `${apiKey}:${apiSecret}`
  ).toString('base64');

  let nextCursor: string | undefined;

  let imageCount = 0;
  let totalBytes = 0;

  do {
    const params =
      new URLSearchParams();

    params.set(
      'max_results',
      '500'
    );

    if (nextCursor) {
      params.set(
        'next_cursor',
        nextCursor
      );
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/resources/image/upload?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization:
            `Basic ${auth}`,
        },
        cache: 'no-store',
      }
    );

    const result =
      (await response.json()) as CloudinaryResourcesResponse;

    if (!response.ok) {
      throw new Error(
        result.error?.message ??
          `Cloudinary画像一覧を取得できませんでした（HTTP ${response.status}）。`
      );
    }

    for (
      const resource of
      result.resources ?? []
    ) {
      const publicId =
        resource.public_id?.trim();

      if (!publicId) {
        continue;
      }

      // Cloudinaryが最初から用意している
      // samples フォルダは容量計算から除外
      if (
        publicId.startsWith(
          'samples/'
        )
      ) {
        continue;
      }

      imageCount += 1;

      if (
        typeof resource.bytes ===
          'number' &&
        Number.isFinite(
          resource.bytes
        )
      ) {
        totalBytes +=
          resource.bytes;
      }
    }

    nextCursor =
      result.next_cursor;
  } while (nextCursor);

  return {
    imageCount,
    totalBytes,
  };
}

export async function GET(
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
          status: 401,
        }
      );
    }

    const verification =
      await verifyAdminToken(
        token
      );

    if (!verification.ok) {
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

    const usage =
      await fetchCloudinaryUsage();

    return NextResponse.json({
      ok: true,
      imageCount:
        usage.imageCount,
      totalBytes:
        usage.totalBytes,
    });
  } catch (error) {
    console.error(
      'Cloudinary usage check failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Cloudinaryの使用容量を取得できませんでした。',
      },
      {
        status: 500,
      }
    );
  }
}
