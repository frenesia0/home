'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  GalleryWatermark,
} from '@/lib/galleryData';

type FitMode =
  | 'contain'
  | 'cover';

type Props = {
  src: string;
  alt?: string;

  watermark?:
    GalleryWatermark;

  fit?: FitMode;

  className?: string;

  style?: React.CSSProperties;
};

type ImageArea = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const DEFAULT_AREA: ImageArea = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function normalizeOpacity(
  value: number
) {
  return (
    clamp(
      Number.isFinite(value)
        ? value
        : 25,
      0,
      100
    ) / 100
  );
}

function getRenderedImageArea(
  boxWidth: number,
  boxHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  fit: FitMode
): ImageArea {
  if (
    boxWidth <= 0 ||
    boxHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return DEFAULT_AREA;
  }

  const scaleX =
    boxWidth /
    naturalWidth;

  const scaleY =
    boxHeight /
    naturalHeight;

  const scale =
    fit === 'cover'
      ? Math.max(
          scaleX,
          scaleY
        )
      : Math.min(
          scaleX,
          scaleY
        );

  const width =
    naturalWidth *
    scale;

  const height =
    naturalHeight *
    scale;

  return {
    left:
      (boxWidth -
        width) /
      2,

    top:
      (boxHeight -
        height) /
      2,

    width,

    height,
  };
}

export function WatermarkedImage({
  src,
  alt = '',
  watermark,
  fit = 'contain',
  className,
  style,
}: Props) {
  const wrapRef =
    useRef<HTMLDivElement>(
      null
    );

  const naturalRef =
    useRef({
      width: 0,
      height: 0,
    });

  const [
    imageArea,
    setImageArea,
  ] =
    useState<ImageArea>(
      DEFAULT_AREA
    );

  const compute =
    () => {
      const wrap =
        wrapRef.current;

      if (!wrap) {
        return;
      }

      const {
        width:
          naturalWidth,

        height:
          naturalHeight,
      } =
        naturalRef.current;

      if (
        !naturalWidth ||
        !naturalHeight
      ) {
        return;
      }

      const rect =
        wrap.getBoundingClientRect();

      setImageArea(
        getRenderedImageArea(
          rect.width,
          rect.height,
          naturalWidth,
          naturalHeight,
          fit
        )
      );
    };

  useEffect(() => {
    compute();

    const wrap =
      wrapRef.current;

    if (
      !wrap ||
      typeof ResizeObserver ===
        'undefined'
    ) {
      return;
    }

    const observer =
      new ResizeObserver(
        compute
      );

    observer.observe(
      wrap
    );

    return () =>
      observer.disconnect();
  }, [
    src,
    fit,
  ]);

  const enabled =
    watermark &&
    watermark.color !==
      'none';

  const opacity =
    enabled
      ? normalizeOpacity(
          watermark.opacity
        )
      : 0;

  const rgb =
    watermark?.color ===
    'black'
      ? '0,0,0'
      : '255,255,255';

  const gridSize =
    clamp(
      watermark?.gridSize ??
        180,
      60,
      500
    );

  /*
   * CSSのダイヤ格子は、
   * 45°と-45°の線を
   * 重ねて作る。
   */
  const lineColor =
    `rgba(${rgb}, ${opacity})`;

  const textColor =
    `rgba(${rgb}, ${opacity})`;

  /*
   * サムネイルなど小さい表示では
   * 元のgridSizeをそのまま使うと
   * 格子が巨大になりすぎる。
   *
   * 画像表示幅に合わせて
   * 自動で縮小する。
   */
  const referenceWidth =
    imageArea.width >
    0
      ? imageArea.width
      : 500;

  const responsiveGridSize =
    clamp(
      gridSize *
        (
          referenceWidth /
          800
        ),
      40,
      gridSize
    );

  const textSize =
    clamp(
      referenceWidth *
        0.035,
      9,
      28
    );

  const textPadding =
    clamp(
      referenceWidth *
        0.025,
      7,
      24
    );

  return (
    <div
      ref={
        wrapRef
      }
      className={
        className
      }
      style={{
        position:
          'relative',

        overflow:
          'hidden',

        width:
          '100%',

        height:
          '100%',

        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          src
        }
        alt={
          alt
        }
        draggable={
          false
        }
        onLoad={(
          event
        ) => {
          const image =
            event.currentTarget;

          naturalRef.current =
            {
              width:
                image.naturalWidth,

              height:
                image.naturalHeight,
            };

          compute();
        }}
        style={{
          display:
            'block',

          width:
            '100%',

          height:
            '100%',

          objectFit:
            fit,

          userSelect:
            'none',
        }}
      />

      {enabled &&
        imageArea.width >
          0 &&
        imageArea.height >
          0 && (
          <div
            aria-hidden="true"
            style={{
              position:
                'absolute',

              left:
                imageArea.left,

              top:
                imageArea.top,

              width:
                imageArea.width,

              height:
                imageArea.height,

              overflow:
                'hidden',

              pointerEvents:
                'none',
            }}
          >
            {/* =========================
                DIAGONAL GRID
            ========================= */}

            {watermark.grid !==
              false && (
              <div
                style={{
                  position:
                    'absolute',

                  inset:
                    '-30%',

                  /*
                   * 大きな斜めダイヤ格子
                   */
                  backgroundImage: `
                    repeating-linear-gradient(
                      45deg,
                      transparent 0,
                      transparent calc(${responsiveGridSize}px - 1px),
                      ${lineColor} calc(${responsiveGridSize}px - 1px),
                      ${lineColor} ${responsiveGridSize}px
                    ),
                    repeating-linear-gradient(
                      -45deg,
                      transparent 0,
                      transparent calc(${responsiveGridSize}px - 1px),
                      ${lineColor} calc(${responsiveGridSize}px - 1px),
                      ${lineColor} ${responsiveGridSize}px
                    )
                  `,

                  /*
                   * insetを広げたぶん
                   * 格子が端で切れない。
                   */
                  transform:
                    'translateZ(0)',
                }}
              />
            )}

            {/* =========================
                ID
            ========================= */}

            {watermark.text && (
              <div
                style={{
                  position:
                    'absolute',

                  right:
                    textPadding,

                  bottom:
                    textPadding,

                  color:
                    textColor,

                  fontSize:
                    `${textSize}px`,

                  lineHeight:
                    1,

                  fontWeight:
                    500,

                  letterSpacing:
                    '.01em',

                  whiteSpace:
                    'nowrap',

                  userSelect:
                    'none',

                  /*
                   * ごく軽い縁。
                   * 透かし色を邪魔しない程度。
                   */
                  textShadow:
                    watermark.color ===
                    'white'
                      ? '0 1px 2px rgba(0,0,0,.08)'
                      : '0 1px 2px rgba(255,255,255,.05)',
                }}
              >
                {
                  watermark.text
                }
              </div>
            )}
          </div>
        )}
    </div>
  );
}
