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

type CloudinaryUsageValue = {
  usage?: number;
  limit?: number;
  used_percent?: number;
};

type CloudinaryUsageResponse = {
  storage?: CloudinaryUsageValue;
  credits?: CloudinaryUsageValue;
  bandwidth?: CloudinaryUsageValue;
  transformations?: CloudinaryUsageValue;
  resources?: number;
  plan?: string;
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

function getCloudinaryConfig() {
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
      'Cloudinaryの管理用設定が不足しています。'
    );
  }

  const auth = Buffer.from(
    `${apiKey}:${apiSecret}`
  ).toString('base64');

  return {
    cloudName,
    auth,
  };
}

/**
 * 自分の画像だけを数える。
 * samples/ はCloudinary初期サンプルなので除外。
 */
async function fetchStoredImages() {
  const {
    cloudName,
    auth,
  } = getCloudinaryConfig();

  let nextCursor:
    | string
    | undefined;

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

    const response =
      await fetch(
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

/**
 * Cloudinary公式のUsage API。
 * アカウント側のStorage上限・使用率などを取得。
 */
async function fetchOfficialUsage() {
  const {
    cloudName,
    auth,
  } = getCloudinaryConfig();

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/usage`,
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
    (await response.json()) as CloudinaryUsageResponse;

  if (!response.ok) {
    throw new Error(
      result.error?.message ??
        `Cloudinary使用状況を取得できませんでした（HTTP ${response.status}）。`
    );
  }

  return result;
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

    const [
      stored,
      official,
    ] = await Promise.all([
      fetchStoredImages(),
      fetchOfficialUsage(),
    ]);

    const storageUsage =
      typeof official.storage?.usage ===
        'number'
        ? official.storage.usage
        : null;

    const storageLimit =
      typeof official.storage?.limit ===
        'number'
        ? official.storage.limit
        : null;

    const storagePercent =
      typeof official.storage
        ?.used_percent === 'number'
        ? official.storage
            .used_percent
        : (
            storageUsage !== null &&
            storageLimit !== null &&
            storageLimit > 0
          )
          ? (
              storageUsage /
              storageLimit
            ) * 100
          : null;

    return NextResponse.json({
      ok: true,

      // 自分でアップした画像
      imageCount:
        stored.imageCount,
      totalBytes:
        stored.totalBytes,

      // Cloudinary公式の使用状況
      storageUsage,
      storageLimit,
      storagePercent,

      plan:
        official.plan ?? null,

      credits:
        official.credits ?? null,
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
