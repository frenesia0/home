'use client';

import React, {
  useRef,
  useState,
} from 'react';
import {
  usePathname,
  useRouter,
} from 'next/navigation';

import { useAuth } from '@/lib/auth';
import { useMainStore } from '@/lib/mainStore';
import { useBlobUrl } from '@/lib/blobStore';
import { refreshPage } from '@/lib/pageRefresh';
import { KToggle } from '@/components/ui/Kit';

const NAV_ITEMS = [
  { label: 'HOME', href: '/' },
  {
    label: 'CHARACTER',
    href: '/character',
  },
  {
    label: 'GALLERY',
    href: '/gallery',
  },
  {
    label: 'NEWS',
    href: '/news',
  },
  {
    label: 'KOBANASHI',
    href: '/kobanashi',
  },
  {
    label: 'LINKS',
    href: '/links',
  },
] as const;

const MOBILE_MAIN_ITEMS = [
  { label: 'HOME', href: '/' },
  {
    label: 'CHARACTER',
    href: '/character',
  },
  {
    label: 'GALLERY',
    href: '/gallery',
  },
] as const;

const MOBILE_MORE_ITEMS = [
  {
    label: 'NEWS',
    href: '/news',
  },
  {
    label: 'KOBANASHI',
    href: '/kobanashi',
  },
  {
    label: 'LINKS',
    href: '/links',
  },
] as const;

export function TopBar() {
  const {
    user,
    isAdmin,
    logout,
  } = useAuth();

  const {
    editOn,
    editAvailable,
    gridOn,
    setGridOn,
    toggleEdit,
    requestExit,
    guardNav,
  } = useMainStore();

  const router =
    useRouter();

  const pathname =
    usePathname();

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const avatarSrc =
    useBlobUrl(
      user?.avatarUrl
    );

  const userRef =
    useRef<HTMLDivElement>(
      null
    );

  const nav = (
    href: string
  ) => {
    if (
      guardNav(href)
    ) {
      return;
    }

    setMenuOpen(false);
    setMobileMenuOpen(
      false
    );

    if (
      href === pathname
    ) {
      refreshPage();
      return;
    }

    router.push(href);
  };

  const userChip =
    user ? (
      <div
        className="user-wrap"
        ref={userRef}
      >
        <div
          className="user-chip"
          onClick={() => {
            setMobileMenuOpen(
              false
            );

            setMenuOpen(
              open => !open
            );
          }}
        >
          <div
            className="avatar"
            style={
              !avatarSrc &&
              user.avatarColor
                ? {
                    background:
                      user.avatarColor,
                  }
                : undefined
            }
          >
            {avatarSrc && (
              <img
                src={
                  avatarSrc
                }
                alt=""
                style={{
                  width:
                    '100%',
                  height:
                    '100%',
                  objectFit:
                    'cover',
                }}
              />
            )}
          </div>

          <span
            className="topbar-user-name"
          >
            {
              user.nickname
            }
          </span>

          <span
            style={{
              fontSize: 9,
              color:
                '#8d939d',
            }}
          >
            ▾
          </span>
        </div>

        <div
          className={`user-menu ${
            menuOpen
              ? 'open'
              : ''
          }`}
        >
          <button
            onClick={() =>
              nav(
                '/mypage'
              )
            }
          >
            プロフィール
          </button>

          {isAdmin && (
            <>
              {(
                editAvailable ||
                editOn
              ) && (
                <button
                  onClick={() => {
                    setMenuOpen(
                      false
                    );

                    toggleEdit();
                  }}
                >
                  編集モードを
                  {editOn
                    ? '終了'
                    : '開始'}
                </button>
              )}

              {/* 管理画面 */}
              <button
                onClick={() =>
                  nav(
                    '/admin'
                  )
                }
              >
                管理者
              </button>

              <button
                onClick={() =>
                  nav(
                    '/settings'
                  )
                }
              >
                設定
              </button>
            </>
          )}

          <button
            onClick={() => {
              setMenuOpen(
                false
              );

              setMobileMenuOpen(
                false
              );

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
        onClick={() =>
          nav('/login')
        }
      >
        LOGIN
      </button>
    );

  return (
    <>
      <header className="topbar">
        {/* =========================
            DESKTOP
        ========================= */}

        <div
          className="topbar-desktop"
        >
          <div
            className="brand"
            onClick={() =>
              nav('/')
            }
            role="link"
            tabIndex={0}
            onKeyDown={event => {
              if (
                event.key ===
                  'Enter' ||
                event.key ===
                  ' '
              ) {
                event.preventDefault();
                nav('/');
              }
            }}
            style={{
              cursor:
                'pointer',
            }}
          >
            frenesia
          </div>

          <nav
            className="gnb"
            aria-label="メインナビゲーション"
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap: 2,
              minWidth: 0,
            }}
          >
            {NAV_ITEMS.map(
              item => (
                <button
                  key={
                    item.href
                  }
                  className={
                    pathname ===
                    item.href
                      ? 'on'
                      : ''
                  }
                  onClick={() =>
                    nav(
                      item.href
                    )
                  }
                  style={{
                    whiteSpace:
                      'nowrap',
                  }}
                >
                  {
                    item.label
                  }
                </button>
              )
            )}
          </nav>

          <div
            className="topbar-desktop-spacer"
          />

          {editOn &&
            pathname ===
              '/' && (
              <button
                className="btn btn-ghost"
                style={{
                  height:
                    27,
                  padding:
                    '0 11px',
                  fontSize:
                    10.5,
                  whiteSpace:
                    'nowrap',
                }}
                onClick={() =>
                  window.dispatchEvent(
                    new Event(
                      'ohome-add-widget'
                    )
                  )
                }
              >
                ＋ ウィジェット
              </button>
            )}

          <KToggle
            className={`grid-chip ${
              editOn &&
              pathname ===
                '/'
                ? 'show'
                : ''
            }`}
            label="グリッド"
            checked={
              gridOn
            }
            onChange={
              setGridOn
            }
          />

          <span
            className={`edit-flag ${
              editOn
                ? 'show'
                : ''
            }`}
            onClick={() =>
              requestExit()
            }
          >
            ✎ 編集中
          </span>

          {userChip}
        </div>

        {/* =========================
            MOBILE
        ========================= */}

        <div
          className="topbar-mobile"
        >
          {/* 1段目 */}
          <div
            className="mobile-top-row"
          >
            <div
              className="brand mobile-brand"
              onClick={() =>
                nav('/')
              }
              role="link"
              tabIndex={0}
              onKeyDown={event => {
                if (
                  event.key ===
                    'Enter' ||
                  event.key ===
                    ' '
                ) {
                  event.preventDefault();
                  nav('/');
                }
              }}
            >
              frenesia
            </div>

            {userChip}
          </div>

          {/* 2段目 */}
          <nav
            className="mobile-nav-row"
            aria-label="モバイルナビゲーション"
          >
            {MOBILE_MAIN_ITEMS.map(
              item => (
                <button
                  key={
                    item.href
                  }
                  className={
                    pathname ===
                    item.href
                      ? 'on'
                      : ''
                  }
                  onClick={() =>
                    nav(
                      item.href
                    )
                  }
                >
                  {
                    item.label
                  }
                </button>
              )
            )}

            <button
              className={
                MOBILE_MORE_ITEMS.some(
                  item =>
                    pathname ===
                    item.href
                ) ||
                mobileMenuOpen
                  ? 'on'
                  : ''
              }
              onClick={() => {
                setMenuOpen(
                  false
                );

                setMobileMenuOpen(
                  open =>
                    !open
                );
              }}
              aria-expanded={
                mobileMenuOpen
              }
            >
              MENU
              <span
                className="mobile-menu-arrow"
              >
                {mobileMenuOpen
                  ? '▲'
                  : '▼'}
              </span>
            </button>
          </nav>

          {/* MENU展開部 */}
          <div
            className={`mobile-more-menu ${
              mobileMenuOpen
                ? 'open'
                : ''
            }`}
          >
            {MOBILE_MORE_ITEMS.map(
              item => (
                <button
                  key={
                    item.href
                  }
                  className={
                    pathname ===
                    item.href
                      ? 'on'
                      : ''
                  }
                  onClick={() =>
                    nav(
                      item.href
                    )
                  }
                >
                  {
                    item.label
                  }
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <style jsx global>{`
        /* =========================
           DESKTOP
        ========================= */

        .topbar-desktop {
          width: 100%;
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .topbar-desktop-spacer {
          flex: 1;
          min-width: 12px;
        }

        .topbar-mobile {
          display: none;
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 720px) {
          .topbar {
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            display: block !important;
            overflow: visible !important;
          }

          .topbar-desktop {
            display: none !important;
          }

          .topbar-mobile {
            display: block;
            width: 100%;
            position: relative;
            background: inherit;
          }

          /* ---------- 1段目 ---------- */

          .mobile-top-row {
            min-height: 64px;
            padding: 0 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            box-sizing: border-box;
          }

          .mobile-brand {
            flex: 0 0 auto;
            font-size: 22px !important;
            letter-spacing: 0.28em !important;
            white-space: nowrap;
            cursor: pointer;
          }

          .mobile-top-row .user-wrap {
            position: relative;
            flex: 0 1 auto;
            min-width: 0;
            margin-left: auto;
          }

          .mobile-top-row .user-chip {
            min-width: 0;
            max-width: 190px;
            height: 46px;
            box-sizing: border-box;
          }

          .mobile-top-row .topbar-user-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobile-top-row .user-menu {
            right: 0;
            left: auto;
            top: calc(100% + 8px);
            z-index: 500;
          }

          /* ---------- 2段目 ---------- */

          .mobile-nav-row {
            height: 51px;
            display: grid;
            grid-template-columns:
              0.8fr
              1.35fr
              1fr
              0.85fr;
            align-items: stretch;
            border-top:
              1px solid
              rgba(255, 255, 255, 0.06);
            border-bottom:
              1px solid
              rgba(255, 255, 255, 0.09);
            box-sizing: border-box;
          }

          .mobile-nav-row > button {
            min-width: 0;
            border: 0;
            border-radius: 0;
            padding: 0 5px;
            background: transparent;
            color: rgba(
              255,
              255,
              255,
              0.65
            );
            font: inherit;
            font-size: 11px;
            letter-spacing: 0.025em;
            white-space: nowrap;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 5px;
            transition:
              color 0.15s ease,
              background 0.15s ease;
          }

          .mobile-nav-row > button.on {
            color: #f5f5f5;
            background: rgba(
              255,
              255,
              255,
              0.065
            );
          }

          .mobile-menu-arrow {
            font-size: 6px;
            opacity: 0.5;
            margin-top: 1px;
          }

          /* ---------- MENU展開 ---------- */

          .mobile-more-menu {
            display: grid;
            grid-template-columns:
              repeat(3, 1fr);
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            border-bottom:
              1px solid transparent;
            transition:
              max-height 0.2s ease,
              opacity 0.15s ease,
              border-color 0.15s ease;
          }

          .mobile-more-menu.open {
            max-height: 60px;
            opacity: 1;
            border-bottom-color:
              rgba(
                255,
                255,
                255,
                0.08
              );
          }

          .mobile-more-menu button {
            height: 48px;
            border: 0;
            background: rgba(
              255,
              255,
              255,
              0.018
            );
            color: rgba(
              255,
              255,
              255,
              0.56
            );
            font: inherit;
            font-size: 10px;
            letter-spacing: 0.04em;
            cursor: pointer;
          }

          .mobile-more-menu button.on {
            color: #f5f5f5;
            background: rgba(
              255,
              255,
              255,
              0.055
            );
          }

          .mobile-more-menu button + button {
            border-left:
              1px solid
              rgba(
                255,
                255,
                255,
                0.055
              );
          }

          /* ログアウト時 */
          .mobile-top-row .login-link {
            margin-left: auto;
            white-space: nowrap;
          }
        }

        /* さらに狭いiPhone向け */
        @media (max-width: 420px) {
          .mobile-top-row {
            padding-left: 15px;
            padding-right: 15px;
          }

          .mobile-brand {
            font-size: 19px !important;
            letter-spacing: 0.24em !important;
          }

          .mobile-top-row .user-chip {
            max-width: 150px;
          }

          .mobile-nav-row > button {
            font-size: 10px;
          }
        }
      `}</style>
    </>
  );
}
