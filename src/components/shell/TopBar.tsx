'use client';

import React, { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';
import { useMainStore } from '@/lib/mainStore';
import { useBlobUrl } from '@/lib/blobStore';
import { refreshPage } from '@/lib/pageRefresh';
import { KToggle } from '@/components/ui/Kit';

const NAV_ITEMS = [
  { label: 'HOME', href: '/' },
  { label: 'CHARACTER', href: '/character' },
  { label: 'GALLERY', href: '/gallery' },
  { label: 'NEWS', href: '/news' },
  { label: 'KOBANASHI', href: '/kobanashi' },
  { label: 'LINKS', href: '/links' },
] as const;

export function TopBar() {
  const { user, isAdmin, logout } = useAuth();
  const {
    editOn,
    editAvailable,
    gridOn,
    setGridOn,
    toggleEdit,
    requestExit,
    guardNav,
  } = useMainStore();

  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const avatarSrc = useBlobUrl(user?.avatarUrl);
  const userRef = useRef<HTMLDivElement>(null);

  const nav = (href: string) => {
    if (guardNav(href)) return;

    if (href === pathname) {
      refreshPage();
      return;
    }

    router.push(href);
  };

  return (
    <header className="topbar">
      <div
        className="brand"
        onClick={() => nav('/')}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            nav('/');
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        frenesia
      </div>

      <nav
        className="gnb"
        aria-label="メインナビゲーション"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.href}
            className={pathname === item.href ? 'on' : ''}
            onClick={() => nav(item.href)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {editOn && pathname === '/' && (
        <button
          className="btn btn-ghost"
          style={{
            height: 27,
            padding: '0 11px',
            fontSize: 10.5,
            whiteSpace: 'nowrap',
          }}
          onClick={() =>
            window.dispatchEvent(
              new Event('ohome-add-widget')
            )
          }
        >
          ＋ ウィジェット
        </button>
      )}

      <KToggle
        className={`grid-chip ${
          editOn && pathname === '/' ? 'show' : ''
        }`}
        label="グリッド"
        checked={gridOn}
        onChange={setGridOn}
      />

      <span
        className={`edit-flag ${editOn ? 'show' : ''}`}
        onClick={() => requestExit()}
      >
        ✎ 編集中
      </span>

      {user ? (
        <div
          className="user-wrap"
          ref={userRef}
        >
          <div
            className="user-chip"
            onClick={() =>
              setMenuOpen((open) => !open)
            }
          >
            <div
              className="avatar"
              style={
                !avatarSrc && user.avatarColor
                  ? {
                      background:
                        user.avatarColor,
                    }
                  : undefined
              }
            >
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>

            {user.nickname}
            <span
              style={{
                fontSize: 9,
                color: '#8d939d',
              }}
            >
              ▾
            </span>
          </div>

          <div
            className={`user-menu ${
              menuOpen ? 'open' : ''
            }`}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                nav('/mypage');
              }}
            >
              プロフィール
            </button>

            {isAdmin && (
              <>
                {(editAvailable || editOn) && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      toggleEdit();
                    }}
                  >
                    編集モードを
                    {editOn ? '終了' : '開始'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    nav('/settings');
                  }}
                >
                  設定
                </button>
              </>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      ) : (
        <button
          className="login-link"
          onClick={() => nav('/login')}
        >
          LOGIN
        </button>
      )}
    </header>
  );
}
