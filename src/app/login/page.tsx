'use client';
// ログインページ
// 会員登録（招待コード）・パスワード再設定・Googleログイン対応

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { KInput } from '@/components/ui/Kit';
import { Modal } from '@/components/ui/Modal';

export default function LoginPage() {
  const router = useRouter();

  const {
    user,
    login,
    loginWithGoogle,
    signup,
    findId,
    resetPassword,
    mock,
  } = useAuth();

  const toast = useToast();

  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const [signupOpen, setSignupOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  // 会員登録フォーム
  const [sId, setSId] = useState('');
  const [sPw, setSPw] = useState('');
  const [sNick, setSNick] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sCode, setSCode] = useState('');
  const [sErr, setSErr] = useState('');

  // ID / パスワード確認
  const [fEmail, setFEmail] = useState('');
  const [fErr, setFErr] = useState('');
  const [fInfo, setFInfo] = useState('');

  // すでにログイン済みならトップへ
  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const doLogin = async () => {
    setErr('');

    const r = await login(
      id.trim(),
      pw
    );

    if (!r.ok) {
      setErr(
        r.error ?? 'ログインに失敗しました。'
      );
      return;
    }

    toast('ログインしました。');
    router.push('/');
  };

  const doGoogleLogin = async () => {
    setErr('');
    setGoogleBusy(true);

    try {
      const r = await loginWithGoogle();

      if (!r.ok) {
        setErr(
          r.error ??
          'Googleログインに失敗しました。'
        );
        return;
      }

      toast(
        'Googleアカウントでログインしました。'
      );

      router.push('/');
    } finally {
      setGoogleBusy(false);
    }
  };

  const doSignup = async () => {
    setSErr('');

    const r = await signup(
      sId.trim(),
      sPw,
      sNick.trim(),
      sCode.trim(),
      (mock ? sEmail : sId).trim()
    );

    if (!r.ok) {
      setSErr(
        r.error ?? '会員登録に失敗しました。'
      );
      return;
    }

    setSignupOpen(false);

    toast(
      mock
        ? '会員登録が完了しました。作成したアカウントでログインしてください。'
        : '会員登録が完了しました。メール認証後にログインしてください。'
    );
  };

  const doFindId = async () => {
    setFErr('');
    setFInfo('');

    const r = await findId(
      fEmail.trim()
    );

    if (!r.ok) {
      setFErr(
        r.error ?? '確認に失敗しました。'
      );
      return;
    }

    setFInfo(
      `ID：${r.foundId}`
    );
  };

  const doFind = async () => {
    setFErr('');
    setFInfo('');

    const r = await resetPassword(
      fEmail.trim()
    );

    if (!r.ok) {
      setFErr(
        r.error ?? '確認に失敗しました。'
      );
      return;
    }

    if (r.tempPassword) {
      setFInfo(
        `仮パスワード：${r.tempPassword} — ログイン後、マイページから変更してください。`
      );
    } else {
      setFindOpen(false);

      toast(
        'パスワード再設定用のメールを送信しました。'
      );
    }
  };

  return (
    <section className="page">
      <div
        className="panel"
        style={{
          padding: 28,
          maxWidth: 480,
          margin: '40px auto 0',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 24,
            letterSpacing: '.3em',
            textAlign: 'center',
            margin: '4px 0 18px',
            color: 'var(--ink)',
          }}
        >
          LOGIN
        </h1>

        {!mock && (
          <>
            <button
              className="btn btn-ghost"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: 10,
                fontWeight: 600,
              }}
              onClick={doGoogleLogin}
              disabled={googleBusy}
            >
              {googleBusy
                ? 'Googleに接続中...'
                : 'Googleでログイン'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '14px 0',
                color: 'var(--muted)',
                fontSize: 10,
              }}
            >
              <span
                style={{
                  height: 1,
                  flex: 1,
                  background: 'var(--line)',
                }}
              />

              <span>または</span>

              <span
                style={{
                  height: 1,
                  flex: 1,
                  background: 'var(--line)',
                }}
              />
            </div>
          </>
        )}

        <div
          style={{
            display: 'grid',
            gap: 9,
          }}
        >
          <KInput
            placeholder={
              mock
                ? 'ID'
                : 'メールアドレス'
            }
            value={id}
            onChange={e =>
              setId(e.target.value)
            }
          />

          <KInput
            placeholder="パスワード"
            type="password"
            value={pw}
            onChange={e =>
              setPw(e.target.value)
            }
            onKeyDown={e => {
              if (e.key === 'Enter') {
                void doLogin();
              }
            }}
          />

          {err && (
            <p
              style={{
                fontSize: 11.5,
                color: 'var(--accent)',
              }}
            >
              {err}
            </p>
          )}

          <button
            className="btn btn-dark"
            style={{
              justifyContent: 'center',
              padding: 10,
            }}
            onClick={doLogin}
          >
            ログイン
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 10,
          }}
        >
          <button
            className="btn btn-ghost"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: 7,
              fontSize: 11,
            }}
            onClick={() =>
              setSignupOpen(true)
            }
          >
            会員登録
          </button>

          <button
            className="btn btn-ghost"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: 7,
              fontSize: 11,
            }}
            onClick={() =>
              setFindOpen(true)
            }
          >
            パスワードを忘れた方
          </button>
        </div>
      </div>

      <Modal
        open={signupOpen}
        onClose={() =>
          setSignupOpen(false)
        }
        small
        title="会員登録"
        desc="会員登録には招待コードが必要です。"
        dirty={
          !!(
            sId ||
            sPw ||
            sNick ||
            sCode
          )
        }
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() =>
                setSignupOpen(false)
              }
            >
              キャンセル
            </button>

            <button
              className="btn btn-dark"
              onClick={doSignup}
            >
              登録
            </button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gap: 9,
          }}
        >
          <KInput
            placeholder={
              mock
                ? 'ID'
                : 'メールアドレス'
            }
            value={sId}
            onChange={e =>
              setSId(e.target.value)
            }
          />

          <KInput
            placeholder="パスワード"
            type="password"
            value={sPw}
            onChange={e =>
              setSPw(e.target.value)
            }
          />

          <KInput
            placeholder="ニックネーム"
            value={sNick}
            onChange={e =>
              setSNick(e.target.value)
            }
          />

          {mock && (
            <KInput
              placeholder="メールアドレス"
              value={sEmail}
              onChange={e =>
                setSEmail(
                  e.target.value
                )
              }
            />
          )}

          <KInput
            placeholder="招待コード"
            value={sCode}
            onChange={e =>
              setSCode(e.target.value)
            }
          />

          {sErr && (
            <p
              style={{
                fontSize: 11.5,
                color: 'var(--accent)',
              }}
            >
              {sErr}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={findOpen}
        onClose={() => {
          setFindOpen(false);
          setFInfo('');
          setFErr('');
        }}
        small
        title={
          mock
            ? 'ID・パスワード確認'
            : 'パスワード再設定'
        }
        desc={
          mock
            ? '登録時のメールアドレスからIDを確認、または仮パスワードを発行します。'
            : '登録済みのメールアドレスに再設定用リンクを送信します。'
        }
        dirty={!!fEmail}
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setFindOpen(false);
                setFInfo('');
                setFErr('');
              }}
            >
              キャンセル
            </button>

            {mock && (
              <button
                className="btn btn-ghost"
                onClick={doFindId}
              >
                IDを確認
              </button>
            )}

            <button
              className="btn btn-dark"
              onClick={doFind}
            >
              {mock
                ? '仮パスワードを発行'
                : '送信'}
            </button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gap: 9,
          }}
        >
          <KInput
            placeholder="メールアドレス"
            value={fEmail}
            onChange={e =>
              setFEmail(e.target.value)
            }
          />

          {fErr && (
            <p
              style={{
                fontSize: 11.5,
                color: 'var(--accent)',
              }}
            >
              {fErr}
            </p>
          )}

          {fInfo && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              {fInfo}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
}
