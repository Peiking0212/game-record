export function jwtMeta(token) {
  try {
    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
    );
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    const exp = payload.exp;
    const expired =
      typeof exp === "number" && exp < Math.floor(Date.now() / 1000);
    return {
      alg: header.alg || "?",
      exp,
      expired,
      expLocal:
        typeof exp === "number"
          ? new Date(exp * 1000).toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })
          : "?",
      sub: payload.sub ? `${String(payload.sub).slice(0, 8)}…` : null,
    };
  } catch {
    return { alg: "?", expired: true, expLocal: "?" };
  }
}

export function userTokenExpired(token) {
  return jwtMeta(token).expired;
}

export async function refreshAccessToken(supabaseUrl, anonKey, refreshToken) {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    return {
      ok: false,
      status: res.status,
      error: json.error_description || json.msg || json.error || "refresh_failed",
    };
  }
  return {
    ok: true,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  };
}

export async function signInWithPassword(supabaseUrl, anonKey, email, password) {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    return {
      ok: false,
      status: res.status,
      error: json.error_description || json.msg || json.error || "sign_in_failed",
    };
  }
  return {
    ok: true,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    user: json.user,
  };
}

/**
 * Resolve a valid access_token: existing → refresh → password sign-in.
 */
export async function resolveTestUserAccessToken({
  supabaseUrl,
  anonKey,
  accessToken = "",
  refreshToken = "",
  email = "",
  password = "",
}) {
  if (accessToken && !userTokenExpired(accessToken)) {
    return { access_token: accessToken, source: "TEST_USER_ACCESS_TOKEN" };
  }

  if (refreshToken) {
    const refreshed = await refreshAccessToken(supabaseUrl, anonKey, refreshToken);
    if (refreshed.ok) {
      return {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        source: "TEST_USER_REFRESH_TOKEN",
      };
    }
  }

  if (email && password) {
    const signed = await signInWithPassword(supabaseUrl, anonKey, email, password);
    if (signed.ok) {
      return {
        access_token: signed.access_token,
        refresh_token: signed.refresh_token,
        source: "TEST_USER_EMAIL",
      };
    }
    return { error: signed.error, status: signed.status };
  }

  if (accessToken && userTokenExpired(accessToken)) {
    return { error: "access_token_expired" };
  }

  return { error: "no_credentials" };
}
