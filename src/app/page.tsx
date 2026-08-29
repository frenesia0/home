'use client';
// 메인 페이지 (4.0 위젯 시스템) — 고정 요소(배너·회원정보창) + 자유 배치 위젯 + 편집모드
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMainStore, WidgetConf, WidgetType, WIDGET_META, MULTI_TYPES, widgetLabel } from '@/lib/mainStore';
import { WidgetFrame } from '@/components/main/WidgetFrame';
import { MusicWidget, renderWidget } from '@/components/main/widgets';
import { MemberBox } from '@/components/main/MemberBox';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { KRadio } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';
import {
  fetchGalleryPosts,
  getCachedGalleryPosts,
  getGalleryImages,
  getGallerySong,
  getGalleryTags,
  subscribeGallery,
  type GalleryPost,
} from '@/lib/galleryData';
import { CropImg } from '@/components/ui/CropEditor';
import { useLocalList } from '@/lib/postStore';
import {
  NEWS_SEED,
  type NewsArticle,
} from '@/lib/newsStore';

function optimizeHomeVisualUrl(url: string) {
  if (!url.includes('/upload/')) return url;

  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto:good,c_limit,w_1600/'
  );
}

const ADDABLE: WidgetType[] = ['memo', 'dday', 'todo', 'upcoming', 'freetext', 'deco', 'diary', 'latest'];
/** 내용 설정 모달이 있는 위젯 — 우클릭 「설정」 노출 대상 (v1.9) */
const EDITABLE: WidgetType[] = ['banner', 'memo', 'dday', 'todo', 'freetext', 'deco'];

export default function MainPage() {
  const { state, editOn, gridOn, updateWidget, addWidget, removeWidget } = useMainStore();
  const toast = useToast();
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<WidgetType>('freetext');
  const [addCol, setAddCol] = useState<'1' | '2' | '3'>('3');
  const [delAsk, setDelAsk] = useState<WidgetConf | null>(null);   // 우클릭 삭제 경고 (v1.9)
  const router = useRouter();
  const [homePosts, setHomePosts] = useState<GalleryPost[]>([]);
  const [homeVisualId, setHomeVisualId] = useState<string | null>(null);
  const [homeVisualLoaded, setHomeVisualLoaded] = useState(false);
  const [newsArticles] = useLocalList<NewsArticle>(
    'ohome.news.v1',
    NEWS_SEED
  );

  useEffect(() => {
    let alive = true;

    const applyPosts = (posts: GalleryPost[]) => {
      if (!alive) return;
      setHomePosts(posts);
      setHomeVisualLoaded(true);
    };

    const cached = getCachedGalleryPosts();
    if (cached && cached.length > 0) {
      applyPosts(cached);
    }

    const load = async () => {
      try {
        const posts = await fetchGalleryPosts();
        applyPosts(posts);
      } catch (error) {
        console.error('HOME VISUAL: gallery load failed', error);
        if (alive) setHomeVisualLoaded(true);
      }
    };

    void load();

    const off = subscribeGallery(() => {
      void load();
    });

    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    const candidates = homePosts.filter(post => {
      if (
        post.category !== 'original' ||
        post.heroEnabled !== true ||
        post.heroCrop == null
      ) {
        return false;
      }

      if (post.heroMode === 'custom') {
        return !!post.customHeroImage?.url;
      }

      const images = getGalleryImages(post);
      const index =
        typeof post.heroImageIndex === 'number'
          ? post.heroImageIndex
          : 0;

      return !!images[index];
    });

    if (candidates.length === 0) {
      setHomeVisualId(null);
      return;
    }

    if (
      homeVisualId &&
      candidates.some(post => post.id === homeVisualId)
    ) {
      return;
    }

    const next =
      candidates[Math.floor(Math.random() * candidates.length)] ??
      candidates[0];

    setHomeVisualId(next?.id ?? null);
  }, [homePosts, homeVisualId]);

  const homeVisualPost =
    homeVisualId
      ? homePosts.find(post => post.id === homeVisualId) ?? null
      : null;

  const homeVisualImage =
    homeVisualPost
      ? (
          homeVisualPost.heroMode === 'custom'
            ? homeVisualPost.customHeroImage ?? null
            : (
                getGalleryImages(homeVisualPost)[
                  typeof homeVisualPost.heroImageIndex === 'number'
                    ? homeVisualPost.heroImageIndex
                    : 0
                ] ?? null
              )
        )
      : null;

  const homeVisualSong =
    homeVisualPost
      ? getGallerySong(homeVisualPost)
      : null;

  const linkedMusicPostId =
    homeVisualPost &&
    getGalleryTags(homeVisualPost).includes('song-parody') &&
    homeVisualSong?.audioUrl?.trim()
      ? homeVisualPost.id
      : null;

  const recentUpdates = [
    ...homePosts.map(post => ({
      id: `gallery:${post.id}`,
      date: post.date,
      label: getGalleryTags(post).includes('song-parody')
        ? 'SONG PARODY UPDATE'
        : 'GALLERY UPDATE',
      href: `/gallery/${encodeURIComponent(post.id)}`,
    })),
    ...newsArticles
      .filter(article => article.status === 'published')
      .map(article => ({
        id: `news:${article.id}`,
        date: article.date,
        label: `NEWS · ${article.title}`,
        href: `/news/${encodeURIComponent(article.id)}`,
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  // 위젯 추가 — 상단바의 [＋ 위젯] 버튼(그리드 토글 왼쪽)이 이벤트로 연다 (v1.9 사용자 확정)
  useEffect(() => {
    const open = () => setAddOpen(true);
    window.addEventListener('ohome-add-widget', open);
    return () => window.removeEventListener('ohome-add-widget', open);
  }, []);

  // HOMEへ入った時は、前ページのスクロール位置を引き継がない。
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    });

    return () => window.cancelAnimationFrame(id);
  }, []);

  // 모달을 열 때 선택돼 있던 종류가 이미 추가된 것이면 항상 가능한 자유 텍스트로 (v1.9)
  useEffect(() => {
    if (!addOpen) return;
    if (!MULTI_TYPES.includes(addType) && state.widgets.some(w => w.type === addType)) setAddType('freetext');
  }, [addOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const enabled = state.widgets.filter(w => w.enabled);
  const byCol = (c: 1 | 2 | 3) => enabled.filter(w => w.col === c);
  const mOrder = (id: string) => {
    const i = state.mobileOrder.indexOf(id);
    return i === -1 ? 99 : i;
  };

  // 우클릭 겹침 순서 조정 (v1.8) — z가 있는 위젯들 사이에서 이동
  const zOp = (mode: 'top' | 'bottom' | 'up' | 'down') => {
    if (!ctx) return;
    const all = enabled.filter(w => w.z != null);
    const me = enabled.find(w => w.id === ctx.id);
    if (!me) return;
    const zs = all.map(w => w.z!) ;
    const cur = me.z ?? 0;
    if (mode === 'top') updateWidget(me.id, { z: (zs.length ? Math.max(...zs) : 0) + 1 });
    if (mode === 'bottom') updateWidget(me.id, { z: Math.max(0, (zs.length ? Math.min(...zs) : 1) - 1) });
    if (mode === 'up') {
      const hi = zs.filter(z => z > cur);
      if (hi.length) {
        const nz = Math.min(...hi);
        const other = all.find(w => w.z === nz)!;
        updateWidget(other.id, { z: cur });
        updateWidget(me.id, { z: nz });
      }
    }
    if (mode === 'down') {
      const lo = zs.filter(z => z < cur);
      if (lo.length) {
        const nz = Math.max(...lo);
        const other = all.find(w => w.z === nz)!;
        updateWidget(other.id, { z: cur });
        updateWidget(me.id, { z: nz });
      }
    }
    setCtx(null);
  };

  const frame = (w: WidgetConf, className?: string) => (
    <WidgetFrame key={w.id} conf={w} mobileOrder={mOrder(w.id)} className={className}
      onCtx={(id, x, y) => {
        // 우클릭 시 z 기본값 부여 (겹침 조정 대상화)
        if (state.widgets.find(v => v.id === id)?.z == null) {
          const zs = enabled.map(v => v.z ?? 0);
          updateWidget(id, { z: Math.max(...zs, 0) + 1 });
        }
        setCtx({ id, x, y });
      }}>
      {renderWidget(w)}
    </WidgetFrame>
  );

  // PC 절대배치 (v1.9 사용자 확정) — 모든 위젯에 절대 좌표가 있으면 캔버스 모드:
  // 문서 흐름 없음(겹침 허용·서로 밀지 않음). 좌표가 없는 저장분은 아래 effect가
  // 기존 열 흐름 렌더 위치를 1회 스냅샷해 마이그레이션. 모바일은 CSS가 흐름 스택으로 복원.
  const absMode = enabled.length > 0 && enabled.every(w => w.ax != null && w.ay != null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (absMode) return;
    const t = setTimeout(() => {
      const gr = gridRef.current?.getBoundingClientRect();
      if (!gr || gr.width < 100) return;   // 모바일/미측정 상태에서는 스냅샷하지 않음
      enabled.forEach(w => {
        if (w.ax != null) return;
        const el = document.querySelector(`[data-wid="${w.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        updateWidget(w.id, {
          ax: Math.round(r.left - gr.left), ay: Math.round(r.top - gr.top),
          w: w.w ?? Math.max(160, Math.round(r.width)), h: w.h ?? Math.max(80, Math.round(r.height)),
          tx: 0, ty: 0,
        }, { persist: true });
      });
    }, 250);   // 폰트·이미지 로드 후 안정된 레이아웃에서 측정
    return () => clearTimeout(t);
  }, [absMode, enabled.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const canvasH = absMode
    ? Math.max(400, ...enabled.map(w => (w.ay ?? 0) + (w.h ?? 200))) + 40
    : undefined;

  if (!editOn) {
    return (
      <section className="page home-public-page">
        <div className="home-public-grid">
          <div className="home-top-grid">
            <button
              type="button"
              className="home-visual"
              aria-label={
                homeVisualPost
                  ? 'HOME VISUALの作品を開く'
                  : 'HOME VISUAL'
              }
              onClick={() => {
                if (homeVisualPost) {
                  router.push(
                    `/gallery/${encodeURIComponent(homeVisualPost.id)}`
                  );
                }
              }}
            >
              {homeVisualImage && homeVisualPost ? (
                <CropImg
                  src={optimizeHomeVisualUrl(homeVisualImage.url)}
                  crop={homeVisualPost.heroCrop}
                  alt=""
                />
              ) : (
                <div className="home-visual-empty">
                  {homeVisualLoaded
                    ? 'HOME VISUAL'
                    : 'LOADING...'}
                </div>
              )}
            </button>

            <div className="home-music">
              <MusicWidget
                key={linkedMusicPostId ?? 'random-home-music'}
                forcedPostId={linkedMusicPostId}
                sourcePosts={homePosts}
                sourcePostsLoaded={homeVisualLoaded}
              />
            </div>
          </div>

          <section className="home-news" aria-label="RECENT UPDATE">
            <div className="home-news-head">
              <span>RECENT UPDATE</span>
              <button
                type="button"
                onClick={() => router.push('/news')}
              >
                NEWS ›
              </button>
            </div>

            <div className="home-news-list">
              {recentUpdates.length > 0 ? (
                recentUpdates.map(update => (
                  <button
                    key={update.id}
                    type="button"
                    className="home-news-row"
                    onClick={() => router.push(update.href)}
                  >
                    <time>{update.date.replaceAll('-', '.')}</time>
                    <span>{update.label}</span>
                  </button>
                ))
              ) : (
                <div className="home-news-empty">
                  NO UPDATE
                </div>
              )}
            </div>
          </section>
        </div>

        <style jsx>{`
          .home-public-page {
            padding-top: 12px;
          }

          .home-public-grid {
            width: min(1120px, 100%);
            margin: 0 auto;
            display: grid;
            gap: 18px;
          }

          .home-top-grid {
            display: grid;
            grid-template-columns:
              minmax(0, 7fr)
              minmax(280px, 3fr);
            gap: 20px;
            align-items: stretch;
          }

          .home-visual {
            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;
            border: 0;
            padding: 0;
            overflow: hidden;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
            cursor: var(--cur-pointer, pointer);
            color: inherit;
          }

          .home-visual :global(> div) {
            position: absolute;
            inset: 0;
          }

          .home-visual-empty {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            font-size: 11px;
            letter-spacing: .16em;
            color: rgba(255,255,255,.34);
          }

          .home-music {
            min-width: 0;
            height: 100%;
          }

          .home-music :global(.music-widget) {
            height: 100% !important;
            min-height: 0 !important;
            box-sizing: border-box;
            padding: 18px !important;
          }

          .home-music :global(.music-inner) {
            height: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: center !important;
            gap: 16px !important;
          }

          .home-music :global(.music-cover) {
            width: min(100%, 245px) !important;
            height: auto !important;
            aspect-ratio: 1 / 1 !important;
            flex: 0 0 auto !important;
            align-self: center;
            border-radius: 10px !important;
          }

          .home-music :global(.music-info) {
            width: 100%;
            flex: 0 0 auto !important;
          }

          .home-news {
            min-height: 0;
            padding: 4px 2px 0;
            background: transparent;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .home-news-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 11px;
            border: 0;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: .13em;
            color: rgba(255,255,255,.68);
          }

          .home-news-head button {
            color: rgba(255,255,255,.48);
            font-size: 10px;
            letter-spacing: .08em;
          }

          .home-news-list {
            display: grid;
          }

          .home-news-row {
            display: grid;
            grid-template-columns: 118px 1fr;
            gap: 20px;
            align-items: center;
            min-height: 31px;
            padding: 0;
            text-align: left;
            border: 0;
            background: transparent;
            color: rgba(255,255,255,.58);
            font-size: 12px;
            letter-spacing: .045em;
          }

          .home-news-row time {
            color: rgba(255,255,255,.46);
            font-variant-numeric: tabular-nums;
          }

          .home-news-empty {
            min-height: 76px;
            display: grid;
            place-items: center;
            font-size: 10px;
            letter-spacing: .12em;
            color: var(--faint);
          }

          @media (max-width: 760px) {
            .home-public-page {
              padding-top: 4px;
              padding-left: 8px;
              padding-right: 8px;
            }

            .home-public-grid {
              width: 100%;
              gap: 18px;
            }

            .home-top-grid {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .home-visual {
              display: block;
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              min-height: 0 !important;
              aspect-ratio: 4 / 3 !important;
            }

            .home-music {
              height: auto !important;
            }

            /* スマホMUSICは現在の横長UIをそのまま使用する。 */
            .home-music :global(.music-widget) {
              height: auto !important;
              min-height: 116px !important;
              padding: 12px 14px !important;
            }

            .home-music :global(.music-inner) {
              flex-direction: row !important;
              align-items: center !important;
              justify-content: flex-start !important;
              gap: 14px !important;
            }

            .home-music :global(.music-cover) {
              width: 88px !important;
              height: 88px !important;
              aspect-ratio: 1 / 1 !important;
              flex: 0 0 88px !important;
              align-self: auto;
              border-radius: 8px !important;
            }

            .home-music :global(.music-info) {
              flex: 1 1 auto !important;
              width: auto;
            }

            .home-news {
              min-height: 0;
              padding: 2px 2px 0;
            }

            .home-news-head {
              font-size: 11px;
            }

            .home-news-row {
              grid-template-columns: 94px 1fr;
              gap: 10px;
              min-height: 29px;
              font-size: 11px;
            }
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="page page-main-wrap" onClick={() => setCtx(null)}>
      <div ref={gridRef} className={`main-grid ${absMode ? 'abs' : ''} ${gridOn ? 'gridlines' : ''}`}
        style={{ marginTop: 12, ...(canvasH ? { height: canvasH } : {}) }}>
        {absMode ? (
          /* 절대배치 캔버스 — 위젯 전부 직속, 좌표는 각자 ax/ay */
          enabled.map(w =>
            w.type === 'member'
              ? <WidgetFrame key={w.id} conf={w} mobileOrder={-1} onCtx={(id, x, y) => setCtx({ id, x, y })}><MemberBox /></WidgetFrame>
              : frame(w, w.type === 'menu' ? 'wgt-hide-pc' : undefined))
        ) : (
          <>
            {/* (마이그레이션 전 1회용) 기존 열 흐름 렌더 — 위치 스냅샷 후 절대배치로 전환 */}
            <div>
              {byCol(1).map(w => frame(w, w.type === 'menu' ? 'wgt-hide-pc' : undefined))}
            </div>
            <div>
              {byCol(2).map(w =>
                w.type === 'banner' ? frame(w) : null
              )}
              <div className="g2" style={{ marginTop: 10 }}>
                {byCol(2).filter(w => w.type !== 'banner').map(w => frame(w))}
              </div>
            </div>
            <div>
              {byCol(3).map(w =>
                w.type === 'member'
                  ? <WidgetFrame key={w.id} conf={w} mobileOrder={-1} onCtx={(id, x, y) => setCtx({ id, x, y })}><MemberBox /></WidgetFrame>
                  : frame(w)
              )}
            </div>
          </>
        )}
      </div>

      {/* 우클릭 컨텍스트 메뉴 (겹침 순서 v1.8 · 그리드 무시 v1.9 · 설정·삭제 v1.9 사용자 확정) */}
      {ctx && (() => {
        const me = enabled.find(w => w.id === ctx.id);
        if (!me) return null;
        return (
          <div className="ctx-menu on" style={{ left: ctx.x, top: ctx.y }} onClick={e => e.stopPropagation()}>
            {/* 어떤 위젯인지 표시 — 중복 추가 위젯은 번호로 구분 (v1.9) */}
            <div className="ctx-ttl">{widgetLabel(state.widgets, me)}</div>
            <div className="sep" />
            <button onClick={() => zOp('top')}>맨위로</button>
            <button onClick={() => zOp('up')}>위로</button>
            <button onClick={() => zOp('down')}>아래로</button>
            <button onClick={() => zOp('bottom')}>맨아래로</button>
            {/* 텍스트·이미지 같은 장식 요소를 그리드에 안 붙게 자유 배치 (v1.9 사용자 확정) */}
            <button onClick={() => { updateWidget(me.id, { freeMove: !me.freeMove }); setCtx(null); }}>
              {me.freeMove ? '그리드 반영' : '그리드 무시'}
            </button>
            {(EDITABLE.includes(me.type) || !me.fixed) && <div className="sep" />}
            {/* 내용 편집 — 편집모드에서도 우클릭으로 설정 모달을 연다 (v1.9 사용자 확정) */}
            {EDITABLE.includes(me.type) && (
              <button onClick={() => {
                window.dispatchEvent(new CustomEvent('ohome-widget-edit', { detail: { id: me.id } }));
                setCtx(null);
              }}>설정</button>
            )}
            {!me.fixed && (
              <button className="danger" onClick={() => { setDelAsk(me); setCtx(null); }}>위젯 삭제</button>
            )}
          </div>
        );
      })()}

      {/* 위젯 삭제 경고 (v1.9 — 모든 삭제는 경고 모달) */}
      <ConfirmModal open={delAsk !== null}
        title={`「${delAsk ? widgetLabel(state.widgets, delAsk) : ''}」 위젯을 삭제할까요?`}
        body="위젯이 메인에서 삭제됩니다. 삭제는 편집 종료 시 「저장 후 종료」를 선택해야 확정되고, 「저장하지 않고 종료」를 선택하면 되돌아옵니다."
        onClose={() => setDelAsk(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => { if (delAsk) removeWidget(delAsk.id); setDelAsk(null); toast('위젯이 삭제되었습니다 — 편집 종료 시 저장하면 확정됩니다'); } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelAsk(null) },
        ]} />

      {/* 위젯 추가 모달 (4.0 · 중복 방지 v1.9 — 이미지·자유 텍스트만 여러 개 가능) */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} small
        title="위젯 추가" desc="종류와 배치 열을 선택 — 이미 추가한 위젯은 다시 추가할 수 없음 (이미지·자유 텍스트 제외)"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => {
            if (!MULTI_TYPES.includes(addType) && state.widgets.some(w => w.type === addType)) return;
            const id = addWidget(addType, Number(addCol) as 1 | 2 | 3);
            setAddOpen(false);
            toast('위젯이 추가되었습니다 — 우클릭 메뉴에서 설정·삭제할 수 있습니다');
            // 추가 위치가 화면 밖(열 하단)일 수 있어 새 위젯으로 스크롤 (v1.9 사용자 피드백)
            setTimeout(() => document.querySelector(`[data-wid="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
          }}>ADD</button>
        </>}>
        <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
          {ADDABLE.map(t => {
            const taken = !MULTI_TYPES.includes(t) && state.widgets.some(w => w.type === t);
            return (
              <KRadio key={t} name="wgt-type" value={t} current={addType} disabled={taken}
                onChange={v => setAddType(v as WidgetType)}
                label={<span>
                  <b style={{ fontSize: 12.5 }}>{WIDGET_META[t].title}</b>{' '}
                  <small style={{ color: 'var(--faint)', fontSize: 10.5 }}>{WIDGET_META[t].desc}</small>
                  {taken && <span className="pill" style={{ marginLeft: 6 }}>추가됨</span>}
                  {MULTI_TYPES.includes(t) && <span className="pill" style={{ marginLeft: 6 }}>중복 추가 가능</span>}
                </span>} />
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <KRadio name="wgt-col" value="1" current={addCol} onChange={v => setAddCol(v as '1')} label="왼쪽 열" />
          <KRadio name="wgt-col" value="2" current={addCol} onChange={v => setAddCol(v as '2')} label="중앙" />
          <KRadio name="wgt-col" value="3" current={addCol} onChange={v => setAddCol(v as '3')} label="오른쪽 열" />
        </div>
      </Modal>
    </section>
  );
}
