'use client';

import type { ChatResponse, Citation } from '@copiloto/shared';
import { signOut } from 'next-auth/react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  apiToken: string;
  userId: string;
  role: string;
};

type ConversationSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  role: string;
};

type StoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const fetchJson = async <T,>(path: string, token: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return (await response.json()) as T;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ChatClient = ({ apiToken, userId, role }: Props) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  const loadConversations = async () => {
    const data = await fetchJson<{ conversations: ConversationSummary[] }>('/conversations', apiToken);
    setConversations(data.conversations);
    if (!conversationId && data.conversations[0]) {
      setConversationId(data.conversations[0].id);
    }
  };

  const loadMessages = async (id: string) => {
    const data = await fetchJson<{
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        citations: Citation[];
        createdAt: string;
      }>;
    }>(`/conversations/${id}/messages`, apiToken);

    setMessages(
      data.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        citations: (message.citations ?? []) as Citation[],
        createdAt: message.createdAt,
      })),
    );
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      void loadMessages(conversationId);
    }
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || loading) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const temporaryUserMessage: StoredMessage = {
        id: `tmp-${Date.now()}`,
        role: 'user',
        content: input.trim(),
        citations: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, temporaryUserMessage]);
      const userInput = input;
      setInput('');

      const response = await fetchJson<ChatResponse>('/chat', apiToken, {
        method: 'POST',
        body: JSON.stringify({
          message: userInput,
          conversationId,
        }),
      });

      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev.filter((item) => !item.id.startsWith('tmp-') || item.content !== temporaryUserMessage.content),
        temporaryUserMessage,
        {
          id: response.messageId,
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          createdAt: new Date().toISOString(),
        },
      ]);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (messageId: string, rating: 'up' | 'down') => {
    if (!conversationId) {
      return;
    }
    setSendingMessageId(messageId);
    try {
      await fetchJson('/feedback', apiToken, {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          messageId,
          rating,
        }),
      });
    } finally {
      setSendingMessageId(null);
    }
  };

  return (
    <main className="shell">
      <div className="card" style={bannerStyle}>
        <strong>Modo piloto:</strong> Solo lectura, sin PII, con citaciones y trazabilidad.
      </div>

      <div style={topBar}>
        <div>
          <strong>{userId}</strong> <span style={{ color: 'var(--ink-soft)' }}>({role})</span>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={ghostButton}>
          Salir
        </button>
      </div>

      <div className="chat-layout" style={layoutStyle}>
        <aside className="card chat-sidebar" style={sidebarStyle}>
          <h3 style={{ marginTop: 0 }}>Historial</h3>
          {conversations.length === 0 && (
            <p style={{ color: 'var(--ink-soft)' }}>Aún no hay conversaciones guardadas.</p>
          )}
          {conversations.map((item) => (
            <button
              key={item.id}
              onClick={() => setConversationId(item.id)}
              style={{
                ...sidebarButton,
                borderColor: conversationId === item.id ? 'var(--accent)' : 'var(--border)',
                background: conversationId === item.id ? 'rgba(31, 122, 140, 0.1)' : 'transparent',
              }}
            >
              <span className="mono">{item.id.slice(0, 8)}</span>
              <small style={{ color: 'var(--ink-soft)' }}>
                {new Date(item.updatedAt).toLocaleString('es-AR')}
              </small>
            </button>
          ))}
        </aside>

        <section className="card chat-panel" style={chatPanelStyle}>
          <div style={messagesContainerStyle}>
            {orderedMessages.length === 0 && (
              <p style={{ color: 'var(--ink-soft)' }}>
                Hacé una pregunta de SOP/política o estado de pedido/factura/cliente.
              </p>
            )}
            {orderedMessages.map((message) => (
              <article key={message.id} style={message.role === 'assistant' ? assistantBubble : userBubble}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>

                {message.role === 'assistant' && (
                  <>
                    <div style={actionRow}>
                      <button
                        style={tinyButton}
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        type="button"
                      >
                        Copiar
                      </button>
                      <button
                        style={tinyButton}
                        onClick={() =>
                          downloadFile(
                            message.content,
                            `respuesta-${message.id}.md`,
                            'text/markdown;charset=utf-8',
                          )
                        }
                        type="button"
                      >
                        Descargar .md
                      </button>
                      <button
                        style={tinyButton}
                        onClick={() =>
                          downloadFile(message.content, `respuesta-${message.id}.txt`, 'text/plain;charset=utf-8')
                        }
                        type="button"
                      >
                        Descargar .txt
                      </button>
                      <button
                        style={tinyButton}
                        onClick={() => sendFeedback(message.id, 'up')}
                        disabled={sendingMessageId === message.id}
                        type="button"
                      >
                        👍
                      </button>
                      <button
                        style={tinyButton}
                        onClick={() => sendFeedback(message.id, 'down')}
                        disabled={sendingMessageId === message.id}
                        type="button"
                      >
                        👎
                      </button>
                    </div>

                    <div style={sourcesStyle}>
                      <strong>Fuentes</strong>
                      {message.citations.length === 0 ? (
                        <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)' }}>Sin citaciones.</p>
                      ) : (
                        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                          {message.citations.map((citation) => (
                            <li key={`${message.id}-${citation.id}`}>
                              <a href={citation.sourceUrl} target="_blank" rel="noreferrer">
                                {citation.title}
                              </a>
                              {citation.heading ? ` · ${citation.heading}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>

          {error && <p style={{ color: 'var(--warn)' }}>{error}</p>}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            style={composerStyle}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder='Ejemplo: "Cómo hago una nota de crédito?" o "Estado de ORD-1001"'
              style={textareaStyle}
            />
            <button disabled={loading || !input.trim()} type="submit" style={primaryButton}>
              {loading ? 'Consultando...' : 'Enviar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

const bannerStyle: CSSProperties = {
  padding: '12px 16px',
  marginBottom: 12,
  borderColor: 'rgba(183, 93, 42, 0.25)',
  background: 'rgba(255, 249, 244, 0.95)',
};

const topBar: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 14,
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '300px 1fr',
  gap: 14,
};

const sidebarStyle: CSSProperties = {
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: '78vh',
  overflowY: 'auto',
};

const sidebarButton: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 10,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'transparent',
  cursor: 'pointer',
};

const chatPanelStyle: CSSProperties = {
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '78vh',
};

const messagesContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flex: 1,
  overflowY: 'auto',
  paddingRight: 4,
};

const userBubble: CSSProperties = {
  alignSelf: 'flex-end',
  maxWidth: '82%',
  background: 'rgba(31, 122, 140, 0.12)',
  border: '1px solid rgba(31, 122, 140, 0.25)',
  borderRadius: 12,
  padding: 12,
};

const assistantBubble: CSSProperties = {
  alignSelf: 'flex-start',
  maxWidth: '90%',
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 12,
};

const actionRow: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 10,
};

const tinyButton: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'white',
  borderRadius: 8,
  padding: '5px 8px',
  cursor: 'pointer',
};

const sourcesStyle: CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: '1px dashed var(--border)',
  fontSize: 14,
};

const composerStyle: CSSProperties = {
  marginTop: 14,
  display: 'grid',
  gap: 10,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid var(--border)',
  padding: 12,
  resize: 'vertical',
};

const primaryButton: CSSProperties = {
  width: 140,
  background: 'var(--accent-strong)',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  padding: '10px 12px',
  cursor: 'pointer',
};

const ghostButton: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'white',
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
};
