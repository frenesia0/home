'use client';
// キャラクター登録／プロフィール編集 — 専用ページフォーム (4.4)
// モーダルではなく専用ページ。誤クリックで閉じない。タブ内容は専用編集画面に切り替えて作成する。
// アートは複数枚対応 — 1枚目が代表フルアート兼、一覧サムネイル（3:4クロップ）の元画像 (6.1)
import React, { useEffect, useState } from 'react';
import { Character, CharacterOutfit, CharTab, ColorChip, Visibility, CharGrant } from '@/lib/charStore';
import { GrantsEditor } from '@/components/chars/GrantsEditor';
import { newId } from '@/lib/postStore';
import { getBlob, useBlobUrl } from '@/lib/blobStore';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';
import { useFonts } from '@/lib/fontStore';
import { KInput, KSelect, KStep } from '@/components/ui/Kit';
import { RichEditor } from '@/components/ui/RichEditor';
import { ColorField } from '@/components/ui/ColorField';
import { CropEditor, CropValue, CropImg } from '@/components/ui/CropEditor';
import { DragList } from '@/components/ui/DragList';
import { useConfirmDelete } from '@/components/ui/Modal';
import { SymbolInput } from '@/components/ui/SymbolInput';
import { fileDrop } from '@/lib/dnd';
import { isValidSlug, slugify } from '@/lib/link';
import { useToast } from '@/components/ui/Toast';
import { Lightbox } from '@/components/ui/Lightbox';

interface SpecRow { id: string; label: string; value: string }
interface ColorRow extends ColorChip { id: string }
interface ArtItem { id: string; ref?: string; url?: string; file?: File }
interface OutfitItem extends CharacterOutfit {
  fullFile?: File;
  fullUrl?: string;
  bustFile?: File;
  bustUrl?: string;
}


function ArtThumb({ item, crop }: { item: ArtItem; crop?: CropValue }) {
  const loaded = useBlobUrl(item.ref);
  const src = item.url ?? loaded;
  if (!src) return <div className="ph" style={{ width: '100%', height: '100%' }} />;
  return <CropImg src={src} crop={crop} />;
}

function OutfitPreview({ refId, url, alt, bust = false }: {
  refId?: string;
  url?: string;
  alt: string;
  bust?: boolean;
}) {
  const loaded = useBlobUrl(refId);
  const src = url ?? loaded;
  if (!src) {
    return <div className="ph" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--faint)' }}>NO IMAGE</div>;
  }
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: bust ? 'cover' : 'contain',
        display: 'block',
      }}
    />
  );
}

export function CharEditForm({ initial, onSave, onCancel, auMode, existingIds }: {
  initial: Character | null;               // null = 新規登録
  onSave: (c: Character) => void;
  onCancel: () => void;
  auMode?: boolean;                        // AU専用編集 (v1.9) — 公開範囲・会員権限はbase側で管理するため非表示
  existingIds?: string[];                  // ページURL重複チェック用 (v1.9 — 新規登録)
}) {
  const { fonts, familyOf } = useFonts();
  const toast = useToast();
  const isNew = !initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState('');   // ページURL /character/{slug} (v1.9 — 新規登録, 空欄なら自動)
  const [sub, setSub] = useState(initial?.sub ?? '');
  const [color, setColor] = useState(initial?.color ?? '#5d636d');
  const [themeMode, setThemeMode] = useState<'default' | 'custom'>(initial?.themeMode ?? 'default');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'public');
  const [fontId, setFontId] = useState(initial?.fontId ?? 'serif');
  const [nameSize, setNameSize] = useState(initial?.nameSize ?? 38);   // 詳細ページの大きな名前サイズ (v2.0)
  const [bodyFontId, setBodyFontId] = useState(initial?.bodyFontId ?? 'default');
  const [specs, setSpecs] = useState<SpecRow[]>(
    (
      initial?.specs ?? [
        { label: '性別', value: '' },
        { label: '身長', value: '' },
        { label: '体重', value: '' },
      ]
    ).map(s => ({ ...s, id: newId() })));
  const [colors, setColors] = useState<ColorRow[]>((initial?.colors ?? []).map(c => ({ ...c, id: newId() })));
  const [colorTipMode, setColorTipMode] = useState<'hex' | 'both' | 'label'>(initial?.colorTipMode ?? 'hex');
  const [basicHtml, setBasicHtml] = useState(initial?.basicHtml ?? '');
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [saving, setSaving] = useState(false);
  const [outfitCropId, setOutfitCropId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<CharTab[]>(initial?.tabs ?? []);
  const [arts, setArts] = useState<ArtItem[]>(() => {
    const refs = initial?.arts ?? (initial?.artId ? [initial.artId] : initial?.thumbId ? [initial.thumbId] : []);
    return refs.map(r => ({ id: newId(), ref: r }));
  });
  const [outfits, setOutfits] = useState<OutfitItem[]>(() => {
    const fromInitial = initial?.outfits?.length
      ? initial.outfits
      : [{
          id: 'default',
          label: 'DEFAULT',
          fullImageId: initial?.profileFullId,
          bustImageId: initial?.profileBustId,
          isDefault: true,
        }];
    const hasDefault = fromInitial.some(o => o.isDefault);
    return fromInitial.map((o, i) => ({
      ...o,
      isDefault: hasDefault ? !!o.isDefault : i === 0,
    }));
  });
  const [thumbCrop, setThumbCrop] = useState<CropValue | undefined>(initial?.thumbCrop);
  const [grants, setGrants] = useState<CharGrant[]>(initial?.grants ?? []); // 関連キャラクターの会員権限 (v1.9)
  const [cropOpen, setCropOpen] = useState(false);
  const [lb, setLb] = useState<number | null>(null);   // アート サムネイルクリック → 原寸表示
  // 画面切替：メインフォーム／タブ専用編集画面
  const [view, setView] = useState<'main' | string>('main');

  const addArts = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const items = Array.from(list).map(f => ({ id: newId(), url: URL.createObjectURL(f), file: f }));
    setArts(prev => {
      if (prev.length === 0) { setThumbCrop(undefined); setCropOpen(true); } // 1枚目 → サムネイルクロップ (6.1)
      return [...prev, ...items];
    });
  };

  const save = async () => {
  if (saving) return;
  if (!name.trim()) {
    toast('名前を入力してください');
    return;
  }

  // ページURLの形式・重複チェック
  if (isNew && slug) {
    if (!isValidSlug(slug)) {
      toast(
        'URLには半角英小文字・数字・ハイフンのみ使用できます'
      );
      return;
    }

    if (existingIds?.includes(slug)) {
      toast(
        'すでに使用中のURLです。別のURLを入力してください'
      );
      return;
    }
  }

  setSaving(true);

  try {
    const artIds = await Promise.all(
      arts.map((a) =>
        a.file
          ? uploadImageToCloudinary(a.file).then(x => x.url)
          : Promise.resolve(a.ref!)
      )
    );

    const outfitIds = await Promise.all(
      outfits.map(async (o) => ({
        id: o.id,
        label: o.label.trim() || 'OUTFIT',
        fullImageId: o.fullFile ? (await uploadImageToCloudinary(o.fullFile)).url : o.fullImageId,
        bustImageId: o.bustFile ? (await uploadImageToCloudinary(o.bustFile)).url : o.bustImageId,
        bustCrop: o.bustCrop,
        isDefault: !!o.isDefault,
      }))
    );

    // デフォルト衣装は必ず1件。念のため無い場合は先頭をデフォルトにする。
    if (outfitIds.length > 0 && !outfitIds.some(o => o.isDefault)) {
      outfitIds[0].isDefault = true;
    }

    onSave({
      // 既存キャラクター編集では、今回のフォームで触っていない
      // CHARACTER専用項目（quote / voices / profileFullId / profileBustId 等）を
      // 絶対に消さない。
      ...(initial ?? {}),

      id:
        initial?.id ??
        (slug || newId()),

      name: name.trim(),
      sub: sub.trim(),
      color,
      themeMode,

      colors: colors
        .filter((x) => x.hex)
        .map(({ hex, label }) => ({
          hex,
          label,
        })),

      colorTipMode,

      specs: specs
        .filter((s) =>
          s.label.trim()
        )
        .map(({ label, value }) => ({
          label: label.trim(),
          value,
        })),

      tabs,
      basicHtml,
      quote,
      visibility,
      fontId,
      nameSize,
      bodyFontId,

      thumbClass:
        initial?.thumbClass ??
        '',

      arts: artIds,
      thumbId: artIds[0],
      thumbCrop,
      artId: artIds[0],

      outfits: outfitIds,

      // 旧表示コードとの互換用。デフォルト衣装を従来フィールドにも同期する。
      profileFullId: outfitIds.find(o => o.isDefault)?.fullImageId,
      profileBustId: outfitIds.find(o => o.isDefault)?.bustImageId,

      own:
        initial?.own ??
        true,

      grants:
        grants.length
          ? grants
          : undefined,
    });
  } catch (err) {
    console.error(
      'Character save failed:',
      err
    );

    const message =
      err instanceof Error
        ? err.message
        : 'キャラクターの保存に失敗しました。';

    toast(message);
  } finally {
    setSaving(false);
  }
};

  const specValuePlaceholder = (label: string) => {
    const normalized = label.trim();

    if (normalized === '性別') return '例：男性';
    if (normalized === '身長') return '例：186cm';
    if (normalized === '体重') return '例：100kg';

    return '値';
  };

  const rowInp: React.CSSProperties = { fontSize: 12, padding: '7px 10px' };
  const addBtn: React.CSSProperties = { padding: '5px 12px', fontSize: 11, justifySelf: 'center' };

  // タブ削除 — 確認モーダルを表示 (v1.9)
  const del = useConfirmDelete();
  const askDeleteTab = (tabId: string, after?: () => void) => {
    const t = tabs.find(x => x.id === tabId);
    del.ask(`タブ「${t?.title || 'タイトルなし'}」を削除しますか？`, () => {
      setTabs(l => l.filter(x => x.id !== tabId));
      after?.();
    }, 'タブに入力した内容も一緒に削除されます。SAVE前であればCANCELでフォームを離れることで元に戻せます。');
  };

  
function OutfitBustPreview({ refId, url, crop, alt }: {
  refId?: string;
  url?: string;
  crop?: CropValue;
  alt: string;
}) {
  const loaded = useBlobUrl(refId);
  const src = url ?? loaded;
  if (!src) return null;
  return <CropImg src={src} crop={crop} />;
}

function OutfitBustCrop({ item, open, onClose, onApply }: {
  item: OutfitItem;
  open: boolean;
  onClose: () => void;
  onApply: (crop: CropValue) => void;
}) {
  const loaded = useBlobUrl(item.bustImageId);
  const src = item.bustUrl ?? loaded;
  if (!src || !open) return null;
  return (
    <CropEditor
      open
      src={src}
      aspect="3:4"
      initial={item.bustCrop}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

/* ---------- タブ専用編集画面 ---------- */
  const curTab = tabs.find(t => t.id === view);
  if (curTab) {
    return <>
      <TabEditView
        tab={curTab}
        onChange={patch => setTabs(l => l.map(x => (x.id === curTab.id ? { ...x, ...patch } : x)))}
        onDelete={() => askDeleteTab(curTab.id, () => setView('main'))}
        onBack={() => setView('main')} />
      {del.element}
    </>;
  }

  /* ---------- メインフォーム ---------- */
  return (
    <div className="write-grid">
      {/* 左：アート／基本情報／カラー／本文／タブ */}
      <div className="panel" style={{ padding: 24, display: 'grid', gap: 12, alignContent: 'start' }}>
        {/* アート一覧 */}
        <label className="k-label" style={{ margin: 0 }}>
          アート <span style={{ fontWeight: 400, color: 'var(--faint)' }}>— 1枚目が代表フルアート · 一覧サムネイルは1枚目から3:4でクロップ · ⠿で順序変更</span>
        </label>
        {arts.length > 0 && (
          <DragList items={arts} keyOf={a => a.id} onReorder={setArts}
            render={(a, i) => (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', padding: '3px 0' }}>
                <span className="drag-h">⠿</span>
                <div data-tip="クリックで原寸表示" onClick={() => setLb(i)}
                  style={{ width: 64, aspectRatio: '3/4', borderRadius: 7, overflow: 'hidden', position: 'relative', flexShrink: 0, cursor: 'zoom-in' }}>
                  <ArtThumb item={a} crop={i === 0 ? thumbCrop : undefined} />
                </div>
                {i === 0 ? (
                  <>
                    <span className="pill dark">代表 · サムネイル</span>
                    {/* 隣の「代表 · サムネイル」バッジと高さを統一 (23px).
                        詳細画面での表示位置は詳細ページで右クリックして調整する (v2.0) */}
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 10.5, lineHeight: '13px' }}
                      onClick={() => setCropOpen(true)}>✂ サムネイル調整</button>
                  </>
                ) : (
                  <span className="pill">追加アート</span>
                )}
                <span className="fx" style={{ marginLeft: 'auto' }}
                  onClick={() => del.ask('このアートを削除しますか？', () => setArts(l => l.filter(x => x.id !== a.id)))}>✕</span>
              </div>
            )} />
        )}
        <input id="chArtsF" type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { addArts(e.target.files); e.target.value = ''; }} />
        <button className="btn btn-ghost" style={addBtn}
          onClick={() => document.getElementById('chArtsF')?.click()}
          {...fileDrop(fl => addArts(fl))}>
          ＋ ADD ART {arts.length === 0 && '(1枚目登録時にサムネイル範囲を指定)'}
        </button>

        {/* CHARACTER立ち絵・衣装 */}
        {!auMode && (
          <>
            <div style={{ height: 1, background: 'var(--line)', margin: '10px 0 4px' }} />
            <label className="k-label" style={{ margin: 0 }}>
              CHARACTER 立ち絵・衣装
              <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--faint)' }}>
                — 腰上画像は3:4縦長で登録 · DEFAULTが必ず初期表示
              </span>
            </label>

            <div style={{ display: 'grid', gap: 12 }}>
              {outfits.map((o, i) => (
                <div
                  key={o.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: 12,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KInput
                      placeholder="衣装名"
                      value={o.label}
                      style={{ ...rowInp, flex: 1 }}
                      onChange={e => setOutfits(list => list.map(x => x.id === o.id ? { ...x, label: e.target.value } : x))}
                    />
                    <button
                      type="button"
                      className={o.isDefault ? 'btn btn-dark' : 'btn btn-ghost'}
                      style={{ padding: '5px 10px', fontSize: 10, flexShrink: 0 }}
                      onClick={() => setOutfits(list => list.map(x => ({ ...x, isDefault: x.id === o.id })))}
                    >
                      {o.isDefault ? 'DEFAULT' : 'SET DEFAULT'}
                    </button>
                    {!o.isDefault && outfits.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '5px 9px', fontSize: 10, flexShrink: 0 }}
                        onClick={() => del.ask(
                          `衣装「${o.label || 'OUTFIT'}」を削除しますか？`,
                          () => setOutfits(list => list.filter(x => x.id !== o.id)),
                          'キャラクター本体は削除されません。衣装データだけを削除します。'
                        )}
                      >
                        衣装削除
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <span className="hint" style={{ margin: 0 }}>PC / FULL BODY — 全身立ち絵</span>
                      <div style={{ height: 220, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                        <OutfitPreview refId={o.fullImageId} url={o.fullUrl} alt={`${name} ${o.label} full body`} />
                      </div>
                      <input
                        id={`outfitFull-${o.id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setOutfits(list => list.map(x => x.id === o.id ? {
                            ...x,
                            fullFile: f,
                            fullUrl: URL.createObjectURL(f),
                          } : x));
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={addBtn}
                        onClick={() => document.getElementById(`outfitFull-${o.id}`)?.click()}
                      >
                        {o.fullImageId || o.fullFile ? 'CHANGE FULL BODY' : '＋ ADD FULL BODY'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: 7 }}>
                      <span className="hint" style={{ margin: 0 }}>MOBILE — 腰上立ち絵（3:4）</span>
                      <div style={{ width: '100%', maxWidth: 165, aspectRatio: '3 / 4', justifySelf: 'center', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                        {(o.bustUrl || o.bustImageId) ? (
                          <OutfitBustPreview
                            refId={o.bustImageId}
                            url={o.bustUrl}
                            crop={o.bustCrop}
                            alt={`${name} ${o.label} bust`}
                          />
                        ) : (
                          <div className="ph" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--faint)' }}>NO IMAGE</div>
                        )}
                      </div>
                      <input
                        id={`outfitBust-${o.id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setOutfits(list => list.map(x => x.id === o.id ? {
                            ...x,
                            bustFile: f,
                            bustUrl: URL.createObjectURL(f),
                          } : x));
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={addBtn}
                        onClick={() => document.getElementById(`outfitBust-${o.id}`)?.click()}
                      >
                        {o.bustImageId || o.bustFile ? 'CHANGE 3:4 BUST' : '＋ ADD 3:4 BUST'}
                      </button>
                      {(o.bustImageId || o.bustFile) && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={addBtn}
                          onClick={() => setOutfitCropId(o.id)}
                        >
                          ✂ 3:4 CROP
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              style={addBtn}
              onClick={() => setOutfits(list => [
                ...list,
                {
                  id: newId(),
                  label: `OUTFIT ${String(list.length + 1).padStart(2, '0')}`,
                  isDefault: list.length === 0,
                },
              ])}
            >
              ＋ ADD OUTFIT
            </button>
          </>
        )}

        {/* 基本情報 */}
        <label className="k-label" style={{ margin: 0 }}>基本情報</label>
        <DragList items={specs} keyOf={s => s.id} onReorder={setSpecs}
          render={s => (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', padding: '2px 0' }}>
              <span className="drag-h">⠿</span>
              <KInput placeholder="項目" value={s.label} style={{ ...rowInp, width: 90 }}
                onChange={e => setSpecs(l => l.map(x => x.id === s.id ? { ...x, label: e.target.value } : x))} />
              <KInput placeholder={specValuePlaceholder(s.label)} value={s.value} style={rowInp}
                onChange={e => setSpecs(l => l.map(x => x.id === s.id ? { ...x, value: e.target.value } : x))} />
              <span className="fx" onClick={() => {
                const remove = () => setSpecs(l => l.filter(x => x.id !== s.id));
                if (s.label.trim() || s.value.trim()) del.ask('この項目を削除しますか？', remove, `${s.label} — ${s.value}`);
                else remove();
              }}>✕</span>
            </div>
          )} />
        <button className="btn btn-ghost" style={addBtn}
          onClick={() => setSpecs(l => [...l, { id: newId(), label: '', value: '' }])}>＋ ADD</button>

        {/* テーマカラー — 1行2件 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label className="k-label" style={{ margin: 0 }}>テーマカラー（プロフィールの色チップ）</label>
          <div className="mini-seg" data-tip="色チップにカーソルを合わせた時の表示形式">
            <button className={colorTipMode === 'hex' ? 'on' : ''} onClick={() => setColorTipMode('hex')}>hex</button>
            <button className={colorTipMode === 'both' ? 'on' : ''} onClick={() => setColorTipMode('both')}>名前+hex</button>
            <button className={colorTipMode === 'label' ? 'on' : ''} onClick={() => setColorTipMode('label')}>名前のみ</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
          {colors.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
              <ColorField value={c.hex} onChange={hex => setColors(l => l.map(x => x.id === c.id ? { ...x, hex } : x))} />
              <KInput placeholder="ラベル" value={c.label} style={{ ...rowInp, flex: 1, minWidth: 50 }}
                onChange={e => setColors(l => l.map(x => x.id === c.id ? { ...x, label: e.target.value } : x))} />
              <span className="fx" onClick={() => del.ask('このカラーを削除しますか？', () => setColors(l => l.filter(x => x.id !== c.id)), c.label || c.hex)}>✕</span>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost" style={addBtn}
          onClick={() => setColors(l => [...l, { id: newId(), hex: '#888888', label: '' }])}>＋ ADD COLOR</button>

        {/* CHARACTER台詞 — 改行をそのまま保存 */}
        <label className="k-label" style={{ margin: 0 }}>CHARACTERの台詞（3行）</label>
        <textarea
          value={quote}
          onChange={e => setQuote(e.target.value)}
          rows={5}
          placeholder="「台詞を3行で入力」"
          style={{
            width: '100%',
            resize: 'vertical',
            padding: '10px 12px',
            border: '1px solid var(--line)',
            borderRadius: 8,
            background: 'var(--panel)',
            color: 'var(--text)',
            font: 'inherit',
            fontSize: 12,
            lineHeight: 1.8,
            boxSizing: 'border-box',
          }}
        />

        {/* 基本プロフィール本文 — リッチエディタ */}
        <label className="k-label" style={{ margin: 0 }}>基本プロフィール本文</label>
        <RichEditor value={basicHtml} onChange={setBasicHtml}
          placeholder="キャラクター紹介を入力してください — 画像挿入可（スクリプト不可 6.3）" />

        {/* 追加タブ — ここでは一覧のみ。内容は専用画面で編集 */}
        <label className="k-label" style={{ margin: 0 }}>追加タブ — 内容は［編集］から専用画面で作成</label>
        {tabs.map(t => (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1.5px solid var(--line)', borderRadius: 8, padding: '8px 10px' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eef0f2', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>{t.icon}</span>
            <b style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || '(タイトルなし)'}</b>
            {t.subtitle && <small style={{ color: 'var(--faint)', fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subtitle}</small>}
            <small style={{ color: 'var(--faint)', fontSize: 10.5, flexShrink: 0 }}>{t.html ? `${t.html.length.toLocaleString()}文字` : '未入力'}</small>
            <button className="btn btn-dark" style={{ marginLeft: 'auto', height: 27, padding: '0 12px', fontSize: 11 }}
              onClick={() => setView(t.id)}>編集 ›</button>
            <span className="fx" onClick={() => askDeleteTab(t.id)}>✕</span>
          </div>
        ))}
        <button className="btn btn-ghost" style={addBtn}
          onClick={() => {
            const id = newId();
            setTabs(l => [...l, { id, icon: '✦', title: '', html: '' }]);
            setView(id); // そのまま専用編集画面へ
          }}>＋ ADD TAB</button>

        {/* 関連キャラクターの会員権限 — RPプレイ／編集まで（会員-キャラクター連携, v1.9）— AU編集中はbase側で管理 */}
        {!auMode && initial?.own === false && (
          <>
            <label className="k-label" style={{ margin: '6px 0 0' }}>会員権限 — RPプレイ · キャラクター編集</label>
            <GrantsEditor value={grants} onChange={setGrants} />
          </>
        )}
      </div>

      {/* 右：基本設定 + 保存 */}
      <div>
        <div className="panel widget" style={{ marginBottom: 14 }}>
          <h4>基本設定</h4>
          <div style={{ display: 'grid', gap: 9 }}>
            <KInput placeholder="名前" value={name} onChange={e => setName(e.target.value)}
              style={{ fontFamily: familyOf(fontId) }} />
            {/* ページURL (v1.9) — /character/{slug}。空欄なら自動・重複時は警告 */}
            {isNew && (
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--faint)', whiteSpace: 'nowrap' }}>/character/</span>
                  <KInput placeholder="ページURL（任意）" value={slug}
                    onChange={e => setSlug(slugify(e.target.value))} style={{ flex: 1 }} />
                </div>
                {slug && existingIds?.includes(slug) && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--accent)' }}>すでに使用中のURLです</p>
                )}
              </div>
            )}
            <KInput placeholder="一言紹介（任意）" value={sub} onChange={e => setSub(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="cp-lb">代表テーマカラー</span>
              <ColorField value={color} onChange={setColor} />
            </div>
            {/* 詳細ページテーマ — 既存テーマを維持／代表テーマ色へ切替 */}
            <div className="mini-seg">
              <button className={themeMode === 'default' ? 'on' : ''} onClick={() => setThemeMode('default')}>既存テーマを使用</button>
              <button className={themeMode === 'custom' ? 'on' : ''} onClick={() => setThemeMode('custom')}>キャラクターテーマ色</button>
            </div>
            {/* 公開範囲はbase側で管理 — AU編集中は非表示 (v1.9) */}
            {!auMode && (
              <KSelect value={visibility} onChange={v => setVisibility(v as Visibility)}
                options={[
                  { value: 'public', label: '全体公開' },
                  { value: 'member', label: 'メンバー限定' },
                  { value: 'private', label: '非公開' },
                ]} />
            )}
            <KSelect value={fontId} onChange={setFontId}
              options={fonts.map(f => ({
                value: f.id,
                label: <span style={{ fontFamily: f.family }}>{f.name}</span>,
              }))} />
            <p className="hint" style={{ margin: 0 }}>名前フォント — 一覧・詳細の名前に適用</p>
            {/* 名前の長さが異なるため自動縮小せず、キャラクターごとに指定する (v2.0) */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="k-label" style={{ margin: 0, flex: 1 }}>詳細ページの名前サイズ</span>
              <KStep value={nameSize} onChange={setNameSize} min={14} max={72} step={1} suffix="px" />
            </div>
            <KSelect value={bodyFontId} onChange={setBodyFontId}
              options={fonts.map(f => ({
                value: f.id,
                label: <span style={{ fontFamily: f.family }}>{f.name}</span>,
              }))} />
            <p className="hint" style={{ margin: 0 }}>本文フォント — プロフィール情報・紹介文に適用</p>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-onbk" onClick={onCancel}>CANCEL</button>
          <button className="btn btn-accent" onClick={save}>
            {isNew ? 'ADD' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* サムネイルクロップ（3:4 — 1枚目のアート基準, 6.1） */}
      {arts[0] && (
        <FirstArtCrop open={cropOpen} item={arts[0]} crop={thumbCrop}
          onClose={() => setCropOpen(false)}
          onApply={c => { setThumbCrop(c); setCropOpen(false); }} />
      )}
      {/* アート原寸表示 — 保存前ファイルはurl、保存済みはref（Lightboxが両方対応） */}
      {lb !== null && (
        <Lightbox srcs={arts.map(a => a.url ?? a.ref ?? '')} index={lb} onClose={() => setLb(null)} />
      )}
      {outfitCropId && (() => {
        const o = outfits.find(x => x.id === outfitCropId);
        if (!o) return null;
        return (
          <OutfitBustCrop
            item={o}
            open
            onClose={() => setOutfitCropId(null)}
            onApply={crop => {
              setOutfits(list => list.map(x => x.id === o.id ? { ...x, bustCrop: crop } : x));
              setOutfitCropId(null);
            }}
          />
        );
      })()}
      <style jsx>{`
        .save-spinner{
          width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;
          border-radius:50%;display:inline-block;animation:spin .7s linear infinite
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      {del.element}
    </div>
  );
}

/* ---------- タブ専用編集画面 — 大きなエディタ + リアルタイムプレビュー ---------- */
function TabEditView({ tab, onChange, onDelete, onBack }: {
  tab: CharTab;
  onChange: (patch: Partial<CharTab>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="panel" style={{ padding: 24, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={onBack}>‹ 戻る</button>
        <b style={{ fontSize: 14 }}>タブ編集</b>
        <span className="hint" style={{ margin: 0 }}>この画面の内容はプロフィール［SAVE］時に一緒に保存されます</span>
        <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={onDelete}>タブ削除</button>
      </div>
      {/* アイコン + Title/Subtitleを1行表示 — Subtitleはタイトル下の小さな文字 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* アイコン — クリックで特殊文字プリセット、直接入力も可能 (v1.9) */}
        <SymbolInput value={tab.icon} maxLength={2} style={{ width: 56, textAlign: 'center' }}
          onChange={v => onChange({ icon: v })} />
        <KInput placeholder="タブタイトル" value={tab.title}
          onChange={e => onChange({ title: e.target.value })} />
        <KInput placeholder="サブタイトル（任意）" value={tab.subtitle ?? ''}
          onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      {/* リッチエディタ (TipTap) — ツールバーで装飾・画像挿入、出力はHTML */}
      <RichEditor value={tab.html} onChange={html => onChange({ html })}
        placeholder="タブ内容を入力してください — 画像挿入可（スクリプト不可 6.3）" />
      <button className="btn btn-dark" style={{ justifySelf: 'end' }} onClick={onBack}>完了 — 一覧へ</button>
    </div>
  );
}

/** 1枚目のアート（新規ファイルまたは保存済みblob）を元に3:4クロップ編集画面を表示 */
function FirstArtCrop({ open, item, crop, onClose, onApply }: {
  open: boolean; item: ArtItem; crop?: CropValue;
  onClose: () => void; onApply: (c: CropValue) => void;
}) {
  const [loadedUrl, setLoadedUrl] = useState('');
  useEffect(() => {
    if (item.url || !item.ref || !open) return;
    getBlob(item.ref).then(b => { if (b) setLoadedUrl(URL.createObjectURL(b)); });
  }, [item, open]);
  const src = item.url || loadedUrl;
  if (!src || !open) return null;
  return <CropEditor open={open} src={src} aspect="3:4" initial={crop} onClose={onClose} onApply={onApply} />;
}
