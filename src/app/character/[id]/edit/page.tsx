'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import {
  Character,
  CHAR_SEED,
  charGrant,
} from '@/lib/charStore';
import { CharEditForm } from '@/components/chars/CharEditForm';

export default function CharacterEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [chars, setChars, loaded] =
    useLocalList<Character>(
      'ohome.chars.v1',
      CHAR_SEED
    );

  // 現在はcharactersコレクションが空でも
  // CHAR_SEEDからシキ／ソラスを表示しているため、
  // 編集画面でも同じフォールバックを使う。
  const effectiveChars =
    chars.length > 0
      ? chars
      : CHAR_SEED;

  const character =
    effectiveChars.find(
      c => c.id === id
    );

  if (!loaded) {
    return (
      <section className="page">
        <p
          style={{
            color: 'var(--faint)',
            fontSize: 11,
          }}
        >
          LOADING...
        </p>
      </section>
    );
  }

  if (!character) {
    return (
      <section className="page">
        <p>
          キャラクターが見つかりません。
        </p>
      </section>
    );
  }

  const canEdit =
    isAdmin ||
    charGrant(
      character,
      user?.id
    ) === 'edit';

  if (!canEdit) {
    return (
      <section className="page">
        <p>
          このキャラクターを編集する権限がありません。
        </p>
      </section>
    );
  }

  return (
    <section
      className="page"
      style={{
        maxWidth: 1180,
        margin: '0 auto',
        paddingTop: 34,
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent:
            'space-between',
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              letterSpacing:
                '.08em',
            }}
          >
            CHARACTER EDIT
          </h1>

          <p
            style={{
              margin:
                '7px 0 0',
              color:
                'var(--faint)',
              fontSize: 11,
            }}
          >
            {character.name}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            router.push(
              `/character/${character.id}`
            )
          }
        >
          ← PROFILE
        </button>
      </div>

      <CharEditForm
        initial={character}
        existingIds={effectiveChars
          .filter(
            c =>
              c.id !==
              character.id
          )
          .map(c => c.id)}
        onCancel={() =>
          router.push(
            `/character/${character.id}`
          )
        }
        onSave={updated => {
          // バックエンドがまだ空の場合、
          // seedの2人を土台にして保存する。
          const base =
            chars.length > 0
              ? chars
              : effectiveChars;

          const next =
            base.some(
              c =>
                c.id ===
                updated.id
            )
              ? base.map(c =>
                  c.id ===
                  updated.id
                    ? updated
                    : c
                )
              : [
                  ...base,
                  updated,
                ];

          setChars(next);

          router.push(
            `/character/${updated.id}`
          );
        }}
      />
    </section>
  );
}
