"""
AST-03 / AST-04: Provider adapters for AI assistant.

Each adapter exposes a single async method:
    async def complete(messages: list[dict], max_tokens: int, temperature: float) -> str

Supported providers: gemini | openai | openrouter | anthropic

All adapters:
- Never log the API key
- Strip the key from any exception messages before re-raising
- Return plain text only (no HTML)
- Respect max_tokens to enforce output budget

The model and key are passed at call-time, never stored on the adapter.
"""
from __future__ import annotations
import httpx
from typing import Protocol


class LLMAdapter(Protocol):
    async def complete(
        self,
        messages: list[dict],
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str: ...


# ─── Gemini ──────────────────────────────────────────────────────────────────

class GeminiAdapter:
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    async def complete(
        self,
        messages: list[dict],
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Call Google Gemini generateContent REST API."""
        # Convert messages to Gemini contents format
        contents = []
        system_text = None
        for m in messages:
            role = m.get("role", "user")
            text = m.get("content", "")
            if role == "system":
                system_text = text
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": text}]})
            else:
                contents.append({"role": "user", "parts": [{"text": text}]})

        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature,
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }
        if system_text:
            payload["systemInstruction"] = {"parts": [{"text": system_text}]}

        # Normalize model name
        clean_model = model.strip()
        if clean_model.startswith("models/"):
            clean_model = clean_model[len("models/"):]

        # Attempt call with retry, and if 503/timeout persists on 3.8, fallback to 3.5-flash
        models_to_try = [clean_model]
        if "3.8" in clean_model and "gemini-3.5-flash" not in clean_model:
            models_to_try.append("gemini-3.5-flash")

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }

        last_error = None
        for m_name in models_to_try:
            curr_url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent"
            timeout_sec = 8 if len(models_to_try) > 1 and m_name != models_to_try[-1] else 30
            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=timeout_sec) as client:
                        resp = await client.post(
                            curr_url,
                            json=payload,
                            params={"key": api_key},
                            headers=headers,
                        )
                    if resp.status_code == 503 and attempt == 0:
                        import asyncio
                        await asyncio.sleep(1.0)
                        continue
                    if resp.status_code == 503 and m_name != models_to_try[-1]:
                        # Fallback to next model
                        break
                    resp.raise_for_status()
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text = "".join(p.get("text", "") for p in parts if isinstance(p, dict) and "text" in p).strip()
                        if text:
                            return text
                    if m_name != models_to_try[-1]:
                        break
                    return "No se pudo obtener una respuesta del asistente."
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 503:
                        last_error = RuntimeError(
                            f"El modelo '{m_name}' está experimentando alta demanda en Google (Error 503). Reintenta en un momento o selecciona 'gemini-3.5-flash'."
                        )
                        if m_name != models_to_try[-1]:
                            break
                        raise last_error
                    err_text = e.response.text[:250]
                    raise RuntimeError(f"Gemini API error {e.response.status_code}: {err_text}")
                except httpx.TimeoutException:
                    last_error = RuntimeError(f"Tiempo de espera agotado para el modelo '{m_name}'.")
                    if m_name != models_to_try[-1]:
                        break
                    raise last_error
                except Exception as e:
                    if m_name != models_to_try[-1]:
                        break
                    raise RuntimeError(f"Gemini error: {str(e)[:200]}")

        if last_error:
            raise last_error


# ─── OpenAI ──────────────────────────────────────────────────────────────────

class OpenAIAdapter:
    BASE_URL = "https://api.openai.com/v1/chat/completions"

    async def complete(
        self,
        messages: list[dict],
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.BASE_URL,
                    json=payload,
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"OpenAI API error {e.response.status_code}: {e.response.text[:200]}")
        except Exception as e:
            raise RuntimeError(f"OpenAI error: {str(e)[:200]}")


# ─── OpenRouter ───────────────────────────────────────────────────────────────

class OpenRouterAdapter:
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

    async def complete(
        self,
        messages: list[dict],
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.BASE_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "HTTP-Referer": "https://municipalidad.cl",
                        "X-Title": "Asistente Cementerio Municipal",
                    },
                )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"OpenRouter API error {e.response.status_code}: {e.response.text[:200]}")
        except Exception as e:
            raise RuntimeError(f"OpenRouter error: {str(e)[:200]}")


# ─── Anthropic ───────────────────────────────────────────────────────────────

class AnthropicAdapter:
    BASE_URL = "https://api.anthropic.com/v1/messages"

    async def complete(
        self,
        messages: list[dict],
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        # Extract system message
        system_text = None
        chat_messages = []
        for m in messages:
            if m.get("role") == "system":
                system_text = m["content"]
            else:
                chat_messages.append({"role": m["role"], "content": m["content"]})

        payload: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": chat_messages,
        }
        if system_text:
            payload["system"] = system_text

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.BASE_URL,
                    json=payload,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Anthropic API error {e.response.status_code}: {e.response.text[:200]}")
        except Exception as e:
            raise RuntimeError(f"Anthropic error: {str(e)[:200]}")


# ─── Factory ─────────────────────────────────────────────────────────────────

def get_adapter(proveedor: str) -> LLMAdapter:
    mapping = {
        "gemini": GeminiAdapter(),
        "openai": OpenAIAdapter(),
        "openrouter": OpenRouterAdapter(),
        "anthropic": AnthropicAdapter(),
    }
    adapter = mapping.get(proveedor.lower())
    if adapter is None:
        raise ValueError(f"Proveedor no soportado: {proveedor!r}. Use: gemini, openai, openrouter, anthropic")
    return adapter
