import { authApiService } from '../authApiService';

export interface ChatMessageData {
  id?: string;
  sender: 'USER' | 'AI';
  content: string;
  statusBadge?: string | null;
  createdAt?: string;
}

export interface ChatRequestPayload {
  message: string;
  sessionId?: string;
  anonymousId?: string;
  district?: string;
  stream?: string;
  zScore?: number;
}

export interface ChatResponsePayload {
  sessionId: string;
  reply: string;
  statusBadge?: string | null;
  matchedDegrees?: string[];
  matchedUniversities?: string[];
  suggestedFollowUps?: string[];
  timestamp?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const getAnonymousId = (): string => {
  let anonId = localStorage.getItem('pathwise_anon_id');
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('pathwise_anon_id', anonId);
  }
  return anonId;
};

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Anonymous-Id': getAnonymousId(),
  };

  const token = authApiService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const chatApiService = {
  sendMessage: async (payload: ChatRequestPayload): Promise<ChatResponsePayload> => {
    const anonymousId = getAnonymousId();
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...payload,
        anonymousId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.statusText}`);
    }

    return response.json();
  },

  streamMessage: async (
    payload: ChatRequestPayload,
    onChunk: (delta: string, sessionId?: string) => void,
    onComplete: (completeData: ChatResponsePayload) => void,
    onError: (err: Error) => void
  ): Promise<void> => {
    try {
      const anonymousId = getAnonymousId();
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...payload,
          anonymousId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat stream error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.delta) {
                  onChunk(parsed.delta, parsed.sessionId);
                }
                if (parsed.reply !== undefined) {
                  onComplete(parsed);
                }
              } catch {
                // Ignore partial chunk parse error
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  },

  getSessionHistory: async (sessionId: string): Promise<ChatMessageData[]> => {
    const response = await fetch(`${API_BASE_URL}/chat/history/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Chat history error: ${response.statusText}`);
    }

    return response.json();
  },

  clearSession: async (sessionId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/chat/session/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Chat delete session error: ${response.statusText}`);
    }
  },
};
