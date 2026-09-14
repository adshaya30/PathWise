import { useState, useEffect, useRef, type FC, type FormEvent } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import { ChatMessageContent } from './ChatMessageContent';
import { chatApiService, type ChatMessageData } from '../../services/chat/chatApiService';

const STARTER_PROMPTS = [
  'What universities offer Computer Science?',
  'Can I enter Moratuwa IT with 1.65 Z-Score in Colombo?',
  'Which degrees require a UGC Aptitude Test?',
  'What are the best degrees for Physical Science stream?',
];

export const FloatingChatWidget: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [followUps, setFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize or load session ID
  useEffect(() => {
    let currentSession = localStorage.getItem('pathwise_chat_session_id');
    if (!currentSession) {
      currentSession = 'session_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('pathwise_chat_session_id', currentSession);
    }
    setSessionId(currentSession);

    // Fetch history
    chatApiService
      .getSessionHistory(currentSession)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || inputMessage).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessageData = {
      sender: 'USER',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    const aiPlaceholder: ChatMessageData = {
      sender: 'AI',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    setInputMessage('');
    setLoading(true);
    setFollowUps([]);

    await chatApiService.streamMessage(
      {
        message: textToSend,
        sessionId,
      },
      (delta, streamSessionId) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].sender === 'AI') {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + delta,
            };
          }
          return updated;
        });

        if (streamSessionId) {
          setSessionId(streamSessionId);
          localStorage.setItem('pathwise_chat_session_id', streamSessionId);
        }
      },
      (completeData) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].sender === 'AI') {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: completeData.reply || updated[lastIndex].content,
              statusBadge: completeData.statusBadge,
            };
          }
          return updated;
        });

        if (completeData.suggestedFollowUps) {
          setFollowUps(completeData.suggestedFollowUps);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Streaming error, falling back to standard message:', err);
        chatApiService
          .sendMessage({ message: textToSend, sessionId })
          .then((response) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].sender === 'AI') {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: response.reply,
                  statusBadge: response.statusBadge,
                };
              }
              return updated;
            });
            if (response.suggestedFollowUps) {
              setFollowUps(response.suggestedFollowUps);
            }
          })
          .catch(() => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].sender === 'AI') {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: 'Sorry, I encountered an issue connecting to the admissions service. Please try again shortly.',
                };
              }
              return updated;
            });
          })
          .finally(() => {
            setLoading(false);
          });
      }
    );
  };

  const handleClearHistory = async () => {
    if (sessionId) {
      await chatApiService.clearSession(sessionId).catch(() => {});
    }
    const newSession = 'session_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('pathwise_chat_session_id', newSession);
    setSessionId(newSession);
    setMessages([]);
    setFollowUps([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/35 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Chat with PathWise AI"
        >
          <MessageCircle className="w-7 h-7 text-white stroke-[2.2]" />
        </button>
      )}

      {/* Chat Popup Box */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <MessageCircle className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">PathWise AI Advisor</h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60 text-xs">
            {messages.length === 0 && (
              <div className="text-center py-6 px-2 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">How can I help you today?</h4>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Ask any question about Sri Lankan state university courses, minimum Z-scores, stream eligibility, or aptitude tests.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Suggested Questions:
                  </p>
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="w-full text-left p-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-xs text-slate-700 font-medium transition-all cursor-pointer shadow-2xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
              >
                {msg.sender === 'USER' ? (
                  <div className="max-w-[82%] bg-blue-600 text-white p-3 rounded-2xl rounded-br-xs shadow-xs text-xs font-medium leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] bg-white border border-slate-200/90 text-slate-800 p-3.5 rounded-2xl rounded-bl-xs shadow-xs space-y-2 leading-relaxed">
                    <ChatMessageContent content={msg.content} className="text-xs" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-2xl w-fit shadow-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Checking UGC cutoff records & analyzing...</span>
              </div>
            )}

            {/* Suggested Follow-up Chips */}
            {followUps.length > 0 && !loading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Follow-up Questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {followUps.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 text-blue-700 font-semibold text-[11px] rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about degrees, cutoffs, eligibility..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
