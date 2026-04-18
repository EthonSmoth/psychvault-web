const NAVBAR_SESSION_REFRESH_KEY = "psychvault.navbar-session.refresh";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function requestNavbarSessionRefresh() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(NAVBAR_SESSION_REFRESH_KEY, "1");
}

export function consumeNavbarSessionRefreshRequest() {
  if (!canUseSessionStorage()) {
    return false;
  }

  const shouldRefresh = window.sessionStorage.getItem(NAVBAR_SESSION_REFRESH_KEY) === "1";

  if (shouldRefresh) {
    window.sessionStorage.removeItem(NAVBAR_SESSION_REFRESH_KEY);
  }

  return shouldRefresh;
}