'use client';
// 로그인 페이지 (4.8) — 회원정보창 위젯은 버튼만 두고 여기로 이동 (위젯 크기 유지 목적)
// 회원가입(가입코드) · 비밀번호 찾기 포함
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { KInput } from '@/components/ui/Kit';
import { Modal } from '@/components/ui/Modal';
import { EditableDesc } from '@/components/ui/PageText';

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

  // 회원가입 폼
  const [sId, setSId] = useState('');
  const [sPw, setSPw] = useState('');
  const [sNick, setSNick] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sCode, setSCode] = useState('');
  const [sErr, setSErr] = useState('');

  // 아이디/비밀번호 찾기
  const [fEmail, setFEmail] = useState('');
  const [fErr, setFErr] = useState('');
  const [fInfo, setFInfo] = useState('');

  // 이미 로그인 상태면 메인으로
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
        r.error ?? '로그인 실패'
      );
      return;
    }

    toast('로그인되었습니다');
    router.push('/');
  };

  const doGoogleLogin = async () => {
    setErr('');
    setGoogleBusy(true);

    try {
      const r =
        await loginWithGoogle();

      if (!r.ok) {
        setErr(
          r.error ??
          'Google 로그인에 실패했습니다'
        );
        return;
      }

      toast(
        'Google 계정으로 로그인되었습니다'
      );

      router.push('/');
    } finally {
      setGoogleBusy(false);
    }
  };

  const doSignup = async () => {
    setSErr('');

    // 서버 모드에서는 아이디가 곧 이메일 — 따로 받지 않고 그대로 쓴다
    const r = await signup(
      sId.trim(),
      sPw,
      sNick.trim(),
      sCode.trim(),
      (mock ? sEmail : sId).trim()
    );

    if (!r.ok) {
      setSErr(
        r.error ?? '가입 실패'
      );
      return;
    }

    setSignupOpen(false);

    toast(
      mock
        ? '가입되었습니다 — 만든 계정으로 로그인해 보세요'
        : '가입되었습니다 — 이메일 인증 후 로그인해 주세요'
    );
  };

  // 아이디 찾기 (v1.9) — 가입 이메일로
  const doFindId = async () => {
    setFErr('');
    setFInfo('');

    const r =
      await findId(
        fEmail.trim()
      );

    if (!r.ok) {
      setFErr(
        r.error ?? '요청 실패'
      );
      return;
    }

    setFInfo(
      `아이디: ${r.foundId}`
    );
  };

  const doFind = async () => {
    setFErr('');
    setFInfo('');

    const r =
      await resetPassword(
        fEmail.trim()
      );

    if (!r.ok) {
      setFErr(
        r.error ?? '요청 실패'
      );
      return;
    }

    if (r.tempPassword) {
      setFInfo(
        `임시 비밀번호: ${r.tempPassword} — 로그인 후 마이페이지에서 변경해 주세요`
      );
    } else {
      setFindOpen(false);

      toast(
        '재설정 링크를 이메일로 보냈습니다'
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
            margin: '4px 0 6px',
            color: 'var(--ink)',
          }}
        >
          LOGIN
        </h1>

        <div
          style={{
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          <EditableDesc
            k="login-desc"
            def="로그인 후 멤버 전용 콘텐츠를 열람할 수 있습니다"
          />
        </div>

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
                ? 'SIGNING IN...'
                : 'SIGN IN WITH GOOGLE'}
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
                  background:
                    'var(--line)',
                }}
              />

              <span>OR</span>

              <span
                style={{
                  height: 1,
                  flex: 1,
                  background:
                    'var(--line)',
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
                ? '아이디'
                : '이메일'
            }
            value={id}
            onChange={e =>
              setId(e.target.value)
            }
          />

          <KInput
            placeholder="비밀번호"
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
            로그인
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
            회원가입
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
            비밀번호 찾기
          </button>
        </div>
      </div>

      <Modal
        open={signupOpen}
        onClose={() =>
          setSignupOpen(false)
        }
        small
        title="회원가입"
        desc="가입코드(초대코드)가 있어야 가입할 수 있습니다"
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
              CANCEL
            </button>

            <button
              className="btn btn-dark"
              onClick={doSignup}
            >
              가입
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
                ? '아이디'
                : '이메일 (아이디)'
            }
            value={sId}
            onChange={e =>
              setSId(e.target.value)
            }
          />

          <KInput
            placeholder="비밀번호"
            type="password"
            value={sPw}
            onChange={e =>
              setSPw(e.target.value)
            }
          />

          <KInput
            placeholder="닉네임"
            value={sNick}
            onChange={e =>
              setSNick(e.target.value)
            }
          />

          {mock && (
            <KInput
              placeholder="이메일 — 아이디·비밀번호 찾기에 사용"
              value={sEmail}
              onChange={e =>
                setSEmail(
                  e.target.value
                )
              }
            />
          )}

          <KInput
            placeholder="가입코드"
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
            ? '아이디·비밀번호 찾기'
            : '비밀번호 재설정'
        }
        desc={
          mock
            ? '가입 시 등록한 이메일로 아이디를 찾거나 임시 비밀번호를 발급합니다'
            : '가입한 이메일로 재설정 링크를 보냅니다'
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
              CANCEL
            </button>

            {mock && (
              <button
                className="btn btn-ghost"
                onClick={doFindId}
              >
                아이디 찾기
              </button>
            )}

            <button
              className="btn btn-dark"
              onClick={doFind}
            >
              {mock
                ? '임시 비밀번호'
                : 'SEND'}
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
            placeholder="이메일"
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
