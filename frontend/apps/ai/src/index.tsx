import React, { useEffect, useRef, useState } from 'react';
import { api, classNames, formatDate, uid, type AiStatus, type ChatMessage } from '@ace/shared';

/**
 * A.C.E AI Tutor - conversational study helper. The backend tries Ollama
 * first; if it isn't reachable we still answer from a study-aware stub.
 *
 * When Ollama is missing AND the install script is present on the host,
 * the header renders a "Set up Ollama" button that POSTs to
 * `/api/ai/install` and starts polling `/api/ai/status` every few
 * seconds until `running === true`.
 */
const AiApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remote, setRemote] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Lightweight /status probe on mount. Cheap (one HTTP GET) and tells
  // us up-front whether the install CTA should appear.
  useEffect(() => {
    let cancelled = false;
    void api.getAiStatus()
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Background poll while we're not yet running and not currently mid-
  // install. We back off when `installing` is true so we don't dogpile
  // the backend's installState flag.
  useEffect(() => {
    if (!status || status.running || status.installing) return;
    const t = setInterval(() => {
      void api.getAiStatus().then(setStatus).catch(() => undefined);
    }, 4_000);
    return () => clearInterval(t);
  }, [status]);

  async function refresh() {
    try {
      const m = await api.listMessages();
      // Prefer the canonical backend list, but preserve any optimistic
      // placeholder whose backend id hasn't arrived yet. Without this
      // guard a `listMessages` failure (or a partial send success where
      // the user message is still queued) wipes the user's in-flight text.
      setMessages((prev) => {
        const backendIds = new Set(m.map((x) => x.id));
        const pending = prev.filter((p) => p.id.startsWith('pending_') && !backendIds.has(p.id));
        return [...m, ...pending];
      });
    } catch (e) { setError(String((e as Error).message)); }
  }

  async function send() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setSending(true);
    setError(null);

    // Prefix the optimistic id with `pending_` so the dedupe in
    // `refresh()` can distinguish it from any (extremely unlikely)
    // backend message that happens to start with `msg_`.
    const optimistic: ChatMessage = {
      id: uid('pending'), role: 'user', content: text, ts: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);

    try {
      const resp = await api.sendMessage(text);
      setRemote(Boolean((resp as { remote?: boolean }).remote));
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setSending(false);
    }
  }

  async function reset() {
    await api.resetChat();
    setMessages([]);
  }

  async function startOllamaInstall() {
    try {
      await api.installOllama();
      // Reflect the install kick-off immediately so the CTA morphs
      // into the "Installing…" status without waiting for the next poll.
      setStatus((s) => s ? { ...s, installing: true } : s);
    } catch (e) {
      setError(String((e as Error).message));
    }
  }

  const showInstall =
    status !== null &&
    status.installable &&
    !status.running &&
    !status.installing &&
    remote === false;

  let statusText: string;
  if (remote === false) statusText = 'Using offline fallback (no Ollama)';
  else if (remote === true) statusText = 'Connected to Ollama';
  else statusText = 'Connecting\u2026';

  if (status?.installing) {
    statusText = 'Installing Ollama\u2026';
  } else if (showInstall === false && status?.lastInstallOk === false && status?.lastInstallAt) {
    // Surface a past install failure on the next mount so the user
    // knows to retry.
    statusText = 'Last install attempt did not bring Ollama up. Try again from the button.';
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-5 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-none">
        <div>
          <h1 className="text-xl font-semibold">AI Tutor</h1>
          <p className="text-xs text-ace-muted">{statusText}</p>
        </div>
        <div className="flex items-center gap-2">
          {showInstall && (
            <button
              type="button"
              className="ace-btn-primary"
              onClick={startOllamaInstall}
              data-testid="install-ollama"
            >
              Set up Ollama
            </button>
          )}
          <button className="ace-btn" onClick={reset}>Reset chat</button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 && (
          <div className="ace-card text-sm text-ace-muted">
            Hi! Ask me anything about your study topics. Try one of:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>“Give me a quiz on algebra.”</li>
              <li>“Help me plan revision for the chemistry exam.”</li>
              <li>“Explain how to solve a quadratic equation.”</li>
            </ul>
          </div>
        )}
        {messages.map((m) => <Bubble key={m.id} message={m} />)}
        {sending && <TypingBubble />}
        {error && <div className="text-xs text-red-300">{error}</div>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(); }}
        className="border-t border-white/10 p-3 flex gap-2 flex-none"
      >
        <input
          className="ace-input"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button className="ace-btn-primary" type="submit" disabled={sending || !input.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
};

const Bubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const user = message.role === 'user';
  return (
    <div className={classNames('flex', user ? 'justify-end' : 'justify-start')}>
      <div
        className={classNames(
          'max-w-[80%] rounded-2xl px-3 py-2 border',
          user ? 'bg-ace-accent/20 border-ace-accent/40' : 'bg-white/5 border-white/10',
        )}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className="text-[10px] text-ace-muted mt-1 flex items-center gap-2">
          <span>{formatDate(message.ts)}</span>
          {message.model && <span className="ace-pill text-[9px]\">{message.model}</span>}
        </div>
      </div>
    </div>
  );
};

const TypingBubble: React.FC = () => (
  <div className="flex justify-start">
    <div className="rounded-2xl px-3 py-2 bg-white/5 border border-white/10">
      <div className="flex gap-1">
        {[0,1,2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

export default AiApp;
