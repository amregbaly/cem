/**
 * AST-07: Frontend API client for the AI assistant module.
 * All calls go through the Next.js API URL (NEXT_PUBLIC_API_URL).
 */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface AsistenteConfig {
  habilitado: boolean;
  proveedor: string | null;
  modelo: string | null;
  api_key_masked: string | null;
  max_tokens: number;
  temperatura_x10: number;
}

export interface AsistenteConfigUpdate {
  habilitado: boolean;
  proveedor: string | null;
  modelo: string | null;
  api_key?: string | null;
  max_tokens: number;
  temperatura_x10: number;
}

export interface ChatResponse {
  reply: string;
  provider: string;
  model: string;
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface AsistenteStatus {
  habilitado: boolean;
  proveedor: string | null;
  modelo: string | null;
}

export async function getAsistenteStatus(token: string): Promise<AsistenteStatus> {
  const res = await fetch(`${API}/api/v1/asistente/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return { habilitado: false, proveedor: null, modelo: null };
  return res.json();
}

export async function getAsistenteConfig(token: string): Promise<AsistenteConfig> {
  const res = await fetch(`${API}/api/v1/asistente/config`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function updateAsistenteConfig(
  token: string,
  payload: AsistenteConfigUpdate
): Promise<AsistenteConfig> {
  const res = await fetch(`${API}/api/v1/asistente/config`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sendChatMessage(
  token: string,
  message: string
): Promise<ChatResponse> {
  const res = await fetch(`${API}/api/v1/asistente/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(body.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function resetChatSession(token: string): Promise<void> {
  await fetch(`${API}/api/v1/asistente/chat/reset`, {
    method: "POST",
    headers: authHeaders(token),
  });
}
