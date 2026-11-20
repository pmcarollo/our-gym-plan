import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const encoder = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

async function sign(payload: object, secret: string) {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return `${data}.${b64url(sig)}`;
}

async function verify(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const data = `${parts[0]}.${parts[1]}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, decode(parts[2]), encoder.encode(data));
  if (!valid) return false;
  const payload = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  return payload.exp > Math.floor(Date.now() / 1000) && payload.scope === "gym";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const pin = Deno.env.get("GYM_PIN");
  const signingSecret = Deno.env.get("GYM_TOKEN_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!pin || !signingSecret || !url || !serviceKey) return json({ error: "Server is not configured yet." }, 500);

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

  if (body.action === "login") {
    if (typeof body.pin !== "string" || body.pin !== pin) return json({ error: "That passcode didn't match." }, 401);
    const token = await sign({ scope: "gym", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, signingSecret);
    return json({ token, expiresIn: 60 * 60 * 24 * 30 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!await verify(token, signingSecret)) return json({ error: "Your session expired. Please enter the passcode again." }, 401);

  if (body.action === "load") {
    const { data, error } = await db.from("gym_data").select("profile,payload,updated_at");
    if (error) return json({ error: "Couldn't load workout data." }, 500);
    return json({ profiles: data ?? [] });
  }

  if (body.action === "save") {
    const profile = body.profile;
    const payload = body.payload;
    if (!["Paul", "Chris"].includes(profile) || !payload || typeof payload !== "object") return json({ error: "Invalid workout update." }, 400);
    const { data, error } = await db.from("gym_data").upsert({ profile, payload, updated_at: new Date().toISOString() }, { onConflict: "profile" }).select("profile,payload,updated_at").single();
    if (error) return json({ error: "Couldn't save workout data." }, 500);
    return json({ profile: data });
  }

  return json({ error: "Unknown action." }, 400);
});