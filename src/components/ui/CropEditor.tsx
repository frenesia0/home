'use client';

// 썸네일 크롭 편집기 (6.1 v1.8)
// 드래그(이동) + 확대/축소, 규격 고정 비율, 3분할 가이드
// 원본은 건드리지 않고 크롭 좌표만 저장.
// 확대 범위: 1x ~ 15x (100% ~ 1500%)

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useBlobUrl } from '@/lib/blobStore';

/** x·y = 프레임 크기 대비 중심 오프셋 비율, scale = 배율 */
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

/** 최대 확대 배율。15 = 1500% */
const MAX_SCALE = 15;

/**
 * 커버 배치 스타일
 * 원본 비율을 유지하면서 프레임을 채운다.
 */
export function coverImgStyle(
  crop: CropValue | undefined,
  wide: boolean
): React.CSSProperties {
  const c = crop ?? { x: 0, y: 0, scale: 1 };

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
 * 프레임 채움 크롭 이미지.
 * 컨테이너와 원본 비율을 측정해 cover 방향을 자동 결정한다.
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
    const r = wrapRef.current?.getBoundingClientRect();
    const n = natRef.current;

    if (r && n && r.width > 1 && r.height > 1) {
      setWide(n.w / n.h >= r.width / r.height);
    }
  };

  useEffect(() => {
    compute();

    const el = wrapRef.current;

    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }

    const ro = new ResizeObserver(compute);
    ro.observe(el);

    return () => ro.disconnect();

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
        onLoad={(e) => {
          const im = e.currentTarget;

          natRef.current = {
            w: im.naturalWidth,
            h: im.naturalHeight,
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
 * 파일 참조 + 크롭을 적용해 표시하는 썸네일.
 * 파일이 없으면 플레이스홀더를 표시한다.
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

  return <CropImg src={url} crop={crop} alt={alt} />;
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

  const [natR, setNatR] = useState<number | null>(null);

  const frameR =
    typeof aspect === 'number'
      ? aspect
      : RATIO[aspect];

  const aspectText =
    aspectLabel ??
    (typeof aspect === 'number'
      ? `${aspect.toFixed(2)}:1`
      : aspect);

  const wide =
    natR != null
      ? natR >= frameR
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
   * 이미지가 프레임을 항상 채우도록 위치와 확대율을 제한한다.
   * 확대율은 1x ~ 15x.
   */
  const clamp = (c: CropValue): CropValue => {
    const scale = Math.min(
      MAX_SCALE,
      Math.max(1, c.scale)
    );

    if (natR == null) {
      return {
        ...c,
        scale,
      };
    }

    const coverW =
      wide
        ? natR / frameR
        : 1;

    const coverH =
      wide
        ? 1
        : frameR / natR;

    const maxX = Math.max(
      0,
      (scale * coverW - 1) / 2
    );

    const maxY = Math.max(
      0,
      (scale * coverH - 1) / 2
    );

    return {
      scale,
      x: Math.min(
        maxX,
        Math.max(-maxX, c.x)
      ),
      y: Math.min(
        maxY,
        Math.max(-maxY, c.y)
      ),
    };
  };

  /**
   * 이미지 드래그 이동
   */
  const onPan = (
    e: React.PointerEvent
  ) => {
    e.preventDefault();

    const r =
      frameRef.current!.getBoundingClientRect();

    const sx = e.clientX;
    const sy = e.clientY;

    const bx = crop.x;
    const by = crop.y;

    const mv = (
      ev: PointerEvent
    ) => {
      setCrop((c) =>
        clamp({
          ...c,
          x:
            bx +
            (ev.clientX - sx) /
              r.width,
          y:
            by +
            (ev.clientY - sy) /
              r.height,
        })
      );
    };

    const up = () => {
      window.removeEventListener(
        'pointermove',
        mv
      );

      window.removeEventListener(
        'pointerup',
        up
      );
    };

    window.addEventListener(
      'pointermove',
      mv
    );

    window.addEventListener(
      'pointerup',
      up
    );
  };

  /**
   * 줌 슬라이더 위치 → 1x ~ 15x
   */
  const setZoomFromPointer = (
    clientX: number
  ) => {
    const r =
      zoomRef.current!.getBoundingClientRect();

    const t = Math.min(
      1,
      Math.max(
        0,
        (clientX - r.left) /
          r.width
      )
    );

    setCrop((c) =>
      clamp({
        ...c,
        scale:
          1 +
          t * (MAX_SCALE - 1),
      })
    );
  };

  const onZoomDrag = (
    e: React.PointerEvent
  ) => {
    e.preventDefault();

    setZoomFromPointer(e.clientX);

    const mv = (
      ev: PointerEvent
    ) => {
      setZoomFromPointer(
        ev.clientX
      );
    };

    const up = () => {
      window.removeEventListener(
        'pointermove',
        mv
      );

      window.removeEventListener(
        'pointerup',
        up
      );
    };

    window.addEventListener(
      'pointermove',
      mv
    );

    window.addEventListener(
      'pointerup',
      up
    );
  };

  /**
   * 현재 확대율을 슬라이더상의 0~100% 위치로 변환
   */
  const zoomPercent =
    ((crop.scale - 1) /
      (MAX_SCALE - 1)) *
    100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="썸네일 영역 지정"
      desc={`크롭 비율 ${aspectText} — 드래그로 이동, 슬라이더/휠로 확대 · 최대 15×`}
      actions={
        <>
          <button
            className="btn btn-ghost"
            onClick={onClose}
          >
            CANCEL
          </button>

          <button
            className="btn btn-dark"
            onClick={() =>
              onApply(crop)
            }
          >
            APPLY
          </button>
        </>
      }
    >
      <div
        ref={frameRef}
        className="crop-frame"
        style={{
          aspectRatio:
            String(frameR),
          width: `min(100%, ${Math.round(
            480 * frameR
          )}px)`,
          margin: '0 auto',
        }}
        onPointerDown={onPan}
        onWheel={(e) => {
          e.preventDefault();

          setCrop((c) =>
            clamp({
              ...c,

              // ホイールは細かく調整できるようにする
              scale:
                c.scale -
                Math.sign(
                  e.deltaY
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
          onLoad={(e) => {
            const im =
              e.currentTarget;

            if (
              im.naturalHeight >
              0
            ) {
              setNatR(
                im.naturalWidth /
                  im.naturalHeight
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
          확대{' '}
          {crop.scale.toFixed(
            2
          )}
          ×
        </span>

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
          초기화
        </button>
      </div>
    </Modal>
  );
}
