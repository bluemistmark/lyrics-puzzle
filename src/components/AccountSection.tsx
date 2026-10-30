import { useState } from "react";
import {
  deleteAccount,
  PROVIDERS,
  signIn,
  signOut,
  useAccount,
  type Provider,
} from "../account";
import { ProviderLogo } from "./ProviderLogo";

const providerName: Record<string, string> = {
  kakao: "카카오",
  google: "구글",
};
const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Login part of the account modal. Hidden when the Supabase env vars are missing. */
export function AccountSection() {
  const { status, user, syncing, syncedAt, error } = useAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  if (status === "unavailable") return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const login = (provider: Provider) => run(() => signIn(provider));

  return (
    <section className="account-section" aria-label="로그인">
      {status === "checking" && <p>로그인 상태를 확인하는 중…</p>}
      {status === "signedOut" && (
        <>
          <p>기록을 다른 기기에서도 이어서 할 수 있어요.</p>
          <div className="account-buttons account-logins">
            {PROVIDERS.map(([provider, label]) => (
              <button
                key={provider}
                type="button"
                className={`account-login ${provider}`}
                disabled={busy}
                onClick={() => login(provider)}
              >
                <ProviderLogo provider={provider} />
                {label}
              </button>
            ))}
          </div>
          {/* Consent notice: shortened, but it has to stay next to the buttons. */}
          <p className="account-note">
            만 14세 이상 · 로그인하면{" "}
            <a href="/privacy.html" target="_blank" rel="noopener">
              개인정보 처리방침
            </a>
            에 동의하게 돼요
          </p>
        </>
      )}
      {status === "signedIn" && user && (
        <>
          <p>
            <b>{user.name}</b>
            {providerName[user.provider] &&
              ` (${providerName[user.provider]})`}{" "}
            계정으로 로그인했어요.
            <br />
            {syncing
              ? "기록을 저장하는 중…"
              : syncedAt
                ? `${time(syncedAt)}에 기록을 저장했어요.`
                : ""}
          </p>
          {confirming ? (
            <div className="account-confirm">
              <p>
                탈퇴하면 계정과 계정에 저장된 기록, 랭킹 기록이 모두 삭제되고
                되돌릴 수 없어요. 이 기기의 기록은 남아요.
              </p>
              <div className="account-buttons">
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => run(deleteAccount)}
                >
                  탈퇴하기
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="account-buttons">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(signOut)}
              >
                로그아웃
              </button>
              <button
                type="button"
                className="account-delete"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                회원 탈퇴
              </button>
            </div>
          )}
        </>
      )}
      {(message || error) && (
        <p className="error" role="status">
          {message || error}
        </p>
      )}
    </section>
  );
}
