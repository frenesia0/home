'use client';
// キャラクター登録ページ

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED } from '@/lib/charStore';
import { CharEditForm } from '@/components/chars/CharEditForm';
import { useToast } from '@/components/ui/Toast';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';

export default function CharacterNewPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [chars, setChars, loaded] =
    useLocalList<Character>('ohome.chars.v1', CHAR_SEED);

  if (!loaded) {
    return <section className="page" />;
  }

  if (!isAdmin) {
    return (
      <section className="page">
        <div className="page-head">
          <PageTitle>ADD CHARACTER</PageTitle>
          <p>管理者専用ページです</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>ADD CHARACTER</PageTitle>

        <EditableDesc
          k="chars-new-desc"
          def="キャラクターを新しく登録します。最初のイラストがメイン画像になります。"
        />
      </div>

      <CharEditForm
        initial={null}
        existingIds={chars.map((c) => c.id)}
        onCancel={() =>
          router.push('/character')
        }
        onSave={(c) => {
          setChars([...chars, c]);
          toast('キャラクターを登録しました');
          router.push(
            `/character/${c.id}`
          );
        }}
      />
    </section>
  );
}
