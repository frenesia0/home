'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED, charGrant, charWithAu, Relation, REL_SEED } from '@/lib/charStore';
import { sanitizeHtml } from '@/lib/sanitize';
import { useFonts } from '@/lib/fontStore';
import { useTheme } from '@/lib/ThemeProvider';
import { useBlobUrl } from '@/lib/blobStore';
import { CropImg } from '@/components/ui/CropEditor';

const textOf = (c: Character) => `${c.id} ${c.name} ${c.sub}`.toLowerCase();
const isShiki = (c: Character) => textOf(c).includes('shiki') || textOf(c).includes('シキ');
const isSolas = (c: Character) => textOf(c).includes('solas') || textOf(c).includes('ソラス');

function ProfileArt({
  fullRef,
  bustRef,
  bustCrop,
  alt,
  mobileFull,
}: {
  fullRef?: string;
  bustRef?: string;
  bustCrop?: import('@/components/ui/CropEditor').CropValue;
  alt: string;
  mobileFull: boolean;
}) {
  const fullUrl = useBlobUrl(fullRef);
  const bustUrl = useBlobUrl(bustRef ?? fullRef);
  const mobileUrl = bustUrl ?? fullUrl;

  if (!fullUrl && !mobileUrl) {
    return <div className="char-art-empty">CHARACTER ART</div>;
  }

  return (
    <>
      {fullUrl && <img className={`char-art-full ${mobileFull ? 'mobile-show' : ''}`} src={fullUrl} alt={alt} draggable={false} />}
      {!mobileFull && mobileUrl && (
        <div className="char-art-bust">
          <CropImg src={mobileUrl} crop={bustCrop} />
        </div>
      )}
    </>
  );
}

function CharacterDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { user, isAdmin } = useAuth();
  const [chars, , loaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [rels] = useLocalList<Relation>('ohome.rels.v1', REL_SEED);
  const { familyOf } = useFonts();
  const { setPageTheme } = useTheme();
  const [playingVoice, setPlayingVoice] = useState<number | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');
  const [mobileFull, setMobileFull] = useState(false);

  const effectiveChars = chars.length > 0 ? chars : CHAR_SEED;
  const ch = effectiveChars.find(c => c.id === id);
  const [auKey, setAuKey] = useState<string | null>(() => params.get('au'));
  const charAus = useMemo(() => ch ? rels.flatMap(r => r.members.some(m => m.charId === ch.id)
    ? r.aus.filter(a => a.id !== 'base').map(a => ({ key: `${r.id}:${a.id}`, label: a.label }))
    : []) : [], [rels, ch]);
  const eff = ch ? charWithAu(ch, auKey) : undefined;
  const auRegistered = !auKey || !!ch?.auProfiles?.[auKey];

  useEffect(() => {
    const color = auRegistered && eff?.themeMode === 'custom' ? eff.color : null;
    setPageTheme(color);
    return () => setPageTheme(null);
  }, [auRegistered, eff, setPageTheme]);

  const basicHtml = useMemo(
    () => loaded && eff ? sanitizeHtml(eff.basicHtml) : '',
    [loaded, eff]
  );

  const seedQuote = CHAR_SEED.find(c => c.id === ch?.id)?.quote ?? '';
  const seedCv = CHAR_SEED.find(c => c.id === ch?.id)?.cv ?? '';
  const displayQuote = useMemo(
    () => (eff?.quote?.trim() || seedQuote.trim()),
    [eff?.quote, seedQuote]
  );

  useEffect(() => {
    const first = eff?.outfits?.find(o => o.isDefault) ?? eff?.outfits?.[0];
    setSelectedOutfitId(first?.id ?? '');
    setMobileFull(false);
  }, [eff?.id]);

  if (!loaded) return <section className="page" />;
  if (!ch || !eff) return <section className="page"><p>キャラクターが見つかりません。</p></section>;
  if (ch.visibility === 'private' && !isAdmin) return <section className="page"><p>非公開のキャラクターです。</p></section>;
  if (ch.visibility === 'member' && !user) return <section className="page"><p>メンバー限定公開です。</p></section>;

  const visible = effectiveChars.filter(
    c =>
      c.own &&
      (
        isAdmin ||
        c.visibility === 'public' ||
        (c.visibility === 'member' && !!user)
      )
  );
  const shiki = visible.find(isShiki);
  const solas = visible.find(isSolas);
  const outfits = eff.outfits?.length
    ? [...eff.outfits].sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault))
    : [];
  const defaultOutfit = outfits.find(o => o.isDefault) ?? outfits[0];
  const selectedOutfit = outfits.find(o => o.id === selectedOutfitId) ?? defaultOutfit;
  const fullRef = selectedOutfit?.fullImageId ?? eff.profileFullId ?? eff.arts?.[0] ?? eff.artId;
  const bustRef = selectedOutfit?.bustImageId ?? eff.profileBustId ?? eff.profileFullId ?? eff.arts?.[0] ?? eff.artId;
  const bustCrop = selectedOutfit?.bustCrop;
  const galleryCharacter = isSolas(ch) ? 'solas' : 'shiki';
  const editHref = auKey ? `/character/${ch.id}/edit?au=${encodeURIComponent(auKey)}` : `/character/${ch.id}/edit`;
  const voices = Array.from({ length: 3 }, (_, i) => ({
    label: eff.voices?.[i]?.label?.trim() || `SAMPLE ${String(i + 1).padStart(2, '0')}`,
    audioUrl: '',
  }));


  if (auKey && !auRegistered) {
    return (
      <section className="page character-page">
        <button className="au-back" onClick={() => setAuKey(null)}>← ORIGINAL</button>
        <div className="au-empty">このAUの「{ch.name}」はまだ登録されていません。</div>
      </section>
    );
  }

  return (
    <section className="page character-page">
      <div className="char-head">
        <h1>CHARACTER</h1>
        <div className="char-switch">
          <button className={isShiki(ch) ? 'on' : ''} disabled={!shiki} onClick={() => shiki && router.push(`/character/${shiki.id}`)}>SHIKI</button>
          <span>/</span>
          <button className={isSolas(ch) ? 'on' : ''} disabled={!solas} onClick={() => solas && router.push(`/character/${solas.id}`)}>SOLAS</button>
        </div>
        {(isAdmin || charGrant(ch, user?.id) === 'edit') && (
          <div className="char-admin">
            <button className="btn btn-dark" onClick={() => router.push(editHref)}>EDIT</button>
          </div>
        )}
      </div>

      {charAus.length > 0 && (
        <div className="au-switch">
          <button className={!auKey ? 'on' : ''} onClick={() => setAuKey(null)}>ORIGINAL</button>
          {charAus.map(a => <button key={a.key} className={auKey === a.key ? 'on' : ''} onClick={() => setAuKey(a.key)}>{a.label}</button>)}
        </div>
      )}

      <div className="char-hero" style={{ '--char-color': eff.color || '#8083D6' } as React.CSSProperties}>
        <div className="char-copy" style={{ fontFamily: familyOf(eff.bodyFontId) }}>
          <div
            className="char-name"
            style={{ fontSize: eff.nameSize ?? 54 }}
          >
            {eff.name}
          </div>
          {eff.sub && <div className="char-sub">{eff.sub}</div>}
          {(eff.cv?.trim() || seedCv) && (
            <div className="char-cv">{eff.cv?.trim() || seedCv}</div>
          )}

          {basicHtml && <div className="char-intro prose" dangerouslySetInnerHTML={{ __html: basicHtml }} />}

          <section className="profile-section">
            <h2>PROFILE</h2>
            <dl>
              {eff.specs.map(s => <React.Fragment key={`${s.label}-${s.value}`}><dt>{s.label}</dt><dd>{s.value}</dd></React.Fragment>)}
            </dl>
          </section>

          <section className="voice-section">
            <h2>VOICE</h2>
            <div className="voice-grid">
              {voices.map((v, i) => (
                <button key={i} disabled={!v.audioUrl} className={playingVoice === i ? 'playing' : ''} onClick={() => {
                  if (!v.audioUrl) return;
                  const audio = new Audio(v.audioUrl);
                  setPlayingVoice(i);
                  audio.play().catch(() => setPlayingVoice(null));
                  audio.addEventListener('ended', () => setPlayingVoice(null), { once: true });
                }}>
                  <span>{playingVoice === i ? 'Ⅱ' : '▶'}</span>{v.label}
                </button>
              ))}
            </div>
          </section>

          <button className="gallery-link" onClick={() => router.push(`/gallery?character=${galleryCharacter}`)}>
            VIEW GALLERY <span>→</span>
          </button>
        </div>

        <div className={`char-art ${mobileFull ? 'is-mobile-full' : ''}`}>
          <div className="char-glow" />
          {displayQuote && (
            <blockquote className="quote-vertical" aria-label="キャラクター台詞">
              {displayQuote.split(/\n+/).filter(Boolean).map((line, i) => (
                <span key={`${line}-${i}`}>{line}</span>
              ))}
            </blockquote>
          )}
          <ProfileArt fullRef={fullRef} bustRef={bustRef} bustCrop={bustCrop} alt={eff.name} mobileFull={mobileFull} />
          {fullRef && bustRef && (
            <button
              className="mobile-full-toggle"
              onClick={() => setMobileFull(v => !v)}
              aria-label={mobileFull ? '腰上表示に戻す' : '全身立ち絵を表示'}
              title={mobileFull ? '腰上表示に戻す' : '全身立ち絵を表示'}
            >
              {mobileFull ? '⤡' : '⤢'}
            </button>
          )}
          {outfits.length > 1 && (
            <div className="outfit-switch" aria-label="衣装切替">
              {outfits.map((o, i) => (
                <button
                  key={o.id}
                  className={(selectedOutfit?.id ?? defaultOutfit?.id) === o.id ? 'on' : ''}
                  onClick={() => { setSelectedOutfitId(o.id); setMobileFull(false); }}
                >
                  <small>{String(i + 1).padStart(2, '0')}</small>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="char-bottom-switch">
        <button className={isShiki(ch) ? 'on' : ''} disabled={!shiki} onClick={() => shiki && router.push(`/character/${shiki.id}`)}><small>01</small> SHIKI</button>
        <i />
        <button className={isSolas(ch) ? 'on' : ''} disabled={!solas} onClick={() => solas && router.push(`/character/${solas.id}`)}><small>02</small> SOLAS</button>
      </div>

      <style jsx>{`
@font-face{font-family:"SmartFontUI";src:url("/fonts/smartfont-ui.otf") format("opentype");font-weight:400;font-style:normal;font-display:swap}

        .character-page{max-width:1240px;margin:0 auto;padding-top:30px;padding-bottom:70px;font-family:"SmartFontUI",-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif}.char-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-bottom:14px}.char-head h1{margin:0;font-size:12px;letter-spacing:.18em;color:var(--faint)}.char-switch{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.14em}.char-switch button{padding:5px 2px;color:var(--faint);border-bottom:1px solid transparent}.char-switch button.on{color:var(--text);border-color:currentColor}.char-switch span{opacity:.25}.char-admin{justify-self:end;display:flex;gap:8px}.au-switch{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-bottom:10px}.au-switch button{padding:6px 10px;border:1px solid var(--line);border-radius:999px;color:var(--faint);font-size:9px}.au-switch button.on{color:var(--text);border-color:var(--accent)}.char-hero{display:grid;grid-template-columns:minmax(400px,.92fr) minmax(420px,1.08fr);min-height:min(760px,calc(100vh - 150px));overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.char-copy{z-index:3;align-self:center;padding:52px 42px 48px 16px}.char-name{font-family:"Yu Gothic","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;font-weight:800;line-height:1.08;letter-spacing:.045em;overflow-wrap:anywhere;color:var(--char-color);text-shadow:0 1px 18px rgba(0,0,0,.24)}.char-sub{margin-top:8px;color:rgba(236,239,246,.78);font-size:12px;letter-spacing:.08em}.char-cv{margin-top:8px;color:rgba(242,244,249,.84);font-size:12px;font-weight:700;letter-spacing:.08em}.char-copy blockquote{margin:0}.quote-ribbons{display:grid;gap:7px;justify-items:start}
.quote-ribbons span{display:inline-block;max-width:100%;padding:7px 12px;background:color-mix(in srgb,var(--char-color) 74%,#12141a);color:#fff;font-size:13.5px;line-height:1.65;font-weight:700;letter-spacing:.02em;box-shadow:6px 6px 0 rgba(0,0,0,.12)}
.char-intro{margin-bottom:30px;color:rgba(248,249,252,.96);font-size:14px;line-height:2;font-weight:600}.profile-section,.voice-section{margin-top:28px}.profile-section h2,.voice-section h2{margin:0 0 14px;color:rgba(232,234,240,.82);font-size:10px;font-weight:600;letter-spacing:.18em}.profile-section dl{display:grid;grid-template-columns:112px 1fr;margin:0;border-top:1px solid var(--line)}.profile-section dt,.profile-section dd{min-height:38px;margin:0;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.28);font-size:12px;line-height:1.55}.profile-section dt{color:rgba(225,228,236,.86);letter-spacing:.08em;text-transform:uppercase;font-weight:700}.profile-section dd{color:rgba(248,249,252,.96);font-weight:600}.voice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.voice-grid button{min-height:38px;padding:8px 10px;border:1px solid rgba(220,224,232,.28);border-radius:999px;color:rgba(225,228,235,.76);font-size:9px;letter-spacing:.06em}.voice-grid button span{margin-right:6px}.voice-grid button:disabled{opacity:.35;cursor:default}.voice-grid button.playing{border-color:var(--char-color);color:var(--text)}.gallery-link{width:100%;min-height:46px;margin-top:22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(220,224,232,.28);border-bottom:1px solid rgba(220,224,232,.28);color:rgba(244,245,248,.9);font-size:10px;letter-spacing:.16em}.char-art{position:relative;min-width:0;min-height:700px;margin-bottom:52px}.char-glow{position:absolute;inset:12% 0 0 4%;background:radial-gradient(circle at 55% 42%,color-mix(in srgb,var(--char-color) 24%,transparent),transparent 58%);filter:blur(16px);opacity:.75}.char-art :global(.char-art-full){position:absolute;z-index:2;right:0;bottom:0;width:auto;height:min(108%,820px);max-width:100%;object-fit:contain;filter:drop-shadow(0 24px 34px rgba(0,0,0,.22))}.char-art :global(.char-art-bust){display:none}.char-art :global(.char-art-empty){position:absolute;inset:0;display:grid;place-items:center;color:var(--faint);font-size:10px;letter-spacing:.14em}.outfit-switch{position:absolute;z-index:5;top:calc(100% + 12px);left:0;right:0;display:flex;justify-content:center;gap:6px;max-width:none;overflow-x:auto;padding:4px 4px 12px}.outfit-switch button{white-space:nowrap;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--faint);font-size:9px;letter-spacing:.08em;background:rgba(20,22,28,.72);backdrop-filter:blur(8px)}.outfit-switch button.on{color:var(--text);border-color:var(--char-color)}.outfit-switch small{margin-right:5px;opacity:.6}.mobile-full-toggle{display:none}
.char-bottom-switch{margin-top:24px;display:flex;justify-content:center;align-items:center;gap:18px}.char-bottom-switch button{display:flex;align-items:baseline;gap:8px;color:var(--faint);font-size:10px;letter-spacing:.14em}.char-bottom-switch button.on{color:var(--text)}.char-bottom-switch small{font-size:8px;opacity:.55}.char-bottom-switch i{width:44px;height:1px;background:var(--line)}.au-back{margin-bottom:18px;color:var(--faint);font-size:10px}.au-empty{padding:60px 18px;text-align:center;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
        @media(max-width:900px){
.character-page{padding-top:18px}
.char-head{grid-template-columns:1fr auto}
.char-switch{grid-column:1/-1;grid-row:2;justify-content:center;margin-top:10px}
.char-admin{grid-column:2;grid-row:1}
.char-hero{display:flex;flex-direction:column;min-height:0;overflow:visible;border-top:0}
.char-art{order:1;width:min(100%,540px);aspect-ratio:3 / 4;height:auto;min-height:0;margin:0 auto;overflow:visible;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.char-art :global(.char-art-full){display:none}
.char-art :global(.char-art-bust){display:block;position:absolute;z-index:2;inset:0;width:100%;height:100%;overflow:hidden;filter:drop-shadow(0 18px 24px rgba(0,0,0,.18))}
.char-art :global(.char-art-bust > *){width:100%;height:100%}
.char-art.is-mobile-full{width:100vw;max-width:none;margin-left:calc(50% - 50vw);aspect-ratio:auto;height:calc(100svh - 210px);min-height:650px;overflow:hidden;border-top:0;background:radial-gradient(circle at 50% 32%,color-mix(in srgb,var(--char-color) 16%,transparent),transparent 60%)}
.char-art.is-mobile-full :global(.char-art-full.mobile-show){display:block;position:absolute;z-index:2;left:50%;bottom:-1%;top:auto;width:auto;height:103%;max-width:none;object-fit:contain;transform:translateX(-50%);filter:drop-shadow(0 26px 34px rgba(0,0,0,.24))}
.mobile-full-toggle{display:grid;place-items:center;position:absolute;z-index:7;right:14px;bottom:14px;width:48px;height:48px;padding:0;border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(18,20,26,.78);color:#fff;font-size:25px;font-weight:400;line-height:1;backdrop-filter:blur(8px)}
.outfit-switch{position:absolute;top:calc(100% + 12px);left:0;right:0;display:flex;justify-content:center;gap:7px;max-width:none;overflow-x:auto;padding:0 2px 10px}
.outfit-switch button{flex:0 0 auto;padding:8px 11px;font-size:9px}
.quote-vertical{top:28px;right:10px;gap:5px}
.quote-vertical span{max-height:390px;padding:8px 5px;font-size:10.5px;line-height:1.55;letter-spacing:.02em}
.char-art.is-mobile-full .quote-vertical{top:48px;right:14px}
.char-copy{order:2;padding:70px 2px 28px}
.char-name{font-size:clamp(26px,8vw,34px)!important;letter-spacing:.035em}
.char-cv{font-size:11px;margin-top:6px}
.char-copy blockquote{margin-top:20px}.quote-vertical{position:absolute;z-index:6;top:70px;right:8px;margin:0;padding:0;display:flex;flex-direction:row-reverse;align-items:flex-start;gap:7px;pointer-events:none}
.quote-vertical span{display:block;writing-mode:vertical-rl;text-orientation:upright;max-height:520px;padding:10px 7px;background:color-mix(in srgb,var(--char-color) 78%,#151821);color:#fff;font-size:12.5px;line-height:1.65;font-weight:700;letter-spacing:.04em;box-shadow:5px 5px 0 rgba(0,0,0,.12)}
.quote-ribbons{display:grid;gap:7px;justify-items:start}
.quote-ribbons span{display:inline-block;max-width:100%;padding:7px 12px;background:color-mix(in srgb,var(--char-color) 74%,#12141a);color:#fff;font-size:13.5px;line-height:1.65;font-weight:700;letter-spacing:.02em;box-shadow:6px 6px 0 rgba(0,0,0,.12)}
.char-intro{font-size:14px;line-height:1.95}
.profile-section dl{grid-template-columns:100px 1fr}
.profile-section dt,.profile-section dd{font-size:12.5px}
.voice-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.voice-grid button{min-width:0;min-height:42px;padding:7px 5px;text-align:center;font-size:8.5px;letter-spacing:.02em}
.voice-grid button span{margin-right:3px}
.char-bottom-switch{margin-top:18px}
}
      `}</style>
    </section>
  );
}

export default function CharacterDetailPage(){return <Suspense fallback={<section className="page"/>}><CharacterDetailInner/></Suspense>}
