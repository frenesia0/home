'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  CSSProperties,
} from 'react';

import type {
  GalleryWatermark,
} from '@/lib/galleryData';


/* =========================================================
   TYPES
========================================================= */

type FitMode =
  | 'contain'
  | 'cover';


type WatermarkedImageProps = {
  src:
    string;

  alt?:
    string;

  watermark?:
    GalleryWatermark;

  fit?:
    FitMode;

  className?:
    string;

  style?:
    CSSProperties;
};


type WatermarkOverlayProps = {
  watermark?:
    GalleryWatermark;

  /**
   * この表示領域の横幅。
   *
   * メイン画像では実画像の描画幅、
   * サムネイルではサムネイル幅を渡す。
   *
   * 指定しなければ500px基準。
   */
  referenceWidth?:
    number;

  style?:
    CSSProperties;
};


type ImageArea = {
  left:
    number;

  top:
    number;

  width:
    number;

  height:
    number;
};


const DEFAULT_AREA:
  ImageArea = {
  left:
    0,

  top:
    0,

  width:
    0,

  height:
    0,
};


/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value:
    number,

  min:
    number,

  max:
    number
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
  value:
    number
) {
  return (
    clamp(
      Number.isFinite(
        value
      )
        ? value
        : 25,

      0,
      100
    ) / 100
  );
}


function getRenderedImageArea(
  boxWidth:
    number,

  boxHeight:
    number,

  naturalWidth:
    number,

  naturalHeight:
    number,

  fit:
    FitMode
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
      (
        boxWidth -
        width
      ) / 2,

    top:
      (
        boxHeight -
        height
      ) / 2,

    width,

    height,
  };
}


/* =========================================================
   WATERMARK OVERLAY
========================================================= */

/**
 * 透かし部分だけを描画する共通部品。
 *
 * GALLERY一覧のCropImgにも
 * このコンポーネントを重ねられる。
 */
export function WatermarkOverlay({
  watermark,
  referenceWidth = 500,
  style,
}: WatermarkOverlayProps) {
  if (
    !watermark ||
    watermark.color ===
      'none'
  ) {
    return null;
  }


  const opacity =
    normalizeOpacity(
      watermark.opacity
    );


  const rgb =
    watermark.color ===
      'black'
      ? '0,0,0'
      : '255,255,255';


  const gridSize =
    clamp(
      watermark.gridSize ??
        180,

      60,
      500
    );


  const safeReferenceWidth =
    Math.max(
      1,
      referenceWidth
    );


  /*
   * 元画像表示が小さくなった場合、
   * 格子も比例して縮める。
   */
  const responsiveGridSize =
    clamp(
      gridSize *
        (
          safeReferenceWidth /
          800
        ),

      32,
      gridSize
    );


  /*
   * IDサイズも表示サイズへ追従。
   */
  const textSize =
    clamp(
      safeReferenceWidth *
        0.035,

      8,
      28
    );


  const textPadding =
    clamp(
      safeReferenceWidth *
        0.025,

      6,
      24
    );


  const lineColor =
    `rgba(${rgb}, ${opacity})`;

  const textColor =
    `rgba(${rgb}, ${opacity})`;


  return (
    <div
      aria-hidden="true"
      style={{
        position:
          'absolute',

        inset:
          0,

        overflow:
          'hidden',

        pointerEvents:
          'none',

        zIndex:
          2,

        ...style,
      }}
    >

      {/* ===============================================
          DIAGONAL GRID
      =============================================== */}

      {watermark.grid !==
        false && (
        <div
          style={{
            position:
              'absolute',

            inset:
              '-30%',

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

            transform:
              'translateZ(0)',
          }}
        />
      )}


      {/* ===============================================
          ID
      =============================================== */}

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

            textShadow:
              watermark.color ===
              'white'
                ? '0 1px 2px rgba(0,0,0,.08)'
                : '0 1px 2px rgba(255,255,255,.05)',
          }}
        >
          {watermark.text}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   WATERMARKED IMAGE
========================================================= */

export function WatermarkedImage({
  src,
  alt = '',
  watermark,
  fit = 'contain',
  className,
  style,
}: WatermarkedImageProps) {
  const wrapRef =
    useRef<HTMLDivElement>(
      null
    );


  const naturalRef =
    useRef({
      width:
        0,

      height:
        0,
    });


  const [
    imageArea,
    setImageArea,
  ] =
    useState<ImageArea>(
      DEFAULT_AREA
    );


  /* =======================================================
     COMPUTE IMAGE AREA
  ======================================================= */

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


  /* =======================================================
     RESIZE
  ======================================================= */

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


  /* =======================================================
     RENDER
  ======================================================= */

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


          naturalRef.current = {
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


      {/* ===============================================
          実際に描画された画像範囲だけへ透かし
      =============================================== */}

      {imageArea.width >
        0 &&
        imageArea.height >
          0 && (
        <div
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
          <WatermarkOverlay
            watermark={
              watermark
            }
            referenceWidth={
              imageArea.width
            }
          />
        </div>
      )}
    </div>
  );
}
