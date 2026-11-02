"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  Bot,
  X,
  Send,
  RotateCcw,
  Loader2,
  AlertCircle,
  MessageCircle,
  Minus,
  Maximize2,
  User,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  sendChatMessage,
  resetChatSession,
  getAsistenteStatus,
  AsistenteStatus,
} from "@/lib/asistente-api";

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  ts: Date;
}

type ChatMode = "closed" | "minimized" | "expanded";

function formatTime(d: Date) {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola 👋 Soy el asistente del cementerio. Puedo ayudarte a consultar información sobre inhumaciones, arriendos vigentes, ubicaciones y procedimientos generales. ¿Qué deseas consultar hoy?",
  ts: new Date(),
};

export default function ChatPanel() {
  const [mode, setMode] = useState<ChatMode>("closed");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AsistenteStatus | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Read auth token from localStorage & track changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("cem_auth_token");
      setAuthToken(token);
      if (token) {
        getAsistenteStatus(token)
          .then((st) => setStatus(st))
          .catch(() => setStatus(null));
      } else {
        setStatus(null);
        setMode("closed");
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("cem_auth_change", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("cem_auth_change", checkAuth);
    };
  }, []);

  // Clear unread badge & focus input when expanded
  useEffect(() => {
    if (mode === "expanded") {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [mode]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (mode === "expanded") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mode]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ts: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const token = authToken || localStorage.getItem("cem_auth_token");
      if (!token) throw new Error("No autenticado — por favor inicia sesión.");

      const res = await sendChatMessage(token, text);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.reply,
        ts: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (mode !== "expanded") {
        setUnreadCount((c) => c + 1);
      }
    } catch (e: any) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "error",
        content: e.message || "Error al contactar al asistente de IA.",
        ts: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, mode, authToken]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = async () => {
    try {
      const token = authToken || localStorage.getItem("cem_auth_token");
      if (token) await resetChatSession(token);
    } catch (_) {}
    setMessages([{ ...WELCOME, id: crypto.randomUUID(), ts: new Date() }]);
  };

  // Only render for logged-in staff
  if (!authToken) return null;

  return (
    <>
      {/* ── 1. Floating Circular Launcher (when closed) ─────────────────── */}
      {mode === "closed" && (
        <button
          onClick={() => setMode("expanded")}
          aria-label="Abrir Asistente de IA"
          title="Asistente de IA (Funcionarios)"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group text-white border-2 border-white/20"
          style={{ background: "var(--color-primary)" }}
        >
          <Bot size={26} className="transition-transform group-hover:rotate-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-md animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── 2. Minimized Docked Bar (when minimized) ───────────────────── */}
      {mode === "minimized" && (
        <div
          onClick={() => setMode("expanded")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMode("expanded");
            }
          }}
          aria-label="Expandir asistente de IA"
          className="fixed bottom-6 right-6 z-50 w-72 sm:w-84 h-12 rounded-xl shadow-2xl flex items-center justify-between px-3.5 border transition-all duration-200 hover:brightness-105 cursor-pointer backdrop-blur-md"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-primary)",
            color: "var(--color-text)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: "var(--color-primary)" }}
            >
              <Bot size={15} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs truncate">
                Asistente del Cementerio
              </span>
              <span className="text-[10px] opacity-70 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {sending ? "Escribiendo..." : "Minimizado · Clic para expandir"}
              </span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Expand button */}
            <button
              onClick={() => setMode("expanded")}
              title="Maximizar / Expandir"
              aria-label="Maximizar ventana de chat"
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-text)" }}
            >
              <Maximize2 size={14} />
            </button>
            {/* Close button */}
            <button
              onClick={() => setMode("closed")}
              title="Cerrar chat"
              aria-label="Cerrar chat"
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: "var(--color-text)" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Expanded Full Chatbox (when expanded) ───────────────────── */}
      {mode === "expanded" && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
            onClick={() => setMode("minimized")}
          />

          <div
            className="fixed bottom-0 right-0 z-50 flex flex-col transition-all duration-300 ease-out w-full md:w-[420px] md:bottom-6 md:right-6 md:rounded-2xl md:h-[600px] h-[86vh] shadow-2xl border"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow:
                "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--color-border)",
            }}
            role="dialog"
            aria-label="Asistente de IA"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b rounded-t-2xl shrink-0 select-none"
              style={{
                background: "var(--color-primary)15",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                  style={{ background: "var(--color-primary)" }}
                >
                  <Bot size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-bold text-sm leading-tight truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      Asistente del Cementerio
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: "var(--color-primary)25",
                        color: "var(--color-primary)",
                      }}
                    >
                      IA
                    </span>
                  </div>
                  <span className="text-[11px] opacity-70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {status?.proveedor ? (
                      <span className="capitalize">
                        {status.proveedor} ({status.modelo || "activo"})
                      </span>
                    ) : (
                      <span>Consultas seguras Ley 21.719</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action buttons (Reset, Minimize, Close) */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Reset button */}
                <button
                  onClick={handleReset}
                  title="Nueva conversación (reiniciar historial)"
                  aria-label="Reiniciar conversación"
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-75 hover:opacity-100"
                  style={{ color: "var(--color-text)" }}
                >
                  <RotateCcw size={15} />
                </button>

                {/* MINIMIZE BUTTON */}
                <button
                  id="chatbox-minimize-button"
                  onClick={() => setMode("minimized")}
                  title="Minimizar ventana"
                  aria-label="Minimizar ventana de chat"
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-75 hover:opacity-100"
                  style={{ color: "var(--color-text)" }}
                >
                  <Minus size={16} />
                </button>

                {/* CLOSE BUTTON */}
                <button
                  id="chatbox-close-button"
                  onClick={() => setMode("closed")}
                  title="Cerrar asistente"
                  aria-label="Cerrar asistente"
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-75 hover:opacity-100"
                  style={{ color: "var(--color-text)" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Privacy notice banner */}
            <div
              className="px-3.5 py-1.5 text-[11px] flex items-center gap-1.5 border-b shrink-0 opacity-80"
              style={{
                background: "var(--color-primary)08",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              <ShieldCheck size={13} style={{ color: "var(--color-primary)" }} />
              <span>
                Datos minimizados: sin RUT ni causas de defunción.
              </span>
            </div>

            {/* Message Area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ scrollbarWidth: "thin" }}
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {sending && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Input Footer */}
            <div
              className="p-3 border-t shrink-0"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div
                className="flex items-end gap-2 rounded-xl border px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-[var(--color-primary)]"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu consulta… (Enter para enviar)"
                  rows={1}
                  className="flex-1 resize-none text-sm focus:outline-none bg-transparent leading-relaxed max-h-28 placeholder:opacity-50"
                  style={{ color: "var(--color-text)" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  aria-label="Enviar mensaje al asistente"
                  className="shrink-0 p-2 rounded-lg transition-all disabled:opacity-30 hover:opacity-90 active:scale-95 text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] mt-1.5 px-1 opacity-60">
                <span>Enter = enviar · Shift+Enter = salto</span>
                <span>San Carlos & Cachapoal</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end gap-2 items-end">
        <div className="max-w-[85%] flex flex-col items-end gap-1">
          <div
            className="px-3.5 py-2.5 rounded-2xl rounded-br-xs text-sm leading-relaxed text-white shadow-xs"
            style={{ background: "var(--color-primary)" }}
          >
            {msg.content}
          </div>
          <span
            className="text-[10px] opacity-60"
            style={{ color: "var(--color-text)" }}
          >
            {formatTime(msg.ts)}
          </span>
        </div>
        <div
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mb-5 shadow-xs"
          style={{ background: "var(--color-secondary, #475569)" }}
        >
          <User size={13} />
        </div>
      </div>
    );
  }

  if (msg.role === "error") {
    return (
      <div className="flex justify-start gap-2 items-end">
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mb-5 bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertCircle size={14} />
        </div>
        <div className="max-w-[85%] flex flex-col gap-1">
          <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-sm leading-relaxed bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200 border border-red-200 dark:border-red-900 shadow-xs">
            <AlertCircle size={14} className="inline mr-1.5 -mt-0.5" />
            {msg.content}
          </div>
          <span
            className="text-[10px] opacity-60"
            style={{ color: "var(--color-text)" }}
          >
            {formatTime(msg.ts)}
          </span>
        </div>
      </div>
    );
  }

  // Assistant bubble
  return (
    <div className="flex justify-start gap-2 items-end">
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mb-5 shadow-xs"
        style={{
          background: "var(--color-primary)20",
          color: "var(--color-primary)",
        }}
      >
        <Bot size={15} />
      </div>
      <div className="max-w-[85%] flex flex-col gap-1">
        <div
          className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-sm leading-relaxed border shadow-xs"
          style={{
            background: "var(--color-primary)08",
            borderColor: "var(--color-primary)20",
            color: "var(--color-text)",
          }}
        >
          <AssistantContent content={msg.content} />
        </div>
        <span
          className="text-[10px] opacity-60"
          style={{ color: "var(--color-text)" }}
        >
          {formatTime(msg.ts)}
        </span>
      </div>
    </div>
  );
}

// ── Render assistant content (basic markdown formatting) ────────────────────
function AssistantContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Bullet points
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.replace(/^[•\-\*]\s+/, "");
          return (
            <div key={i} className="flex items-start gap-1.5 ml-1">
              <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--color-primary)] opacity-70" />
              <span className="flex-1">{formatInline(text)}</span>
            </div>
          );
        }

        // Section header
        if (trimmed.startsWith("### ")) {
          return (
            <p key={i} className="font-bold text-xs uppercase tracking-wider opacity-80 mt-2">
              {trimmed.replace(/^###\s+/, "")}
            </p>
          );
        }

        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatInline(str: string): React.ReactNode {
  // Simple regex parser for **bold** text
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mb-1"
        style={{
          background: "var(--color-primary)20",
          color: "var(--color-primary)",
        }}
      >
        <Bot size={15} />
      </div>
      <div
        className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs border"
        style={{
          background: "var(--color-primary)08",
          borderColor: "var(--color-primary)20",
        }}
      >
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: "var(--color-primary)",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
