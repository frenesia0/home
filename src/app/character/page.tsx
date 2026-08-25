'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED } from '@/lib/charStore';
import { SearchBar, FitText } from '@/components/ui/Kit';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { useMainStore } from '@/lib/mainStore';
import { useCardSort, mergeOrder } from '@/lib/cardSort';

export default function CharacterPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { editOn } = useMainStore();

  const [chars, setChars] =
    useLocalList<Character>(
      'ohome.chars.v1',
      CHAR_SEED
    );

  const [q, setQ] = useState('');

  const visible = chars
    .filter((c) => c.own)
    .filter(
      (c) =>
        isAdmin ||
        c.visibility === 'public'
    )
    .filter(
      (c) =>
        !q ||
        c.name
          .toLowerCase()
          .includes(q.toLowerCase()) ||
        c.sub.includes(q)
    );

  const sort = useCardSort(
    visible,
    (next) =>
      setChars(
        mergeOrder(chars, next)
      ),
    editOn && isAdmin
  );

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>
          CHARACTER
        </PageTitle>

        <EditableDesc
          k="chars-desc"
          def="frenesia profile"
        />

        <div className="head-actions">
          <SearchBar
            onSearch={setQ}
          />

          {isAdmin && (
            <button
              className="btn btn-dark"
              onClick={() =>
                router.push(
                  '/character/new'
                )
              }
            >
              ＋ ADD CHARACTER
            </button>
          )}
        </div>
      </div>

      <div className="g5 chars-grid">
        {visible.map((c, i) => {
          const priv =
            c.visibility ===
            'private';

          const sp = sort(i) as {
            style?: React.CSSProperties;
          };

          return (
            <div
              key={c.id}
              className="char-card"
              {...sort(i)}
              style={{
                ...(priv
                  ? {
                      opacity: 0.45,
                    }
                  : undefined),
                ...sp.style,
              }}
              onClick={() => {
                if (!editOn) {
                  router.push(
                    `/character/${c.id}`
                  );
                }
              }}
            >
              <div
                className="thumb"
                style={{
                  position:
                    'relative',
                }}
              >
                <CroppedBlobImg
                  fileRef={
                    c.arts?.[0] ??
                    c.thumbId
                  }
                  crop={
                    c.thumbCrop
                  }
                  ph={
                    c.thumbClass
                  }
                  label={
                    priv
                      ? '非公開'
                      : '3:4'
                  }
                />
              </div>

              <div className="nm">
                <b
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <FitText>
                    {c.name}
                  </FitText>
                </b>

                <i
                  style={{
                    background:
                      c.color,
                  }}
                />
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <p
            style={{
              gridColumn:
                '1/-1',
              textAlign:
                'center',
              color:
                'var(--page-desc)',
              fontSize: 13,
              padding: 40,
            }}
          >
            表示できるキャラクターがありません
          </p>
        )}
      </div>
    </section>
  );
}
