// supabase/functions/send-push/index.ts
//
// Sends a push notification to one or more Court Report users via Firebase
// Cloud Messaging (FCM HTTP v1).
//
// ⚠️ iOS TOKEN CAVEAT: FCM v1 `message.token` needs an *FCM registration
// token*. The bare @capacitor/push-notifications plugin yields a raw APNs
// token on iOS, which FCM rejects. To deliver to iOS, the client must obtain an
// FCM token via the Firebase iOS SDK — swap in @capacitor-firebase/messaging so
// both platforms store FCM tokens (then this function works unchanged). Android
// already yields an FCM token today. See MOBILE-SETUP.md.
//
// ── Activation (blocked on a Firebase project) ────────────────────────────
//   1. Create a Firebase project and add both apps (iOS bundle id +
//      Android package `com.palmvolleypickle.courtreport`).
//   2. iOS: upload the APNs auth key (.p8) to Firebase → Cloud Messaging.
//   3. Create a service account key (JSON) with the Firebase Messaging role.
//   4. Set the function secrets, then deploy:
//        supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"
//        supabase secrets set SEND_PUSH_SECRET="<random>"
//        supabase functions deploy send-push
//
// ── Request ───────────────────────────────────────────────────────────────
//   POST  header: x-send-secret: <SEND_PUSH_SECRET>
//   body:  { "userIds": ["uuid", ...], "title": "...", "body": "...",
//            "data": { "any": "string" } }   // data optional
//
// Uses the service-role key (already present in Edge Function env as
// SUPABASE_SERVICE_ROLE_KEY) to read tokens, bypassing RLS.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

// ── Mint a short-lived OAuth2 access token from the service account (RS256) ──
function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: FCM_SCOPE,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned))
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const secret = Deno.env.get("SEND_PUSH_SECRET");
  if (!secret || req.headers.get("x-send-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!saRaw) return new Response("FCM not configured", { status: 503 });
  const sa: ServiceAccount = JSON.parse(saRaw);

  let payload: { userIds?: string[]; title?: string; body?: string; data?: Record<string, string> };
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const userIds = (payload.userIds ?? []).filter(Boolean);
  if (userIds.length === 0 || !payload.title) {
    return Response.json({ ok: false, error: "userIds and title required" }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: rows } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);
  const tokens = (rows ?? []).map((r) => r.token);
  if (tokens.length === 0) return Response.json({ ok: true, sent: 0 });

  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  let sent = 0;
  const stale: string[] = [];
  for (const token of tokens) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body ?? "" },
          data: payload.data ?? {},
        },
      }),
    });
    if (res.ok) {
      sent++;
      continue;
    }
    // Prune ONLY tokens FCM reports as permanently dead (UNREGISTERED / 404),
    // never on a generic 400 — a transient or unrelated error must not delete a
    // valid token.
    try {
      const err = await res.json();
      const code = (err?.error?.details ?? []).find((d: { errorCode?: string }) => d?.errorCode)
        ?.errorCode;
      if (res.status === 404 || code === "UNREGISTERED") stale.push(token);
    } catch {
      /* unknown error shape — leave the token in place */
    }
  }

  // Prune dead tokens so the table stays clean.
  if (stale.length) await supabase.from("push_tokens").delete().in("token", stale);

  return Response.json({ ok: true, sent, pruned: stale.length });
});
