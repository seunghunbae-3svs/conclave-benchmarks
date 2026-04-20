import { URL } from "node:url";

const ALLOWED_HOSTS = new Set(["api.example.com", "cdn.example.com"]);

export async function fetchWebhook(rawUrl: string): Promise<string> {
  const u = new URL(rawUrl);
  if (!ALLOWED_HOSTS.has(u.hostname)) {
    throw new Error(`host not allowlisted: ${u.hostname}`);
  }
  const res = await fetch(u);
  return await res.text();
}
