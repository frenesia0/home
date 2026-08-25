'use client';

// サムネイル用トリミングエディター。
// 元画像そのものは変更せず、表示位置と拡大率だけを保存する。
// 拡大範囲は 1倍〜15倍（100%〜1500%）。

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useBlobUrl } from '@/lib/blobStore';

/** x・y = フレームサイズに対する中心位置のずれ、scale = 拡大率 */
export interface CropValue {
  x: number;
  y: number;
  scale: number;
}

export type CropAspect = '3:4' | '4:3' | '16:9' | '1:1';

const RATIO: Record<CropAspect, number> = {
  '3:4': 3 / 4,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '1:1': 1,
};

/** 最大拡大率。15 = 1500% */
const MAX_SCALE = 15;

/**
 * 元画像の比率を保ったまま、指定したトリミング位置で表示する。
 */
export function coverImgStyle(
  crop: CropValue | undefined,
  wide: boolean
): React.CSSProperties {
  const c = crop ?? {
    x: 0,
    y: 0,
    scale: 1,
  };

  return {
    position: 'absolute',
    left: `${(0.5 + c.x) * 100}%`,
    top: `${(0.5 + c.y) * 100}%`,
    transform: 'translate(-50%,-50%)',
    maxWidth: 'none',
    ...(wide
      ? {
          height: `${c.scale * 100}%`,
          width: 'auto',
        }
      : {
          width: `${c.scale * 100}%`,
          height: 'auto',
        }),
  };
}

/**
 * トリミング設定を反映して画像を表示する。
 * 親要素いっぱいに表示し、元画像の比率から自動で縦横を判定する。
 */
export function CropImg({
  src,
  crop,
  alt,
}: {
  src: string;
  crop?: CropValue;
  alt?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const natRef = useRef<{ w: number; h: number } | null>(null);
  const [wide, setWide] = useState<boolean | null>(null);

  const compute = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const natural = natRef.current;

    if (
      rect &&
      natural &&
      rect.width > 1 &&
      rect.height > 1
    ) {
      setWide(
        natural.w / natural.h >=
          rect.width / rect.height
      );
    }
  };

  useEffect(() => {
    compute();

    const element = wrapRef.current;

    if (
      !element ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    const observer = new ResizeObserver(compute);
    observer.observe(element);

    return () => observer.disconnect();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ''}
        draggable={false}
        onLoad={(event) => {
          const image = event.currentTarget;

          natRef.current = {
            w: image.naturalWidth,
            h: image.naturalHeight,
          };

          compute();
        }}
        style={
          wide == null
            ? { opacity: 0 }
            : coverImgStyle(crop, wide)
        }
      />
    </div>
  );
}

/**
 * 保存済みファイル参照とトリミング情報を使って画像を表示する。
 * 画像がなければプレースホルダーを表示する。
 */
export function CroppedBlobImg({
  fileRef,
  crop,
  ph,
  label,
  alt,
}: {
  fileRef?: string;
  crop?: CropValue;
  ph?: string;
  label?: string;
  alt?: string;
}) {
  const url = useBlobUrl(fileRef);

  if (!url) {
    return (
      <div
        className={`ph ${ph ?? ''}`}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        {label && <span>{label}</span>}
      </div>
    );
  }

  return (
    <CropImg
      src={url}
      crop={crop}
      alt={alt}
    />
  );
}

export function CropEditor({
  open,
  src,
  aspect,
  aspectLabel,
  initial,
  onClose,
  onApply,
}: {
  open: boolean;
  src: string;
  aspect: CropAspect | number;
  aspectLabel?: string;
  initial?: CropValue;
  onClose: () => void;
  onApply: (crop: CropValue) => void;
}) {
  const [crop, setCrop] = useState<CropValue>(
    initial ?? {
      x: 0,
      y: 0,
      scale: 1,
    }
  );

  const frameRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  const [naturalRatio, setNaturalRatio] =
    useState<number | null>(null);

  const frameRatio =
    typeof aspect === 'number'
      ? aspect
      : RATIO[aspect];

  const aspectText =
    aspectLabel ??
    (typeof aspect === 'number'
      ? `${aspect.toFixed(2)}:1`
      : aspect);

  const wide =
    naturalRatio != null
      ? naturalRatio >= frameRatio
      : true;

  useEffect(() => {
    if (open) {
      setCrop(
        initial ?? {
          x: 0,
          y: 0,
          scale: 1,
        }
      );
    }
  }, [open, initial]);

  /**
   * 空白が見えないように位置と拡大率を制限する。
   */
  const clamp = (value: CropValue): CropValue => {
    const scale = Math.min(
      MAX_SCALE,
      Math.max(1, value.scale)
    );

    if (naturalRatio == null) {
      return {
        ...value,
        scale,
      };
    }

    const coverWidth =
      wide
        ? naturalRatio / frameRatio
        : 1;

    const coverHeight =
      wide
        ? 1
        : frameRatio / naturalRatio;

    const maxX = Math.max(
      0,
      (scale * coverWidth - 1) / 2
    );

    const maxY = Math.max(
      0,
      (scale * coverHeight - 1) / 2
    );

    return {
      scale,
      x: Math.min(
        maxX,
        Math.max(-maxX, value.x)
      ),
      y: Math.min(
        maxY,
        Math.max(-maxY, value.y)
      ),
    };
  };

  /**
   * 画像をドラッグして位置を調整する。
   */
  const onPan = (
    event: React.PointerEvent
  ) => {
    event.preventDefault();

    const rect =
      frameRef.current!.getBoundingClientRect();

    const startX = event.clientX;
    const startY = event.clientY;

    const baseX = crop.x;
    const baseY = crop.y;

    const move = (
      pointerEvent: PointerEvent
    ) => {
      setCrop((current) =>
        clamp({
          ...current,
          x:
            baseX +
            (pointerEvent.clientX - startX) /
              rect.width,
          y:
            baseY +
            (pointerEvent.clientY - startY) /
              rect.height,
        })
      );
    };

    const end = () => {
      window.removeEventListener(
        'pointermove',
        move
      );

      window.removeEventListener(
        'pointerup',
        end
      );
    };

    window.addEventListener(
      'pointermove',
      move
    );

    window.addEventListener(
      'pointerup',
      end
    );
  };

  /**
   * スライダー位置から拡大率を決める。
   */
  const setZoomFromPointer = (
    clientX: number
  ) => {
    const rect =
      zoomRef.current!.getBoundingClientRect();

    const t = Math.min(
      1,
      Math.max(
        0,
        (clientX - rect.left) /
          rect.width
      )
    );

    setCrop((current) =>
      clamp({
        ...current,
        scale:
          1 +
          t * (MAX_SCALE - 1),
      })
    );
  };

  const onZoomDrag = (
    event: React.PointerEvent
  ) => {
    event.preventDefault();

    setZoomFromPointer(event.clientX);

    const move = (
      pointerEvent: PointerEvent
    ) => {
      setZoomFromPointer(
        pointerEvent.clientX
      );
    };

    const end = () => {
      window.removeEventListener(
        'pointermove',
        move
      );

      window.removeEventListener(
        'pointerup',
        end
      );
    };

    window.addEventListener(
      'pointermove',
      move
    );

    window.addEventListener(
      'pointerup',
      end
    );
  };

  /**
   * 現在の拡大率をスライダー上の0〜100%へ変換する。
   */
  const zoomPercent =
    ((crop.scale - 1) /
      (MAX_SCALE - 1)) *
    100;

  const changeZoomBy = (delta: number) => {
    setCrop((current) =>
      clamp({
        ...current,
        scale:
          Math.round(
            (current.scale + delta) * 10
          ) / 10,
      })
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="サムネイル範囲を調整"
      desc={`比率 ${aspectText} — ドラッグで位置調整、スライダーやホイールで拡大できます。最大1500%まで拡大できます。`}
      actions={
        <>
          <button
            className="btn btn-ghost"
            onClick={onClose}
          >
            キャンセル
          </button>

          <button
            className="btn btn-dark"
            onClick={() =>
              onApply(crop)
            }
          >
            適用
          </button>
        </>
      }
    >
      <div
        ref={frameRef}
        className="crop-frame"
        style={{
          aspectRatio:
            String(frameRatio),
          width: `min(100%, ${Math.round(
            480 * frameRatio
          )}px)`,
          margin: '0 auto',
        }}
        onPointerDown={onPan}
        onWheel={(event) => {
          event.preventDefault();

          setCrop((current) =>
            clamp({
              ...current,
              scale:
                current.scale -
                Math.sign(
                  event.deltaY
                ) *
                  0.15,
            })
          );
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={coverImgStyle(
            crop,
            wide
          )}
          onLoad={(event) => {
            const image =
              event.currentTarget;

            if (
              image.naturalHeight >
              0
            ) {
              setNaturalRatio(
                image.naturalWidth /
                  image.naturalHeight
              );
            }
          }}
        />

        <div className="grid-ov" />
      </div>

      <div className="crop-foot">
        <span
          style={{
            fontSize: 11,
            color:
              'var(--faint)',
            minWidth: 72,
          }}
        >
          拡大{' '}
          {(crop.scale * 100).toFixed(1)}
          %
        </span>

        <button
          type="button"
          className="btn btn-ghost"
          aria-label="10%縮小"
          title="10%縮小"
          onClick={() =>
            changeZoomBy(-0.1)
          }
          disabled={crop.scale <= 1}
          style={{
            width: 34,
            height: 30,
            padding: 0,
            fontSize: 17,
            lineHeight: 1,
          }}
        >
          −
        </button>

        <div
          ref={zoomRef}
          onPointerDown={
            onZoomDrag
          }
          style={{
            flex: 1,
            maxWidth: 260,
            height: 4,
            borderRadius: 4,
            background:
              '#d7dae0',
            position:
              'relative',
            cursor:
              'var(--cur-pointer,pointer)',
          }}
        >
          <i
            style={{
              position:
                'absolute',
              left: 0,
              top: 0,
              height: '100%',
              borderRadius: 4,
              width: `${zoomPercent}%`,
              background:
                'var(--accent)',
            }}
          />

          <i
            style={{
              position:
                'absolute',
              top: '50%',
              left: `${zoomPercent}%`,
              width: 14,
              height: 14,
              borderRadius:
                '50%',
              background:
                '#fff',
              transform:
                'translate(-50%,-50%)',
              boxShadow:
                '0 1px 5px rgba(0,0,0,.35)',
            }}
          />
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          aria-label="10%拡大"
          title="10%拡大"
          onClick={() =>
            changeZoomBy(0.1)
          }
          disabled={
            crop.scale >= MAX_SCALE
          }
          style={{
            width: 34,
            height: 30,
            padding: 0,
            fontSize: 17,
            lineHeight: 1,
          }}
        >
          ＋
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          style={{
            padding:
              '5px 11px',
            fontSize: 11,
          }}
          onClick={() =>
            setCrop({
              x: 0,
              y: 0,
              scale: 1,
            })
          }
        >
          リセット
        </button>
      </div>
    </Modal>
  );
}
