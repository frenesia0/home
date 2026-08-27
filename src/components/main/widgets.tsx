'use client';
// メインウィジェットレンダラー (4.0) — DIARY/LATEST/UPCOMINGなどは該当機能（第2・第3段階）まではデモデータ
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WidgetConf, useMainStore, WIDGET_META, decoSlides } from '@/lib/mainStore';
import { useAuth } from '@/lib/auth';
import { useMenuSettings, buildMenu } from '@/lib/menuStore';
import { useBoards } from '@/lib/boardStore';
import { Modal } from '@/components/ui/Modal';
import { KTextarea, KSelect, KStep, KCheck } from '@/components/ui/Kit';
import { ColorField } from '@/components/ui/ColorField';
import { useFonts } from '@/lib/fontStore';
import { BannerEditor, BannerSlide, DEMO_SLIDES, DdayEditor, DecoEditor, TodoEditor, TodoSetItem } from '@/components/main/widgetEditors';
import { CroppedBlobImg, CropValue } from '@/components/ui/CropEditor';
import { useLocalList } from '@/lib/postStore';
import { RoadItem, ROAD_SEED, BackupPost, BACKUP_SEED } from '@/lib/galleryStore';
import { DiaryPost, DIARY_SEED, Mood, MOOD_SEED, moodTint } from '@/lib/diaryStore';
import { useSched, eventColor } from '@/lib/schedStore';
import { StickyMemo, MEMO_SEED, MEMO_SIZE_W, useMemoSettings } from '@/lib/memoStore';
import { BlobImg, useBlobUrl } from '@/lib/blobStore';
import { normalizeInternalLink } from '@/lib/link';
import {
  fetchGalleryPosts,
  getGallerySong,
  getGalleryTags,
  getGalleryThumbnailImage,
  subscribeGallery,
  type GalleryPost,
} from '@/lib/galleryData';

/* 編集モードで右クリック「設定」→ 該当ウィジェットの設定モーダルを開く (v1.9 ユーザー確定 — イベントで接続) */
function useEditEvent(id: string, onOpen: () => void) {
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail?.id === id) onOpen(); };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [id, onOpen]);
}

/**
 * 画像参照を安全に文字列へ絞り込む。
 * 旧Galleryと新Galleryのデータ形式が混在していても、
 * BlobImg / useBlobUrl にオブジェクトを渡してHOME全体が落ちないようにする。
 */
function safeFileRef(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/* ---------- スライドバナー (固定要素, 4.0) — 画像・リンク・間隔・順序管理 ---------- */

export function BannerWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { editOn, updateWidget } = useMainStore();
  const router = useRouter();
  const [cur, setCur] = useState(0);
  const [mngOpen, setMngOpen] = useState(false);
  useEditEvent(conf.id, () => setMngOpen(true));   // 編集モードで右クリック → 設定 (v1.9)
  const slides = ((conf.settings.slides as BannerSlide[]) ?? []).length > 0
    ? (conf.settings.slides as BannerSlide[]) : DEMO_SLIDES;
  const interval = (conf.settings.interval as number) ?? 4;

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCur(c => (c + 1) % slides.length), Math.max(2, interval) * 1000);
    return () => clearInterval(t);
  }, [slides.length, interval]);

  const s = slides[Math.min(cur, slides.length - 1)];
  const go = () => {
    if (editOn || !s.link) return;
    // 既存データに完全URLがあっても同一サイトなら内部遷移にする (v1.9)
    const l = normalizeInternalLink(s.link);
    if (/^https?:\/\//.test(l)) window.open(l, '_blank');
    else router.push(l);
  };

  return (
    <div className="banner" style={{ cursor: s.link && !editOn ? 'pointer' : undefined }} onClick={go}>
      {slides.map((sl, i) => (
        <div key={sl.id} className={`slide ${i === Math.min(cur, slides.length - 1) ? 'on' : ''}`}>
          {sl.imgId
            /* アップロード画像 — 元画像を保持し、位置トリミングだけ適用 (バナーサイズが変わっても比率座標で再現) */
            ? <CroppedBlobImg fileRef={safeFileRef(sl.imgId)} crop={sl.crop} ph="" />
            : sl.img
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={sl.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div className={`ph ${sl.cls ?? ''}`} style={{ position: 'absolute', inset: 0 }}><span>SLIDE BANNER {String(i + 1).padStart(2, '0')}</span></div>}
        </div>
      ))}
      <div className="cap"><b>{s.cap}</b><span>{s.sub}</span></div>
      <div className="dots" onClick={e => e.stopPropagation()}>
        {slides.map((sl, i) => (
          <i key={sl.id} className={i === Math.min(cur, slides.length - 1) ? 'on' : ''} onClick={() => setCur(i)} />
        ))}
      </div>
      {/* バナー管理 (管理者) — バナーにマウスを乗せたときだけ表示 */}
      {isAdmin && !editOn && (
        <button className="hv-actions"
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 4, fontSize: 10.5, letterSpacing: '.06em',
            padding: '5px 11px', borderRadius: 999, background: 'rgba(15,17,20,.55)', color: '#dfe2e7',
          }}
          onClick={e => { e.stopPropagation(); setMngOpen(true); }}>MANAGE</button>
      )}
      <div onClick={e => e.stopPropagation()}>
        <Modal open={mngOpen} onClose={() => setMngOpen(false)} title="スライドバナー 管理"
          desc="画像アップロード・キャプション・リンク（内部パスまたは外部URL）・⠿ ドラッグで順序変更・元画像は切り取られません">
          {mngOpen && <BannerEditor conf={conf} onSaved={() => setMngOpen(false)} onClose={() => setMngOpen(false)} />}
        </Modal>
      </div>
    </div>
  );
}

/* ---------- メニューリスト (モバイル専用, 第8章) ---------- */
export function MenuListWidget() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [menuSet, , menuLoaded] = useMenuSettings(); // メニュー管理 (5.2) 反映
  const { boards, loaded: boardsLoaded } = useBoards(); // 複数掲示板 (5.2)
  const { user: wUser, isAdmin: wIsAdmin } = useAuth(); // 公開範囲フィルター (v1.9)
  return (
    <div className="panel menu-list wgt-menu">
      {(menuLoaded && boardsLoaded ? buildMenu(menuSet, boards, { loggedIn: !!wUser, isAdmin: wIsAdmin }) : []).map(m =>
        m.children ? (
          <div key={m.label} className={`mgrp ${open === m.label ? 'open' : ''}`}>
            <a onClick={() => setOpen(o => (o === m.label ? null : m.label))}>{m.label}</a>
            <div className="msub">
              {m.children.map(c => <a key={c.href} onClick={() => router.push(c.href)}>{c.label}</a>)}
            </div>
          </div>
        ) : (
          <a key={m.label} onClick={() => router.push(m.href!)}>{m.label}</a>
        )
      )}
    </div>
  );
}

/* ---------- MEMO — 管理者 クリック時に大きな編集モーダル (4.12 v1.8) ---------- */
export function MemoWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { editOn, updateWidget } = useMainStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const text = (conf.settings.text as string) ?? '';
  useEditEvent(conf.id, () => { setDraft(text); setOpen(true); });   // 編集モードで右クリック → 設定 (v1.9)
  return (
    <div className="panel widget" style={{ cursor: isAdmin ? 'pointer' : undefined }}
      onClick={e => { if ((e.target as HTMLElement).closest('.modal-ov')) return; if (isAdmin && !editOn) { setDraft(text); setOpen(true); } }}>
      <h4>MEMO {isAdmin && <span className="more">管理 ›</span>}</h4>
      <p style={{ fontSize: 12, lineHeight: 1.7, color: '#3a3f47', whiteSpace: 'pre-line' }}>{text || 'メモは空です'}</p>

      <Modal open={open} onClose={() => setOpen(false)} title="メモ管理" desc="メインメモウィジェット内容 — 管理者専用"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => {
            updateWidget(conf.id, { settings: { ...conf.settings, text: draft } }, { persist: true }); setOpen(false);
          }}>SAVE</button>
        </>}>
        <KTextarea value={draft} onChange={e => setDraft(e.target.value)} />
      </Modal>
    </div>
  );
}

/* ---------- DIARY (最近の日記 — 実データ, 4.14) ---------- */
export function DiaryWidget() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts] = useLocalList<DiaryPost>('ohome.diary.v1', DIARY_SEED);
  const [moods] = useLocalList<Mood>('ohome.moods.v1', MOOD_SEED);
  // 非公開の日記はウィジェットに絶対表示しない — 管理者でも (4.14)
  const latest = posts
    .filter(p => p.visibility === 'public' || (p.visibility === 'member' && !!user))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <div className="panel widget" style={{ margin: 0 }}>
      <h4>DIARY <span className="more" onClick={() => router.push('/diary')}>もっと見る ›</span></h4>
      {latest.map(p => {
        const m = moods.find(x => x.id === p.moodId);
        return (
          <div key={p.id} className="diary-mini" onClick={() => router.push(`/diary#${p.id}`)}>
            <div className="mood" style={{ background: moodTint(m?.color ?? '#888'), color: m?.color }}>{m?.icon ?? '·'}</div>
            <div className="t"><span className="tt">{p.title}</span> <small>{p.date.slice(5).replace('-', '.')}{m ? ` · ${m.name}` : ''}</small></div>
          </div>
        );
      })}
      {latest.length === 0 && <p className="hint">公開されている日記はありません</p>}
    </div>
  );
}

/* ---------- LATEST (最新イラスト — ロードビュー + ギャラリー統合の最新3件, v1.9 ユーザーフィードバック) ---------- */
export function LatestWidget() {
  const router = useRouter();
  const [roads] = useLocalList<RoadItem>('ohome.road.v1', ROAD_SEED);
  const [backups] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);

  const roadItems = roads.map(it => {
    const ref = safeFileRef(it.imgId) ?? safeFileRef(it.imgUrl);

    return {
      id: `r-${it.id}`,
      date: it.date,
      ref,
      ph: it.ph,
      href: '/roadview',
      tip: `ロードビュー · No.${String(it.no ?? 0).padStart(3, '0')}`,
    };
  });

  /**
   * 旧O.HOMEの絵バックアップだけをLATEST対象にする。
   *
   * 新Galleryの複数枚投稿は images に { url, publicId } を入れるため、
   * 移行前に同じ gallery コレクションへ保存されたデータを誤って読むと、
   * オブジェクトが BlobImg → useBlobUrl に渡り startsWith エラーでHOMEが落ちる。
   *
   * そのため「1枚目が文字列の旧形式データ」だけをここで採用する。
   */
  const backupItems = backups.flatMap(p => {
    if (p.visibility !== 'public' || p.fold) return [];

    const ref =
      Array.isArray(p.images)
        ? safeFileRef(p.images[0])
        : undefined;

    if (!ref) return [];

    return [{
      id: `b-${p.id}`,
      date: p.date,
      ref,
      ph:
        Array.isArray(p.phList) &&
        typeof p.phList[0] === 'string'
          ? p.phList[0]
          : 'cool',
      href: `/backup/${p.id}`,
      tip: `ギャラリー · ${p.title}`,
    }];
  });

  const latest = [
    ...roadItems,
    ...backupItems,
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const phFallback = ['cool', 'warm', 'red'];

  return (
    <div className="panel widget" style={{ margin: 0 }}>
      <h4>
        LATEST{' '}
        <span
          className="more"
          onClick={() => router.push('/backup')}
        >
          もっと見る ›
        </span>
      </h4>

      <div className="latest-grid">
        {[0, 1, 2].map(i => {
          const it = latest[i];

          return (
            <div
              key={it?.id ?? i}
              style={{
                aspectRatio: '1',
                borderRadius: 9,
                overflow: 'hidden',
                position: 'relative',
                cursor: it ? 'pointer' : undefined,
              }}
              onClick={() => {
                if (it) router.push(it.href);
              }}
              data-tip={it?.tip}
            >
              <BlobImg
                fileRef={safeFileRef(it?.ref)}
                ph={it?.ph || phFallback[i]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ---------- MUSIC — GALLERYのSONG PARODYから自動選曲 ---------- */
interface MusicTrack {
  id: string;
  title: string;
  creator: string;
  audioUrl: string;
  coverUrl?: string;
  href: string;
}

function formatMusicTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function galleryPostToMusicTrack(post: GalleryPost): MusicTrack | null {
  if (!getGalleryTags(post).includes('song-parody')) return null;

  const song = getGallerySong(post);
  const audioUrl = song?.audioUrl?.trim();
  if (!audioUrl) return null;

  const thumbnail = getGalleryThumbnailImage(post);

  return {
    id: post.id,
    title: song?.title?.trim() || 'UNTITLED',
    creator: song?.creator?.trim() || 'UNKNOWN CREATOR',
    audioUrl,
    coverUrl: thumbnail?.url,
    href: `/gallery/${encodeURIComponent(post.id)}`,
  };
}

export function MusicWidget({ conf }: { conf: WidgetConf }) {
  const router = useRouter();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const posts = await fetchGalleryPosts();
        if (!alive) return;

        const nextTracks = posts
          .map(galleryPostToMusicTrack)
          .filter((track): track is MusicTrack => track !== null);

        setTracks(nextTracks);
      } catch (error) {
        console.error('HOME MUSIC: gallery load failed', error);
        if (alive) setTracks([]);
      } finally {
        if (alive) setLoaded(true);
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

  const current =
    tracks.find(track => track.id === currentId) ??
    (currentId === null ? undefined : tracks[0]);

  const chooseRandom = (excludeId?: string) => {
    if (!tracks.length) return;

    const pool =
      tracks.length > 1 && excludeId
        ? tracks.filter(track => track.id !== excludeId)
        : tracks;

    const next =
      pool[Math.floor(Math.random() * pool.length)] ??
      tracks[0];

    setCurrentId(next.id);
    setCurrentTime(0);
    setDuration(0);
  };

  useEffect(() => {
    if (!tracks.length) {
      setCurrentId(null);
      setPlaying(false);
      return;
    }

    if (!currentId || !tracks.some(track => track.id === currentId)) {
      const random =
        tracks[Math.floor(Math.random() * tracks.length)] ??
        tracks[0];

      setCurrentId(random.id);
    }
  }, [tracks, currentId]);

  useEffect(() => {
    if (!audioEl) return;

    if (playing && current?.audioUrl) {
      audioEl.play().catch(() => setPlaying(false));
    } else {
      audioEl.pause();
    }
  }, [playing, current?.audioUrl, audioEl]);

  useEffect(() => {
    if (!audioEl) return;

    audioEl.load();
    setCurrentTime(0);
    setDuration(0);
  }, [current?.audioUrl, audioEl]);

  useEffect(() => {
    if (!audioEl) return;
    audioEl.volume = volume / 100;
  }, [volume, audioEl]);

  const skip = () => {
    const keepPlaying = playing;
    chooseRandom(current?.id);
    setPlaying(keepPlaying);
  };

  const onEnded = () => {
    chooseRandom(current?.id);
    setPlaying(true);
  };

  return (
    <div
      className="panel widget music-widget"
      style={{
        margin: 0,
        position: 'relative',
        minHeight: 118,
        padding: '12px 14px',
        overflow: 'visible',
      }}
    >
      {current && (
        <button
          type="button"
          className="more"
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            zIndex: 2,
          }}
          onClick={() => router.push(current.href)}
        >
          VIEW ›
        </button>
      )}

      {current ? (
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <button
            type="button"
            aria-label="この曲パロ作品を開く"
            onClick={() => router.push(current.href)}
            style={{
              width: 88,
              height: 88,
              flex: '0 0 88px',
              overflow: 'hidden',
              borderRadius: 8,
              background: 'rgba(127,127,127,.08)',
              border: 0,
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {current.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.coverUrl}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 9,
                  letterSpacing: '.12em',
                  opacity: .45,
                }}
              >
                NO COVER
              </div>
            )}
          </button>

          <div
            style={{
              minWidth: 0,
              flex: 1,
              paddingRight: 4,
            }}
          >
            <div
              style={{
                paddingRight: 52,
                fontSize: 13,
                fontWeight: 650,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={current.title}
            >
              {current.title}
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 10.5,
                opacity: .58,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={current.creator}
            >
              {current.creator}
            </div>

            <input
              aria-label="再生位置"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={event => {
                const value = Number(event.target.value);
                if (audioEl) audioEl.currentTime = value;
                setCurrentTime(value);
              }}
              style={{
                width: '100%',
                margin: '8px 0 0',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9.5,
                opacity: .52,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{formatMusicTime(currentTime)}</span>
              <span>{formatMusicTime(duration)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  aria-label="別の曲をランダム再生"
                  onClick={skip}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    opacity: .72,
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 2,
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  aria-label={playing ? '一時停止' : '再生'}
                  onClick={() => setPlaying(value => !value)}
                  style={{
                    width: 28,
                    height: 28,
                    flex: '0 0 28px',
                    borderRadius: '50%',
                    border: '1px solid currentColor',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 10,
                    lineHeight: 1,
                    display: 'grid',
                    placeItems: 'center',
                    padding: 0,
                  }}
                >
                  {playing ? 'Ⅱ' : '▶'}
                </button>

                <button
                  type="button"
                  aria-label="別の曲をランダム再生"
                  onClick={skip}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    opacity: .72,
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 2,
                  }}
                >
                  ›
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  minWidth: 82,
                  maxWidth: 110,
                  flex: 1,
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 11,
                    opacity: .55,
                    flex: '0 0 auto',
                  }}
                >
                  {volume === 0 ? '×' : '♪'}
                </span>

                <input
                  aria-label="音量"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volume}
                  onChange={event =>
                    setVolume(Number(event.target.value))
                  }
                  style={{
                    width: '100%',
                    minWidth: 48,
                    margin: 0,
                  }}
                />
              </div>
            </div>
          </div>

          <audio
            ref={setAudioEl}
            src={current.audioUrl}
            preload="metadata"
            onTimeUpdate={event =>
              setCurrentTime(event.currentTarget.currentTime)
            }
            onLoadedMetadata={event =>
              setDuration(event.currentTarget.duration || 0)
            }
            onDurationChange={event =>
              setDuration(event.currentTarget.duration || 0)
            }
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={onEnded}
          />
        </div>
      ) : (
        <div
          style={{
            minHeight: 88,
            display: 'grid',
            placeItems: 'center',
            padding: '0 12px',
            textAlign: 'center',
            fontSize: 10.5,
            lineHeight: 1.6,
            opacity: .5,
            letterSpacing: '.05em',
          }}
        >
          {loaded
            ? 'MP3付きのSONG PARODYはまだありません'
            : 'LOADING...'}
        </div>
      )}
    </div>
  );
}
    void load();

    const off = subscribeGallery(() => {
      void load();
    });

    return () => {
      alive = false;
      off();
    };
  }, []);

  const current =
    tracks.find(track => track.id === currentId) ??
    (currentId === null ? undefined : tracks[0]);

  const chooseRandom = (excludeId?: string) => {
    if (!tracks.length) return;

    const pool =
      tracks.length > 1 && excludeId
        ? tracks.filter(track => track.id !== excludeId)
        : tracks;

    const next =
      pool[Math.floor(Math.random() * pool.length)] ??
      tracks[0];

    setCurrentId(next.id);
    setCurrentTime(0);
    setDuration(0);
  };

  useEffect(() => {
    if (!tracks.length) {
      setCurrentId(null);
      setPlaying(false);
      return;
    }

    if (!currentId || !tracks.some(track => track.id === currentId)) {
      const random =
        tracks[Math.floor(Math.random() * tracks.length)] ??
        tracks[0];

      setCurrentId(random.id);
    }
  }, [tracks, currentId]);

  useEffect(() => {
    if (!audioEl) return;

    if (playing && current?.audioUrl) {
      audioEl.play().catch(() => setPlaying(false));
    } else {
      audioEl.pause();
    }
  }, [playing, current?.audioUrl, audioEl]);

  useEffect(() => {
    if (!audioEl) return;

    audioEl.load();
    setCurrentTime(0);
    setDuration(0);
  }, [current?.audioUrl, audioEl]);

  const skip = () => {
    const keepPlaying = playing;
    chooseRandom(current?.id);
    setPlaying(keepPlaying);
  };

  const onEnded = () => {
    chooseRandom(current?.id);
    setPlaying(true);
  };

  return (
    <div
      className="panel widget music-widget"
      style={{
        margin: 0,
        position: 'relative',
        minHeight: 142,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h4 style={{ margin: 0 }}>NOW PLAYING</h4>

        {current && (
          <button
            type="button"
            className="more"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
            onClick={() => router.push(current.href)}
          >
            VIEW ›
          </button>
        )}
      </div>

      {current ? (
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            aria-label="この曲パロ作品を開く"
            onClick={() => router.push(current.href)}
            style={{
              width: 88,
              height: 88,
              flex: '0 0 88px',
              overflow: 'hidden',
              borderRadius: 8,
              background: 'rgba(127,127,127,.08)',
              border: 0,
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {current.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.coverUrl}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 9,
                  letterSpacing: '.12em',
                  opacity: .45,
                }}
              >
                NO COVER
              </div>
            )}
          </button>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 650,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={current.title}
            >
              {current.title}
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 10.5,
                opacity: .58,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={current.creator}
            >
              {current.creator}
            </div>

            <input
              aria-label="再生位置"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={event => {
                const value = Number(event.target.value);
                if (audioEl) audioEl.currentTime = value;
                setCurrentTime(value);
              }}
              style={{
                width: '100%',
                margin: '12px 0 2px',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9.5,
                opacity: .52,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{formatMusicTime(currentTime)}</span>
              <span>{formatMusicTime(duration)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 16,
                marginTop: 6,
              }}
            >
              <button
                type="button"
                aria-label="別の曲をランダム再生"
                onClick={skip}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  opacity: .72,
                  fontSize: 16,
                }}
              >
                ‹
              </button>

              <button
                type="button"
                aria-label={playing ? '一時停止' : '再生'}
                onClick={() => setPlaying(value => !value)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: '1px solid currentColor',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {playing ? 'Ⅱ' : '▶'}
              </button>

              <button
                type="button"
                aria-label="別の曲をランダム再生"
                onClick={skip}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  opacity: .72,
                  fontSize: 16,
                }}
              >
                ›
              </button>
            </div>
          </div>

          <audio
            ref={setAudioEl}
            src={current.audioUrl}
            preload="metadata"
            onTimeUpdate={event =>
              setCurrentTime(event.currentTarget.currentTime)
            }
            onLoadedMetadata={event =>
              setDuration(event.currentTarget.duration || 0)
            }
            onDurationChange={event =>
              setDuration(event.currentTarget.duration || 0)
            }
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={onEnded}
          />
        </div>
      ) : (
        <div
          style={{
            minHeight: 88,
            display: 'grid',
            placeItems: 'center',
            padding: '0 12px',
            textAlign: 'center',
            fontSize: 10.5,
            lineHeight: 1.6,
            opacity: .5,
            letterSpacing: '.05em',
          }}
        >
          {loaded
            ? 'MP3付きのSONG PARODYはまだありません'
            : 'LOADING...'}
        </div>
      )}
    </div>
  );
}


/* ---------- D-DAY (4.12 — スケジューラー連携は第3段階) ---------- */
interface DdayItem { title: string; date: string; plusOne?: boolean }
function ddayLabel(date: string, plusOne?: boolean): { label: string; passed: boolean; near: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  // +1 Day: 開始日を1日目として数える記念日カウント (カップル記念日など) — 当日 = D+1
  if (plusOne && diff <= 0) return { label: `D+${-diff + 1}`, passed: true, near: false };
  if (diff === 0) return { label: 'D-DAY', passed: false, near: true };
  return diff > 0
    ? { label: `D-${diff}`, passed: false, near: diff <= 7 }
    : { label: `D+${-diff}`, passed: true, near: false };
}

export function DdayWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { editOn } = useMainStore();
  const { familyOf } = useFonts();
  const [open, setOpen] = useState(false);
  const items = (conf.settings.items as DdayItem[]) ?? [];
  // 日付表示(D-2·D+3 など) フォント・色 — 未指定なら既存のセリフ体の初期値を使用 (v2.0 ユーザー要望)
  // 「serif」は フォントライブラリの実際の固定フォントなので、エディターの初期オプションと値が常に一致する
  const dFontId = (conf.settings.fontId as string | undefined) ?? 'serif';
  const dColor = conf.settings.color as string | undefined;
  useEditEvent(conf.id, () => setOpen(true));   // 編集モードで右クリック → 設定 (v1.9)
  return (
    <div className="panel widget" style={{ cursor: isAdmin ? 'pointer' : undefined }}
      onClick={e => { if ((e.target as HTMLElement).closest('.modal-ov')) return; if (isAdmin && !editOn) setOpen(true); }}>
      <h4>D-DAY {isAdmin && <span className="more">管理 ›</span>}</h4>
      {items.map(it => {
        const d = ddayLabel(it.date, it.plusOne);
        return (
          <div className="dday-row" key={it.title}>
            <span>{it.title}</span>
            <b className={d.near && !dColor ? 'd-red' : ''}
              style={{ fontFamily: familyOf(dFontId), color: dColor }}>{d.label}</b>
          </div>
        );
      })}
      {items.length === 0 && <p className="hint">登録されたD-DAYはありません</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="D-DAY管理"
        desc="追加・修正・削除・⠿ ドラッグで順序変更 — 環境設定「ウィジェット」からも管理できます"
        actions={<button className="btn btn-dark" onClick={() => setOpen(false)}>CLOSE</button>}>
        {open && <DdayEditor conf={conf} />}
      </Modal>
    </div>
  );
}

/* ---------- TO-DO — 管理者 クリック時に管理モーダル (4.12 確定) ---------- */
export function TodoWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { editOn, updateWidget } = useMainStore();
  const [open, setOpen] = useState(false);
  const items = (conf.settings.items as TodoSetItem[]) ?? [];
  useEditEvent(conf.id, () => setOpen(true));   // 編集モードで右クリック → 設定 (v1.9)

  const setItems = (next: TodoSetItem[]) => {
    updateWidget(conf.id, { settings: { ...conf.settings, items: next } }, { persist: true });
  };

  return (
    <div className="panel widget" style={{ cursor: isAdmin ? 'pointer' : undefined }}
      onClick={e => {
        if (!isAdmin || editOn) return;
        if ((e.target as HTMLElement).closest('.k-check') || (e.target as HTMLElement).closest('.modal-ov')) return;
        setOpen(true);
      }}>
      <h4>TO-DO {isAdmin && <span className="more">管理 ›</span>}</h4>
      {items.map((it, i) => (
        <label className={`todo-row k-check ${it.done ? 'done' : ''}`} key={`${it.text}-${i}`}
          style={!isAdmin ? { pointerEvents: 'none' } : undefined}>
          <input type="checkbox" checked={it.done}
            onChange={ev => setItems(items.map((x, j) => (j === i ? { ...x, done: ev.target.checked } : x)))} />
          <span className="box" /><span>{it.text}</span>
        </label>
      ))}
      {items.length === 0 && <p className="hint">やることはありません</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="TO-DO管理"
        desc="追加・チェック・削除・⠿ ドラッグで順序変更 — 環境設定「ウィジェット」からも管理できます">
        {open && <TodoEditor conf={conf} />}
        <div className="modal-actions">
          <button className="btn btn-dark" onClick={() => setOpen(false)}>CLOSE</button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- UPCOMING (今後の予定 — スケジューラー実データ, 4.12) ---------- */
export function UpcomingWidget() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { st } = useSched();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // 今日以降の予定 — 毎年繰り返しは今年の日付に換算して最も近い3件
  const upcoming = st.events
    .filter(e => isAdmin || e.visibility === 'public' || (e.visibility === 'member' && !!user))
    .map(e => {
      let d = e.start;
      if (e.repeat === 'yearly') {
        const thisYear = `${today.getFullYear()}-${e.start.slice(5)}`;
        d = thisYear >= todayStr ? thisYear : `${today.getFullYear() + 1}-${e.start.slice(5)}`;
      }
      return { e, d };
    })
    .filter(x => x.d >= todayStr)
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(0, 3);
  return (
    <div className="panel widget" style={{ cursor: 'var(--cur-pointer,pointer)' }} onClick={() => router.push('/cal')}>
      <h4>UPCOMING <span className="more">もっと見る ›</span></h4>
      {upcoming.map(({ e, d }) => (
        <div key={e.id} className="dday-row">
          <span>{d.slice(5).replace('-', '.')} · {e.title}</span>
          <b style={{ fontSize: 11, color: eventColor(e, st.cats) }}>●</b>
        </div>
      ))}
      {upcoming.length === 0 && <p className="hint">今後の予定はありません</p>}
    </div>
  );
}

/* ---------- 自由テキスト (v1.9 改編 — ユーザー確定) ----------
   パネルなしでテキストだけ表示 — フォント・サイズ・色・配置を指定し、装飾のように自由に配置（ウィジェットのドラッグ・サイズ変更共通）。
   編集は編集モードのみ — 右クリック「設定」 (v1.9 ユーザー確定: 通常時のクリック編集を削除). */
export function FreeTextWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { updateWidget } = useMainStore();
  const { fonts, familyOf } = useFonts();
  const [open, setOpen] = useState(false);
  const s = conf.settings as { text?: string; fontId?: string; size?: number; color?: string; align?: 'left' | 'center' | 'right'; bold?: boolean };
  const [draft, setDraft] = useState(s);
  useEditEvent(conf.id, () => { setDraft({ ...s }); setOpen(true); });
  return (
    <div>
      <p style={{
        fontFamily: familyOf(s.fontId) ?? 'var(--sans)',
        fontSize: s.size ?? 15, color: s.color ?? 'var(--page-desc)',
        textAlign: s.align ?? 'left', fontWeight: s.bold ? 700 : 400,
        lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0, wordBreak: 'keep-all',
      }}>
        {s.text || (isAdmin ? '自由テキスト — 編集モードで右クリック → 設定' : '')}
      </p>
      <Modal open={open} onClose={() => setOpen(false)} title="自由テキスト"
        desc="パネルなしでテキストだけ表示 — フォント・サイズ・色・配置を指定、配置は編集モードでドラッグ"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => {
            updateWidget(conf.id, { settings: { ...conf.settings, ...draft } }, { persist: true }); setOpen(false);
          }}>SAVE</button>
        </>}>
        <div style={{ display: 'grid', gap: 10 }}>
          <KTextarea value={draft.text ?? ''} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <KSelect minWidth={170} value={draft.fontId ?? 'default'}
              onChange={v => setDraft(d => ({ ...d, fontId: v }))}
              options={fonts.map(f => ({ value: f.id, label: <span style={{ fontFamily: familyOf(f.id) }}>{f.name}</span> }))} />
            <span className="cp-lb">サイズ</span>
            <KStep value={draft.size ?? 15} min={10} max={64} step={1} suffix="px"
              onChange={v => setDraft(d => ({ ...d, size: v }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="cp-lb">文字色</span>
            <ColorField value={draft.color ?? '#5d636d'} onChange={hex => setDraft(d => ({ ...d, color: hex }))} />
            <div className="mini-seg">
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} className={(draft.align ?? 'left') === a ? 'on' : ''}
                  onClick={() => setDraft(d => ({ ...d, align: a }))}>
                  {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
                </button>
              ))}
            </div>
            <KCheck label="太字" checked={!!draft.bold} onChange={v => setDraft(d => ({ ...d, bold: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- 装飾画像 — パネルなしで画像のみ (装飾用) ---------- */
/** 比率維持（切り取りなし）表示 — cover（トリミング）と選択式 (v1.9 ユーザー要望)
 *  角丸はウィジェット枠ではなく **画像サイズ**に合わせて適用 (v1.9 ユーザーフィードバック — 余白まで丸めると効果が分かりにくいため) */
function ContainImg({ fileRef, rounded }: { fileRef: unknown; rounded: boolean }) {
  const url = useBlobUrl(safeFileRef(fileRef));
  if (!url) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" draggable={false}
        style={{
          maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block',
          borderRadius: rounded ? 'var(--radius)' : 0,
        }} />
    </div>
  );
}

export function DecoWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { editOn } = useMainStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rounded = (conf.settings.rounded as boolean) ?? true;
  const fit = (conf.settings.fit as 'cover' | 'contain') ?? 'cover';   // 全面表示（切り取りあり） / 比率維持 (v1.9)
  // 複数枚スライド (v2.0) — 1枚だけだった旧データも同じ一覧として読み込む
  const slides = decoSlides(conf.settings);
  const sec = (conf.settings.interval as number) ?? 5;
  const [idx, setIdx] = useState(0);
  const cur = slides[Math.min(idx, slides.length - 1)];
  // 自動切り替え — 編集中または設定モーダル表示中は停止 (位置調整中のため)
  useEffect(() => {
    if (slides.length < 2 || editOn || open) return;
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), Math.max(1, sec) * 1000);
    return () => clearInterval(t);
  }, [slides.length, sec, editOn, open]);
  useEffect(() => { if (idx >= slides.length) setIdx(0); }, [slides.length, idx]);
  useEditEvent(conf.id, () => setOpen(true));   // 編集は編集モードの右クリック「設定」のみ (v1.9 ユーザー確定)
  // リンク遷移 (v1.9 — 画像+リンクをウィジェット枠なしで表示) — リンクはスライドごとに個別設定 (v2.0)
  const onBody = () => {
    if (editOn) return;
    if (cur?.link) {
      const l = normalizeInternalLink(cur.link);
      if (/^https?:\/\//.test(l)) window.open(l, '_blank');
      else router.push(l);
    }
  };
  return (
    <div className="deco-wgt"
      style={{
        position: 'relative', width: '100%', height: '100%', minHeight: 80, overflow: 'hidden',
        aspectRatio: conf.h == null ? '1/1' : undefined, // サイズ 固定前の初期値は正方形
        borderRadius: rounded ? 'var(--radius)' : 0,
        cursor: !editOn && cur?.link ? 'var(--cur-pointer,pointer)' : undefined,
      }}
      onClick={onBody}>
      {cur
        ? (fit === 'contain'
          ? <ContainImg key={cur.id} fileRef={cur.imgId} rounded={rounded} />
          : <CroppedBlobImg key={cur.id} fileRef={cur.imgId} crop={cur.crop} ph="" />)
        : (
          <div className="ph" style={{ position: 'absolute', inset: 0 }}>
            <span style={{ fontSize: 10 }}>{isAdmin ? 'DECO — 編集モードで右クリック → 設定' : 'DECO'}</span>
          </div>
        )}
      {/* 複数枚のときだけ現在位置を表示 — クリックで直接切り替え可能 (v2.0) */}
      {slides.length > 1 && !editOn && (
        <div className="deco-dots" onClick={e => e.stopPropagation()}>
          {slides.map((sl, i) => (
            <i key={sl.id} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
      <div onClick={e => e.stopPropagation()}>
        <Modal open={open} onClose={() => setOpen(false)} small title="装飾画像"
          desc="複数枚を入れると順番に切り替わります — 位置トリミングは現在のウィジェット比率を基準にし、元画像は切り取られません">
          {open && <DecoEditor conf={conf} onClose={() => setOpen(false)} />}
        </Modal>
      </div>
    </div>
  );
}

/* ---------- 付箋メモミニボード (4.6) — 読み取り専用の縮小ボード、クリックで /memo ---------- */
export function MemoBoardWidget() {
  const router = useRouter();
  const [memos] = useLocalList<StickyMemo>('ohome.memo.v1', MEMO_SEED);
  const [settings] = useMemoSettings();
  return (
    <div className="panel widget" style={{ display: 'flex', flexDirection: 'column' }}>
      <h4>STICKY</h4>
      <div className="memo-mini" onClick={() => router.push('/memo')}>
        {memos.map(m => (
          <div key={m.id} className="postit"
            style={{
              left: `${m.x}%`, top: `${m.y}%`, zIndex: m.z,
              transform: `rotate(${m.rot}deg)`, background: m.color,
              width: Math.round(MEMO_SIZE_W[m.size] * 0.53),
            }}>
            {settings.showAuthor && <b>{m.author}</b>}
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- タイプ → レンダラー ---------- */
export function renderWidget(conf: WidgetConf) {
  switch (conf.type) {
    case 'banner': return <BannerWidget conf={conf} />;
    case 'menu': return <MenuListWidget />;
    case 'memo': return <MemoWidget conf={conf} />;
    case 'diary': return <DiaryWidget />;
    case 'latest': return <LatestWidget />;
    case 'music': return <MusicWidget conf={conf} />;
    case 'dday': return <DdayWidget conf={conf} />;
    case 'todo': return <TodoWidget conf={conf} />;
    case 'upcoming': return <UpcomingWidget />;
    case 'freetext': return <FreeTextWidget conf={conf} />;
    case 'deco': return <DecoWidget conf={conf} />;
    case 'memoboard': return <MemoBoardWidget />;
    default: return <div className="panel widget"><h4>{WIDGET_META[conf.type]?.title ?? conf.type}</h4></div>;
  }
}
