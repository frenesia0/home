import { NextRequest, NextResponse } from 'next/server';

type ScanRequestBody = {
  usedPublicIds?: string[];
};

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
  secure_url?: string;
  format?: string;
  bytes?: number;
  created_at?: string;
};

type CloudinaryResourcesResponse = {
  resources?: CloudinaryResource[];
  next_cursor?: string;
  error?: {
    message?: string;
  };
};

type OrphanImage = {
  publicId: string;
  url: string;
  format?: string;
  bytes?: number;
  createdAt?: string;
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
          result.error?.message ?? '詳細不明'
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

  return { ok: true };
}

async function fetchAllCloudinaryImages(): Promise<
  OrphanImage[]
> {
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

  const auth =
    Buffer.from(
      `${apiKey}:${apiSecret}`
    ).toString('base64');

  const all: OrphanImage[] = [];
  let nextCursor: string | undefined;

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

    for (const resource of result.resources ?? []) {
      const publicId =
        resource.public_id?.trim();

      if (!publicId) continue;

      all.push({
        publicId,
        url:
          resource.secure_url ?? '',
        format:
          resource.format,
        bytes:
          resource.bytes,
        createdAt:
          resource.created_at,
      });
    }

    nextCursor =
      result.next_cursor;
  } while (nextCursor);

  return all;
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

    const body =
      (await request.json()) as ScanRequestBody;

    const usedPublicIds =
      new Set(
        (
          body.usedPublicIds ?? []
        )
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                'string' &&
              value.trim().length > 0
          )
          .map(
            value =>
              value.trim()
          )
      );

    const cloudinaryImages =
      await fetchAllCloudinaryImages();

    const orphans =
  cloudinaryImages.filter(
    image =>
      !usedPublicIds.has(image.publicId) &&
      !image.publicId.startsWith('samples/')
  );

    return NextResponse.json({
      ok: true,
      total:
        cloudinaryImages.length,
      used:
        cloudinaryImages.length -
        orphans.length,
      orphanCount:
        orphans.length,
      orphans,
    });
  } catch (error) {
    console.error(
      'Cloudinary orphan scan failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '未使用画像の確認に失敗しました。',
      },
      {
        status: 500,
      }
    );
  }
}
