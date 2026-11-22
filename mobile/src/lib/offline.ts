/**
 * Offline vault: chosen documents kept on the phone in an ENCRYPTED SQLite
 * database (SQLCipher via op-sqlite; enabled in package.json "op-sqlite").
 * The database key is random, created once, and kept in secure storage.
 */
import { open, type DB } from "@op-engineering/op-sqlite";
import * as Crypto from "expo-crypto";

import { getSecret, setSecret } from "./secure";

const KEY_NAME = "upkept.vault-key";
let db: DB | null = null;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function vault(): Promise<DB> {
  if (db) return db;
  let key = await getSecret(KEY_NAME);
  if (!key) {
    key = toHex(Crypto.getRandomBytes(32));
    await setSecret(KEY_NAME, key);
  }
  db = open({ name: "vault.db", encryptionKey: key });
  await db.execute(
    `CREATE TABLE IF NOT EXISTS docs (
       id TEXT PRIMARY KEY, title TEXT NOT NULL, content_type TEXT NOT NULL,
       data_base64 TEXT NOT NULL, saved_at TEXT NOT NULL)`,
  );
  return db;
}

export interface OfflineDoc {
  id: string;
  title: string;
  content_type: string;
  data_base64: string;
  saved_at: string;
}

export async function saveOffline(doc: Omit<OfflineDoc, "saved_at">) {
  const d = await vault();
  await d.execute("INSERT OR REPLACE INTO docs (id, title, content_type, data_base64, saved_at) VALUES (?, ?, ?, ?, ?)", [
    doc.id, doc.title, doc.content_type, doc.data_base64, new Date().toISOString(),
  ]);
}

export async function listOffline(): Promise<Omit<OfflineDoc, "data_base64">[]> {
  const d = await vault();
  const res = await d.execute("SELECT id, title, content_type, saved_at FROM docs ORDER BY saved_at DESC");
  return res.rows as unknown as Omit<OfflineDoc, "data_base64">[];
}

export async function getOffline(id: string): Promise<OfflineDoc | null> {
  const d = await vault();
  const res = await d.execute("SELECT * FROM docs WHERE id = ?", [id]);
  return (res.rows[0] as unknown as OfflineDoc) ?? null;
}

export async function removeOffline(id: string) {
  const d = await vault();
  await d.execute("DELETE FROM docs WHERE id = ?", [id]);
}

/** Used on sign-out and account deletion. */
export async function wipeOffline() {
  const d = await vault();
  await d.execute("DELETE FROM docs");
}

/** Download a document through the API (with the login token) and keep it offline. */
export async function downloadForOffline(url: string, accessToken: string, meta: { id: string; title: string }) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("Couldn't download the document");
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  await saveOffline({ id: meta.id, title: meta.title, content_type: contentType, data_base64: btoa(binary) });
}
