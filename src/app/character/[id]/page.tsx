'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED } from '@/lib/charStore';

function isShiki(c: Character) {
  const text = `${c.id} ${c.name} ${c.sub}`.toLowerCase();
  return text.includes('shiki') || text.includes('シキ');
}

export default function CharacterPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [chars, , loaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);

  useEffect(() => {
    if (!loaded) return;
    const visible = chars.filter(c => c.own && (isAdmin || c.visibility === 'public' || (c.visibility === 'member' && !!user)));
    const target = visible.find(isShiki) ?? visible[0];
    if (target) router.replace(`/character/${encodeURIComponent(target.id)}`);
  }, [chars, loaded, user, isAdmin, router]);

  return <section className="page" style={{minHeight:240,display:'grid',placeItems:'center',color:'var(--faint)',fontSize:10,letterSpacing:'.14em'}}>{loaded ? 'CHARACTER' : 'LOADING...'}</section>;
}
