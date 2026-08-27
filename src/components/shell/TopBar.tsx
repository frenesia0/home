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
  {
    label: 'HOME',
    href: '/',
  },
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
  {
    label: 'HOME',
    href: '/',
  },
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

  const renderUserArea =
    (mobile = false) => {
      if (!user) {
        return (
          <button
            className="login-link"
            onClick={() =>
              nav('/login')
            }
          >
            LOGIN
          </button>
        );
      }

      return (
        <div
          className={`user-wrap ${
            mobile
              ? 'mobile-user-wrap'
              : ''
          }`}
          ref={
            mobile
              ? undefined
              : userRef
          }
        >
          <button
            type="button"
            className="user-chip"
            onClick={() => {
              setMobileMenuOpen(
                false
              );

              setMenuOpen(
                open =>
                  !open
              );
            }}
            aria-expanded={
              menuOpen
            }
          >
            <span
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
            </span>

            <span className="topbar-user-name">
              {
                user.nickname
              }
            </span>

            <span className="user-chip-arrow">
              ▾
            </span>
          </button>

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
      );
    };

  return (
    <>
      <header className="topbar">
        {/* =========================
            PC
        ========================= */}

        <div className="topbar-desktop">
          <div
            className="brand"
            onClick={() =>
              nav('/')
            }
            role="link"
            tabIndex={0}
            onKeyDown={
              event => {
                if (
                  event.key ===
                    'Enter' ||
                  event.key ===
                    ' '
                ) {
                  event.preventDefault();
                  nav('/');
                }
              }
            }
            style={{
              cursor:
                'pointer',
            }}
          >
            frenesia0
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

          <div className="topbar-desktop-spacer" />

          {editOn &&
            pathname ===
              '/' && (
              <button
                className="btn btn-ghost"
                style={{
                  height: 27,
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

          {renderUserArea()}
        </div>

        {/* =========================
            MOBILE
        ========================= */}

        <div className="topbar-mobile">
          {/* 1段目 */}
          <div className="mobile-top-row">
            <div
              className="brand mobile-brand"
              onClick={() =>
                nav('/')
              }
              role="link"
              tabIndex={0}
              onKeyDown={
                event => {
                  if (
                    event.key ===
                      'Enter' ||
                    event.key ===
                      ' '
                  ) {
                    event.preventDefault();
                    nav('/');
                  }
                }
              }
            >
              frenesia0
            </div>

            {renderUserArea(
              true
            )}
          </div>

          {/* 2段目 */}
          <div className="mobile-nav-shell">
            <nav
              className="mobile-nav-row"
              aria-label="モバイルナビゲーション"
            >
              {MOBILE_MAIN_ITEMS.map(
                item => (
                  <button
                    type="button"
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
                type="button"
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
                <span>
                  MENU
                </span>

                <span className="mobile-menu-arrow">
                  {mobileMenuOpen
                    ? '▲'
                    : '▼'}
                </span>
              </button>
            </nav>
          </div>

          {/* MENU展開 */}
          <div
            className={`mobile-more-wrap ${
              mobileMenuOpen
                ? 'open'
                : ''
            }`}
          >
            <div className="mobile-more-menu">
              {MOBILE_MORE_ITEMS.map(
                item => (
                  <button
                    type="button"
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
        </div>
      </header>

      <style jsx global>{`
  /* ========================================
     BRAND LOGO
  ======================================== */

  .brand {
    font-family:
      Georgia,
      'Times New Roman',
      serif !important;

    font-weight: 400 !important;
    font-style: normal;

    letter-spacing:
      0.24em;
  }

  /* ========================================
     PC
  ======================================== */

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

        /* user-chipをbutton化したため
           ブラウザ標準ボタン装飾を除去 */
        .user-chip {
          font: inherit;
          color: inherit;
          border: 0;
          cursor: pointer;
        }

        .user-chip-arrow {
          font-size: 9px;
          color: #8d939d;
          flex: 0 0 auto;
        }

        /* ========================================
           MOBILE
        ======================================== */

        @media (max-width: 720px) {
          .topbar {
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            display: block !important;
            overflow: visible !important;

            background:
              rgba(
                17,
                19,
                24,
                0.97
              ) !important;

            border-bottom:
              1px solid
              rgba(
                255,
                255,
                255,
                0.055
              ) !important;
          }

          .topbar-desktop {
            display: none !important;
          }

          .topbar-mobile {
            display: block;
            position: relative;
            width: 100%;
            box-sizing: border-box;
          }

          /* =====================
             1段目
          ===================== */

          .mobile-top-row {
            min-height: 64px;
            padding: 0 18px;

            display: flex;
            align-items: center;
            justify-content:
              space-between;

            gap: 14px;

            box-sizing:
              border-box;
          }

          .mobile-brand {
            flex: 0 0 auto;

            font-size:
              21px !important;

            letter-spacing:
              0.27em !important;

            white-space:
              nowrap;

            cursor:
              pointer;
          }

          .mobile-user-wrap {
            position: relative;

            min-width: 0;
            max-width: 190px;

            margin-left: auto;
          }

          .mobile-user-wrap
            .user-chip {
            min-width: 0;
            max-width: 190px;

            height: 43px;

            padding:
              4px 12px
              4px 5px;

            border-radius:
              16px;

            background:
              rgba(
                255,
                255,
                255,
                0.055
              );

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                0.045
              );

            display: flex;
            align-items: center;

            gap: 9px;

            box-sizing:
              border-box;

            transition:
              background
                0.15s ease,
              border-color
                0.15s ease;
          }

          .mobile-user-wrap
            .user-chip:active {
            background:
              rgba(
                255,
                255,
                255,
                0.09
              );
          }

          .mobile-user-wrap
            .avatar {
            flex: 0 0 auto;
          }

          .mobile-user-wrap
            .topbar-user-name {
            min-width: 0;

            overflow:
              hidden;

            text-overflow:
              ellipsis;

            white-space:
              nowrap;
          }

          .mobile-user-wrap
            .user-menu {
            right: 0;
            left: auto;

            top:
              calc(
                100% + 9px
              );

            z-index: 1000;
          }

          /* =====================
             2段目
          ===================== */

          .mobile-nav-shell {
            padding:
              0 13px 10px;

            box-sizing:
              border-box;
          }

          .mobile-nav-row {
            height: 43px;

            display: grid;

            grid-template-columns:
              0.85fr
              1.35fr
              1fr
              0.85fr;

            align-items:
              stretch;

            gap: 3px;

            padding: 3px;

            border-radius:
              14px;

            background:
              rgba(
                255,
                255,
                255,
                0.025
              );

            box-sizing:
              border-box;
          }

          .mobile-nav-row
            > button {
            position:
              relative;

            min-width: 0;

            border: 0;

            border-radius:
              11px;

            padding:
              0 6px;

            background:
              transparent;

            color:
              rgba(
                255,
                255,
                255,
                0.55
              );

            font: inherit;

            font-size:
              10.5px;

            letter-spacing:
              0.025em;

            white-space:
              nowrap;

            cursor:
              pointer;

            display: flex;

            justify-content:
              center;

            align-items:
              center;

            gap: 5px;

            transition:
              color
                0.15s ease,
              background
                0.15s ease;
          }

          .mobile-nav-row
            > button.on {
            color:
              rgba(
                255,
                255,
                255,
                0.96
              );

            background:
              rgba(
                255,
                255,
                255,
                0.075
              );
          }

          .mobile-nav-row
            > button.on::after {
            content: '';

            position:
              absolute;

            left: 24%;
            right: 24%;
            bottom: 2px;

            height: 1px;

            border-radius:
              999px;

            background:
              rgba(
                255,
                255,
                255,
                0.55
              );
          }

          .mobile-menu-arrow {
            font-size: 6px;

            opacity:
              0.45;

            transform:
              translateY(
                1px
              );
          }

          /* =====================
             MENU開閉
          ===================== */

          .mobile-more-wrap {
            position:
              absolute;

            top: 100%;
            left: 0;
            right: 0;

            padding:
              0 13px;

            pointer-events:
              none;

            opacity: 0;

            transform:
              translateY(
                -6px
              );

            transition:
              opacity
                0.16s ease,
              transform
                0.18s ease;

            z-index: 700;
          }

          .mobile-more-wrap.open {
            pointer-events:
              auto;

            opacity: 1;

            transform:
              translateY(
                0
              );
          }

          .mobile-more-menu {
            padding: 7px;

            display: grid;

            grid-template-columns:
              repeat(
                3,
                1fr
              );

            gap: 4px;

            border-radius:
              14px;

            background:
              rgba(
                22,
                24,
                30,
                0.97
              );

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                0.09
              );

            box-shadow:
              0 12px 34px
              rgba(
                0,
                0,
                0,
                0.34
              );

            backdrop-filter:
              blur(18px);
          }

          .mobile-more-menu
            button {
            min-width: 0;
            height: 40px;

            border: 0;

            border-radius:
              9px;

            background:
              transparent;

            color:
              rgba(
                255,
                255,
                255,
                0.56
              );

            font: inherit;

            font-size:
              10px;

            letter-spacing:
              0.035em;

            cursor:
              pointer;

            transition:
              background
                0.15s ease,
              color
                0.15s ease;
          }

          .mobile-more-menu
            button.on {
            color:
              #f5f5f5;

            background:
              rgba(
                255,
                255,
                255,
                0.075
              );
          }

          .mobile-top-row
            .login-link {
            margin-left: auto;

            white-space:
              nowrap;
          }
        }

        /* ========================================
           小さいiPhone
        ======================================== */

        @media (max-width: 420px) {
          .mobile-top-row {
            padding-left:
              15px;

            padding-right:
              15px;
          }

          .mobile-brand {
            font-size:
              19px !important;

            letter-spacing:
              0.235em !important;
          }

          .mobile-user-wrap {
            max-width: 155px;
          }

          .mobile-user-wrap
            .user-chip {
            max-width: 155px;
          }

          .mobile-nav-shell {
            padding-left:
              10px;

            padding-right:
              10px;
          }

          .mobile-nav-row
            > button {
            font-size:
              9.5px;
          }

          .mobile-more-wrap {
            padding-left:
              10px;

            padding-right:
              10px;
          }
        }

        /* ========================================
           かなり狭い端末
        ======================================== */

        @media (max-width: 360px) {
          .mobile-brand {
            font-size:
              17px !important;
          }

          .mobile-user-wrap {
            max-width: 135px;
          }

          .mobile-user-wrap
            .user-chip {
            max-width: 135px;
          }

          .mobile-nav-row
            > button {
            font-size:
              9px;

            padding-left:
              3px;

            padding-right:
              3px;
          }
        }
      `}</style>
    </>
  );
}
