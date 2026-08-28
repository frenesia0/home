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
const fallbackEnName = (c: Character) =>
  c.id === 'shiki-hakray'
    ? 'Shiki Hakray'
    : c.id === 'solas-frenesia'
      ? 'Solas Frenesia'
      : c.name;



function useResolvedImage(ref?: string) {
  const blobUrl = useBlobUrl(ref);
  if (!ref) return undefined;
  if (/^(?:https?:|data:|blob:)/.test(ref)) return ref;
  return blobUrl;
}

function cloudinaryDeliveryUrl(ref?: string, transform = 'w_1400,c_limit,q_auto:best,f_auto') {
  if (!ref || !/^https?:\/\//.test(ref) || !ref.includes('/upload/')) return ref;
  return ref.replace('/upload/', `/upload/${transform}/`);
}


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
  const fullUrl = useResolvedImage(fullRef);
  const bustUrl = useResolvedImage(bustRef);
  const [bustFailed, setBustFailed] = useState(false);

  useEffect(() => {
    setBustFailed(false);
  }, [bustUrl, fullUrl]);

  // 4800×6400級PNGはiPhone Safariで展開メモリが大きくなりすぎ、
  // PCでは表示できてもモバイルだけ画像デコードに失敗することがある。
  // Cloudinary原本は変更せず、モバイル表示時だけ軽量な配信URLを使う。
  const mobileBustUrl = cloudinaryDeliveryUrl(bustUrl, 'w_1400,c_limit,q_auto:best,f_auto');
  const mobileFullUrl = cloudinaryDeliveryUrl(fullUrl, 'w_1600,c_limit,q_auto:best,f_auto');
  const mobileUrl = !bustFailed && mobileBustUrl ? mobileBustUrl : mobileFullUrl;

  if (!fullUrl && !mobileUrl) {
    return <div className="char-art-empty">CHARACTER ART</div>;
  }

  return (
    <>
      {fullUrl && (
        <>
          <img
            className={`char-art-full desktop-art ${mobileFull ? 'mobile-show' : ''}`}
            src={fullUrl}
            alt={alt}
            draggable={false}
          />
          {mobileFullUrl && (
            <img
              className="char-art-full mobile-art"
              src={mobileFullUrl}
              alt={alt}
              draggable={false}
            />
          )}
        </>
      )}

      {!mobileFull && mobileUrl && (
        <div className="char-art-bust">
          <img
            className="char-art-bust-img"
            src={mobileUrl}
            alt={alt}
            draggable={false}
            onError={() => {
              if (mobileUrl === mobileBustUrl && mobileFullUrl) setBustFailed(true);
            }}
          />
        </div>
      )}
    </>
  );
}

function SignatureOverlay({ signRef, alt }: { signRef?: string; alt: string }) {
  const signUrl = useResolvedImage(signRef);
  if (!signUrl) return null;

  return (
    <img
      className="char-sign"
      src={signUrl}
      alt={alt}
      draggable={false}
    />
  );
}

function CharacterDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { user, isAdmin } = useAuth();
  const [chars, , loaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [rels] = useLocalList<Relation>('ohome.rels.v1', REL_SEED);
  useFonts();
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
  const signRef = eff.signId;
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
    <section
      className="page character-page"
      style={{ '--char-color': eff.color || '#8083D6' } as React.CSSProperties}
    >
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
        <div className="char-copy">
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
          <div className="char-name-rule">
            <span>{eff.enName?.trim() || fallbackEnName(eff)}</span>
          </div>

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
              {displayQuote.split(/\n+/).filter(Boolean).map((line, i) => {
                const verticalLine = line.replace(/(?:…{2,}|\.{3,})/g, '︙');
                return (
                  <span
                    key={`${line}-${i}`}
                    className={line.length > 28 ? 'is-long' : ''}
                  >
                    {verticalLine}
                  </span>
                );
              })}
            </blockquote>
          )}
          <ProfileArt fullRef={fullRef} bustRef={bustRef} bustCrop={bustCrop} alt={eff.name} mobileFull={mobileFull} />
          {signRef && (
            <SignatureOverlay signRef={signRef} alt={`${eff.name} sign`} />
          )}
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
@font-face{font-family:"SmartFontUI";src:url("/fonts/03スマートフォントUI.otf") format("opentype");font-weight:400;font-style:normal;font-display:swap}

        .character-page{max-width:1240px;margin:0 auto;padding-top:30px;padding-bottom:70px;font-family:"SmartFontUI",-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif}.char-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-bottom:14px}.char-head h1{margin:0;font-size:12px;letter-spacing:.18em;color:var(--faint)}.char-switch{display:flex;align-items:center;gap:12px;font-size:11px;letter-spacing:.14em}.char-switch button{padding:7px 4px;color:rgba(245,247,252,.72);border-bottom:2px solid transparent;font-weight:700;opacity:1}.char-switch button:hover{color:#fff}.char-switch button.on{color:var(--char-color)!important;border-color:var(--char-color)!important;text-shadow:0 0 14px color-mix(in srgb,var(--char-color) 44%,transparent)}.char-switch span{opacity:.5;color:rgba(255,255,255,.62)}.char-admin{justify-self:end;display:flex;gap:8px}.au-switch{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-bottom:10px}.au-switch button{padding:6px 10px;border:1px solid var(--line);border-radius:999px;color:var(--faint);font-size:9px}.au-switch button.on{color:var(--text);border-color:var(--accent)}.char-hero{display:grid;grid-template-columns:minmax(420px,.96fr) minmax(420px,1.04fr);min-height:min(760px,calc(100vh - 150px));overflow:visible;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.char-copy{z-index:3;align-self:start;padding:40px 50px 48px 16px}.char-name{font-family:"Yu Gothic","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;font-weight:800;line-height:1.08;letter-spacing:.045em;overflow-wrap:anywhere;color:var(--char-color);text-shadow:0 1px 18px rgba(0,0,0,.24)}.char-sub{margin-top:12px;color:rgba(236,239,246,.78);font-size:12.5px;letter-spacing:.08em}.char-cv{margin-top:10px;color:rgba(242,244,249,.9);font-size:12.5px;font-weight:700;letter-spacing:.08em}.char-name-rule{position:relative;height:20px;margin:10px 0 24px;border-top:1px solid rgba(255,255,255,.42)}.char-name-rule span{position:absolute;right:0;top:-16px;padding:0;background:transparent;color:#fff;font-family:"SmartFontUI","03SmartFontUI","03スマートフォントUI","Yu Gothic",sans-serif;font-size:13.5px;font-style:normal;font-weight:700;letter-spacing:.04em;text-shadow:0 1px 3px rgba(0,0,0,.55)}.char-copy blockquote{margin:0}.quote-ribbons{display:grid;gap:7px;justify-items:start}
.quote-ribbons span{display:inline-block;max-width:100%;padding:7px 12px;background:color-mix(in srgb,var(--char-color) 74%,#12141a);color:#fff;font-size:13.5px;line-height:1.65;font-weight:700;letter-spacing:.02em;box-shadow:6px 6px 0 rgba(0,0,0,.12)}
.char-intro{margin-top:24px;margin-bottom:38px;color:rgba(248,249,252,.98);font-size:15px;line-height:2.08;font-weight:600}.profile-section,.voice-section{margin-top:30px}.profile-section h2,.voice-section h2{margin:0 0 12px;color:rgba(232,234,240,.86);font-size:10.5px;font-weight:700;letter-spacing:.2em}.profile-section dl{display:grid;grid-template-columns:126px 1fr;margin:0;border-top:1px solid rgba(255,255,255,.42);border-bottom:1px solid rgba(255,255,255,.16)}.profile-section dt,.profile-section dd{min-height:44px;margin:0;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.18);line-height:1.45}.profile-section dt{position:relative;padding-left:12px;color:rgba(215,219,231,.74);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}.profile-section dt::before{content:"";position:absolute;left:0;top:14px;width:3px;height:15px;background:var(--char-color);border-radius:999px}.profile-section dd{color:rgba(250,250,252,.98);font-size:15.5px;font-weight:700;letter-spacing:.015em}.profile-section dt:nth-last-of-type(1),.profile-section dd:nth-last-of-type(1){border-bottom:0}.voice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.voice-grid button{min-height:38px;padding:8px 10px;border:1px solid rgba(220,224,232,.28);border-radius:999px;color:rgba(225,228,235,.76);font-size:9px;letter-spacing:.06em}.voice-grid button span{margin-right:6px}.voice-grid button:disabled{opacity:.35;cursor:default}.voice-grid button.playing{border-color:var(--char-color);color:var(--text)}.gallery-link{width:100%;min-height:46px;margin-top:22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(220,224,232,.28);border-bottom:1px solid rgba(220,224,232,.28);color:rgba(244,245,248,.9);font-size:10px;letter-spacing:.16em}.char-art{position:relative;min-width:0;min-height:720px;margin-bottom:52px;overflow:visible;padding-top:18px}.char-glow{position:absolute;inset:12% 0 0 4%;background:radial-gradient(circle at 55% 42%,color-mix(in srgb,var(--char-color) 24%,transparent),transparent 58%);filter:blur(16px);opacity:.75}.char-art :global(.char-art-full){position:absolute;z-index:2;right:8px;bottom:0;width:auto;height:min(102%,775px);max-width:100%;object-fit:contain;filter:drop-shadow(0 24px 34px rgba(0,0,0,.22))}.char-art :global(.char-art-bust){display:none}
:global(.char-sign){
  position:absolute;
  z-index:7;
  right:-86px;
  bottom:-16px;
  width:clamp(520px,72%,820px);
  max-height:340px;
  object-fit:contain;
  pointer-events:none;
  opacity:.98;
  transform:rotate(-6deg);
  transform-origin:center;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,.18));
}.char-art :global(.char-art-empty){position:absolute;inset:0;display:grid;place-items:center;color:var(--faint);font-size:10px;letter-spacing:.14em}.outfit-switch{position:absolute;z-index:5;top:calc(100% + 12px);left:0;right:0;display:flex;justify-content:center;gap:6px;max-width:none;overflow-x:auto;padding:4px 4px 12px}.outfit-switch button{white-space:nowrap;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--faint);font-size:9px;letter-spacing:.08em;background:rgba(20,22,28,.72);backdrop-filter:blur(8px)}.outfit-switch button.on{color:var(--text);border-color:var(--char-color)}.outfit-switch small{margin-right:5px;opacity:.6}.mobile-full-toggle{display:none}

.quote-vertical{
  position:absolute;
  z-index:6;
  top:44px;
  right:16px;
  margin:0;
  padding:0;
  display:flex;
  flex-direction:row-reverse;
  align-items:flex-start;
  gap:9px;
  pointer-events:none;
}
.quote-vertical span{
  display:block;
  writing-mode:vertical-rl;
  text-orientation:upright;
  white-space:nowrap;
  padding:8px 5px 9px;
  background:color-mix(in srgb,var(--char-color) 82%,#151821);
  color:#fff;
  font-family:"Yu Gothic","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;
  font-size:18.5px;
  line-height:1.08;
  font-weight:800;
  letter-spacing:.015em;
  box-shadow:6px 7px 0 rgba(0,0,0,.14);
}
.quote-vertical span.is-long{
  padding:8px 5px;
  font-size:13px;
  line-height:1.1;
  letter-spacing:.01em;
}


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
:global(.char-sign){
  right:14px;
  bottom:14px;
  width:clamp(64px,19%,92px);
  max-height:62px;
  transform:rotate(-8deg);
}
.char-art.is-mobile-full :global(.char-sign){
  right:16px;
  bottom:22px;
  width:clamp(70px,18%,100px);
  max-height:68px;
}
.char-art.is-mobile-full{width:100vw;max-width:none;margin-left:calc(50% - 50vw);aspect-ratio:auto;height:calc(100svh - 210px);min-height:650px;overflow:hidden;border-top:0;background:radial-gradient(circle at 50% 32%,color-mix(in srgb,var(--char-color) 16%,transparent),transparent 60%)}
.char-art.is-mobile-full :global(.char-art-full.mobile-show){display:block;position:absolute;z-index:2;left:50%;bottom:-1%;top:auto;width:auto;height:103%;max-width:none;object-fit:contain;transform:translateX(-50%);filter:drop-shadow(0 26px 34px rgba(0,0,0,.24))}
.mobile-full-toggle{display:grid;place-items:center;position:absolute;z-index:7;right:14px;bottom:14px;width:48px;height:48px;padding:0;border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(18,20,26,.78);color:#fff;font-size:25px;font-weight:400;line-height:1;backdrop-filter:blur(8px)}
.outfit-switch{position:absolute;top:calc(100% + 12px);left:0;right:0;display:flex;justify-content:center;gap:7px;max-width:none;overflow-x:auto;padding:0 2px 10px}
.outfit-switch button{flex:0 0 auto;padding:8px 11px;font-size:9px}
.quote-vertical{top:24px;right:8px;gap:5px}
.quote-vertical span{padding:6px 3px 7px;font-size:13px;line-height:1.08;letter-spacing:.01em}
.quote-vertical span.is-long{font-size:9.5px;padding:6px 3px;line-height:1.12}
.char-art.is-mobile-full .quote-vertical{top:38px;right:12px}
.char-art.is-mobile-full .quote-vertical span{font-size:13.5px;padding:6px 3px 7px}
.char-copy{order:2;padding:64px 2px 28px}
.char-name{font-size:clamp(26px,8vw,34px)!important;letter-spacing:.035em}
.char-cv{font-size:11px;margin-top:6px}

.quote-ribbons{display:grid;gap:7px;justify-items:start}
.quote-ribbons span{display:inline-block;max-width:100%;padding:7px 12px;background:color-mix(in srgb,var(--char-color) 74%,#12141a);color:#fff;font-size:13.5px;line-height:1.65;font-weight:700;letter-spacing:.02em;box-shadow:6px 6px 0 rgba(0,0,0,.12)}
.char-intro{font-size:14px;line-height:1.98;margin-top:20px}
.profile-section dl{grid-template-columns:112px 1fr}
.profile-section dt{font-size:10px}
.profile-section dd{font-size:14px}
.voice-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.voice-grid button{min-width:0;min-height:42px;padding:7px 5px;text-align:center;font-size:8.5px;letter-spacing:.02em}
.voice-grid button span{margin-right:3px}
.char-bottom-switch{margin-top:18px}
}

/* --- CHARACTER final visibility fixes --- */
.outfit-switch button.on{
  color:#fff !important;
  border-color:var(--char-color) !important;
  background:color-mix(in srgb,var(--char-color) 28%,#242932) !important;
  box-shadow:0 0 0 1px color-mix(in srgb,var(--char-color) 45%,transparent),
             0 0 16px color-mix(in srgb,var(--char-color) 18%,transparent) !important;
  opacity:1 !important;
}

@media(max-width:900px){
  .char-art{
    position:relative !important;
    min-height:clamp(620px,118vw,860px) !important;
    overflow:hidden !important;
  }

  .char-art :global(.char-art-bust){
    display:block !important;
    position:absolute !important;
    inset:0 !important;
    width:100% !important;
    height:100% !important;
    z-index:2 !important;
  }

  .char-art :global(.char-art-full){
    display:none !important;
    position:absolute !important;
    left:50% !important;
    bottom:0 !important;
    top:auto !important;
    width:auto !important;
    height:100% !important;
    max-width:none !important;
    transform:translateX(-50%) !important;
    object-fit:contain !important;
    object-position:center bottom !important;
    z-index:2 !important;
    opacity:1 !important;
    visibility:visible !important;
  }

  .char-art :global(.char-art-bust > *){
    width:100% !important;
    height:100% !important;
  }

  .char-art :global(.char-art-bust img){
    display:block !important;
    width:100% !important;
    height:100% !important;
    object-fit:contain !important;
    object-position:center bottom !important;
    opacity:1 !important;
    visibility:visible !important;
  }

  .char-art.is-mobile-full :global(.char-art-bust){
    display:none !important;
  }

  .char-art.is-mobile-full :global(.char-art-full){
    display:block !important;
  }

  :global(.char-sign){
    z-index:8 !important;
    right:7% !important;
    bottom:7% !important;
    width:clamp(68px,20vw,104px) !important;
    max-height:72px !important;
    transform:rotate(-8deg) !important;
  }

  .char-art.is-mobile-full :global(.char-sign){
    right:7% !important;
    bottom:7% !important;
    width:clamp(74px,21vw,112px) !important;
  }

  .quote-vertical span{
    padding:7px 4px 8px !important;
    font-size:12px !important;
    line-height:1.1 !important;
    letter-spacing:.01em !important;
    text-orientation:mixed !important;
  }

  .quote-vertical span.is-long{
    padding:7px 4px !important;
    font-size:10px !important;
    line-height:1.12 !important;
  }
}


@media(max-width:900px){
  .char-art{
    min-height:clamp(660px,126vw,900px) !important;
  }

  .char-art :global(.char-art-bust){
    display:block !important;
    position:absolute !important;
    inset:0 !important;
    z-index:2 !important;
    width:100% !important;
    height:100% !important;
    overflow:hidden !important;
  }

  .char-art :global(.char-art-bust > *){
    display:block !important;
    width:100% !important;
    height:100% !important;
    opacity:1 !important;
    visibility:visible !important;
  }

  .char-art :global(.char-art-bust img){
    display:block !important;
    opacity:1 !important;
    visibility:visible !important;
  }

  .char-art.is-mobile-full :global(.char-art-bust){
    display:none !important;
  }

  .char-art.is-mobile-full :global(.char-art-full){
    display:block !important;
  }

  /* Larger mobile ribbons */
  .quote-vertical span{
    font-size:15px !important;
    padding:7px 4px 8px !important;
    line-height:1.08 !important;
  }

  .quote-vertical span.is-long{
    font-size:12px !important;
    padding:7px 4px !important;
    line-height:1.1 !important;
  }

  /* Signature is a child component, so the selector must be global. */
  :global(.char-sign){
    position:absolute !important;
    z-index:9 !important;
    right:6% !important;
    bottom:6% !important;
    width:clamp(72px,21vw,108px) !important;
    max-height:74px !important;
    object-fit:contain !important;
    transform:rotate(-8deg) !important;
    pointer-events:none !important;
  }

  .char-art.is-mobile-full :global(.char-sign){
    right:6% !important;
    bottom:6% !important;
    width:clamp(78px,22vw,116px) !important;
  }
}


/* --- final CHARACTER polish --- */
@media(max-width:900px){
  .char-switch{
    font-size:12px !important;
    gap:16px !important;
  }
  .char-switch button{
    color:rgba(250,250,255,.74) !important;
    padding:8px 5px !important;
  }
  .char-switch button.on{
    color:var(--char-color) !important;
    border-bottom:2px solid var(--char-color) !important;
  }

  .char-art :global(.char-art-bust-img){
    position:absolute !important;
    inset:0 !important;
    display:block !important;
    width:100% !important;
    height:100% !important;
    object-fit:contain !important;
    object-position:center bottom !important;
    opacity:1 !important;
    visibility:visible !important;
  }

  .quote-vertical span{
    font-size:17px !important;
    padding:8px 5px 9px !important;
    line-height:1.06 !important;
    font-weight:800 !important;
  }
  .quote-vertical span.is-long{
    font-size:13px !important;
    padding:8px 5px !important;
    line-height:1.08 !important;
  }

  :global(.char-sign){
    z-index:9 !important;
    right:3% !important;
    bottom:4% !important;
    width:clamp(150px,46vw,220px) !important;
    max-height:116px !important;
    transform:rotate(-6deg) !important;
    opacity:.98 !important;
  }
  .char-art.is-mobile-full :global(.char-sign){
    right:3% !important;
    bottom:4% !important;
    width:clamp(160px,48vw,230px) !important;
  }
}


/* --- mobile image decode / visibility hard fix --- */
@media(max-width:900px){
  .char-art :global(.desktop-art){
    display:none !important;
  }

  .char-art :global(.mobile-art){
    display:none !important;
  }

  .char-art.is-mobile-full :global(.mobile-art){
    display:block !important;
    position:absolute !important;
    z-index:2 !important;
    left:50% !important;
    bottom:0 !important;
    top:auto !important;
    width:auto !important;
    height:100% !important;
    max-width:none !important;
    object-fit:contain !important;
    transform:translateX(-50%) !important;
  }

  .char-art :global(.char-art-bust){
    display:block !important;
    position:absolute !important;
    inset:0 !important;
    z-index:2 !important;
    width:100% !important;
    height:100% !important;
    overflow:hidden !important;
  }

  .char-art :global(.char-art-bust-img){
    display:block !important;
    position:absolute !important;
    inset:0 !important;
    width:100% !important;
    height:100% !important;
    object-fit:contain !important;
    object-position:center bottom !important;
    opacity:1 !important;
    visibility:visible !important;
  }

  .char-art.is-mobile-full :global(.char-art-bust){
    display:none !important;
  }

  .char-switch button{
    color:rgba(250,250,255,.76) !important;
  }
  .char-switch button.on{
    color:var(--char-color) !important;
    border-bottom-color:var(--char-color) !important;
  }

  :global(.char-sign){
    right:-3% !important;
    bottom:2% !important;
    width:clamp(210px,62vw,310px) !important;
    max-height:150px !important;
    transform:rotate(-6deg) !important;
  }
  .char-art.is-mobile-full :global(.char-sign){
    right:-3% !important;
    bottom:2% !important;
    width:clamp(220px,64vw,320px) !important;
  }
}


/* --- mobile CHARACTER stage / selector final pass --- */
@media(max-width:900px){
  .char-art{
    width:100% !important;
    aspect-ratio:3 / 4 !important;
    height:auto !important;
    min-height:0 !important;
    margin:0 auto 88px !important;
    padding-top:0 !important;
    overflow:hidden !important;
    border-top:1px solid var(--line) !important;
    border-bottom:1px solid var(--line) !important;
  }

  .char-art :global(.char-art-bust),
  .char-art :global(.char-art-bust-img){
    position:absolute !important;
    inset:0 !important;
    width:100% !important;
    height:100% !important;
  }

  .char-art :global(.char-art-bust-img){
    display:block !important;
    object-fit:cover !important;
    object-position:center center !important;
  }

  /* Full-body mode can still use a taller viewport stage. */
  .char-art.is-mobile-full{
    width:100vw !important;
    max-width:none !important;
    margin-left:calc(50% - 50vw) !important;
    margin-bottom:88px !important;
    aspect-ratio:auto !important;
    height:calc(100svh - 210px) !important;
    min-height:620px !important;
  }

  /* Standing-art selector is always visible directly under the art. */
  .outfit-switch{
    position:absolute !important;
    z-index:10 !important;
    top:calc(100% + 14px) !important;
    bottom:auto !important;
    left:50% !important;
    right:auto !important;
    width:max-content !important;
    max-width:calc(100vw - 28px) !important;
    transform:translateX(-50%) !important;
    display:flex !important;
    justify-content:flex-start !important;
    gap:8px !important;
    overflow-x:auto !important;
    padding:2px 2px 10px !important;
  }
  .outfit-switch button{
    flex:0 0 auto !important;
    padding:9px 13px !important;
    font-size:10px !important;
    color:rgba(255,255,255,.78) !important;
    background:rgba(24,27,34,.88) !important;
  }
  .outfit-switch button.on{
    color:#fff !important;
    background:color-mix(in srgb,var(--char-color) 38%,#242932) !important;
    border-color:var(--char-color) !important;
    box-shadow:0 0 0 1px color-mix(in srgb,var(--char-color) 45%,transparent),
               0 0 18px color-mix(in srgb,var(--char-color) 20%,transparent) !important;
  }

  /* Bigger mobile ribbons. */
  .quote-vertical span{
    font-size:18px !important;
    padding:8px 5px 9px !important;
    line-height:1.05 !important;
  }
  .quote-vertical span.is-long{
    font-size:14px !important;
    padding:8px 5px !important;
    line-height:1.07 !important;
  }

  /* Huge signature, still bottom-right and above the art. */
  :global(.char-sign){
    z-index:9 !important;
    right:-10% !important;
    bottom:0 !important;
    width:clamp(260px,78vw,390px) !important;
    max-height:190px !important;
    transform:rotate(-6deg) !important;
    opacity:.98 !important;
  }
  .char-art.is-mobile-full :global(.char-sign){
    right:-8% !important;
    bottom:1% !important;
    width:clamp(280px,82vw,410px) !important;
  }

  /* Top SHIKI / SOLAS selector */
  .char-switch button{
    color:rgba(255,255,255,.78) !important;
    -webkit-text-fill-color:rgba(255,255,255,.78) !important;
    opacity:1 !important;
  }
  .char-switch button.on{
    color:var(--char-color) !important;
    -webkit-text-fill-color:var(--char-color) !important;
    border-bottom:2px solid var(--char-color) !important;
    text-shadow:0 0 16px color-mix(in srgb,var(--char-color) 42%,transparent) !important;
  }
}


/* --- final layout pass: selector / spacing / signature --- */
@media(min-width:901px){
  :global(.char-sign){
    right:-120px !important;
    bottom:70px !important;
    width:clamp(620px,82%,940px) !important;
    max-height:360px !important;
    transform:rotate(-6deg) !important;
  }
}

@media(max-width:900px){
  /* The selector lives inside .char-art; overflow:hidden was clipping it completely. */
  .char-art{
    overflow:visible !important;
    margin-bottom:58px !important;
  }

  .char-art :global(.char-art-bust){
    overflow:hidden !important;
  }

  .outfit-switch{
    display:flex !important;
    visibility:visible !important;
    opacity:1 !important;
    position:absolute !important;
    z-index:12 !important;
    top:calc(100% + 10px) !important;
    left:50% !important;
    right:auto !important;
    bottom:auto !important;
    transform:translateX(-50%) !important;
    width:max-content !important;
    max-width:calc(100vw - 24px) !important;
    justify-content:flex-start !important;
    gap:8px !important;
    overflow-x:auto !important;
    padding:2px 2px 8px !important;
  }

  .outfit-switch button{
    flex:0 0 auto !important;
    padding:9px 13px !important;
    font-size:10px !important;
  }

  /* Pull the name upward after the art/selector. */
  .char-copy{
    padding-top:16px !important;
  }

  /* Keep the English line compact on mobile. */
  .char-name-rule{
    margin-top:7px !important;
    margin-bottom:20px !important;
  }
  .char-name-rule span{
    font-size:10px !important;
  }

  /* Huge signature, moved up so it does not collide with the expand button. */
  :global(.char-sign){
    right:-14% !important;
    bottom:16% !important;
    width:clamp(320px,96vw,460px) !important;
    max-height:220px !important;
    transform:rotate(-6deg) !important;
  }
  .char-art.is-mobile-full :global(.char-sign){
    right:-12% !important;
    bottom:14% !important;
    width:clamp(340px,100vw,480px) !important;
  }

  .mobile-full-toggle{
    z-index:13 !important;
    right:14px !important;
    bottom:14px !important;
  }
}


/* --- latest mobile/desktop polish --- */
@media(min-width:901px){
  .char-art{
    overflow:visible !important;
  }
  .char-hero{
    overflow:visible !important;
  }
  :global(.char-sign){
    right:-18% !important;
    bottom:58px !important;
    width:clamp(700px,96%,1080px) !important;
    max-height:390px !important;
    overflow:visible !important;
  }
}

@media(max-width:900px){
  .character-page{
    padding-top:0 !important;
    overflow:visible !important;
  }

  .char-shell{
    padding-top:14px !important;
    overflow:visible !important;
  }

  .char-hero{
    overflow:visible !important;
  }

  .char-art{
    overflow:visible !important;
  }

  .char-art :global(.char-art-bust){
    overflow:hidden !important;
  }

  /* nearly edge-to-edge signature, kept just above the expand button */
  :global(.char-sign){
    left:2% !important;
    right:auto !important;
    bottom:10% !important;
    width:96% !important;
    max-width:none !important;
    max-height:220px !important;
    transform:rotate(-5deg) !important;
  }

  .char-art.is-mobile-full :global(.char-sign){
    left:2% !important;
    right:auto !important;
    bottom:9% !important;
    width:96% !important;
  }

  .mobile-full-toggle{
    right:14px !important;
    bottom:14px !important;
  }

  .char-name-rule{
    border-top:1px solid rgba(255,255,255,.42) !important;
    border-bottom:0 !important;
    margin-top:10px !important;
    margin-bottom:18px !important;
  }

  .char-name-rule span{
    top:-13px !important;
    bottom:auto !important;
    color:#fff !important;
    background:#171a20 !important;
  }
}


/* --- final header / signature / English-line polish --- */

/* PC: push the signature farther right and make it larger. */
@media(min-width:901px){
  :global(.char-sign){
    right:-31% !important;
    bottom:56px !important;
    width:clamp(780px,112%,1200px) !important;
    max-height:430px !important;
  }
}

/* Mobile: CHARACTER / SHIKI-SOLAS / EDIT all on one line. */
@media(max-width:900px){
  .char-head{
    display:grid !important;
    grid-template-columns:auto 1fr auto !important;
    align-items:center !important;
    gap:8px !important;
    min-height:52px !important;
    padding:0 !important;
  }

  .char-head h1{
    margin:0 !important;
    white-space:nowrap !important;
    font-size:10px !important;
    letter-spacing:.12em !important;
  }

  .char-switch{
    justify-self:center !important;
    min-width:0 !important;
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    gap:8px !important;
    font-size:10px !important;
    white-space:nowrap !important;
  }

  .char-switch button{
    padding:5px 2px !important;
    white-space:nowrap !important;
  }

  .char-admin{
    justify-self:end !important;
  }

  .char-admin .btn{
    padding:7px 10px !important;
    font-size:10px !important;
    white-space:nowrap !important;
  }

  /* Nearly edge-to-edge signature, lower than before but still clear of expand button. */
  :global(.char-sign){
    left:-4% !important;
    right:auto !important;
    bottom:4.2% !important;
    width:112% !important;
    max-width:none !important;
    max-height:255px !important;
    transform:rotate(-5deg) !important;
  }

  .char-art.is-mobile-full :global(.char-sign){
    left:-4% !important;
    right:auto !important;
    bottom:3.8% !important;
    width:112% !important;
  }

  /* English label sits directly above the line, with no rectangle behind it. */
  .char-name-rule{
    position:relative !important;
    height:20px !important;
    margin-top:11px !important;
    margin-bottom:18px !important;
    border-top:1px solid rgba(255,255,255,.42) !important;
    border-bottom:0 !important;
  }

  .char-name-rule span{
    position:absolute !important;
    right:0 !important;
    top:-15px !important;
    bottom:auto !important;
    padding:0 !important;
    background:transparent !important;
    color:#fff !important;
    font-family:"SmartFontUI","03SmartFontUI","03スマートフォントUI","Yu Gothic",sans-serif !important;
    font-size:13px !important;
    font-style:normal !important;
    font-weight:700 !important;
    letter-spacing:.04em !important;
    text-shadow:0 1px 3px rgba(0,0,0,.55) !important;
  }
}

      `}</style>
    </section>
  );
}

export default function CharacterDetailPage(){return <Suspense fallback={<section className="page"/>}><CharacterDetailInner/></Suspense>}
