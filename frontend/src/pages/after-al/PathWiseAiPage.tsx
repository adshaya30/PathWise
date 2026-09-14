import { useState, useEffect, useRef, type FC, type FormEvent } from 'react';
import {
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import { AiSparkleIcon } from '../../components/common/AiSparkleIcon';
import { ChatMessageContent } from '../../components/chat/ChatMessageContent';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { chatApiService, type ChatMessageData } from '../../services/chat/chatApiService';
import { afterAlApiService, type AlResultResponse } from '../../services/after-al/afterAlApiService';

const STARTER_PROMPTS = [
  'What universities offer Computer Science and Software Engineering in Sri Lanka?',
  'Based on my Z-score and district, what physical science degrees am I eligible for?',
  'Which courses at University of Moratuwa require an Aptitude Test?',
  'What are the alternative computing degrees if I miss Engineering cutoff?',
];

export const PathWiseAiPage: FC = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [studentResult, setStudentResult] = useState<AlResultResponse | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize session and fetch profile
  useEffect(() => {
    let currentSession = localStorage.getItem('pathwise_chat_session_id');
    if (!currentSession) {
      currentSession = 'session_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('pathwise_chat_session_id', currentSession);
    }
    setSessionId(currentSession);

    // Fetch user profile
    afterAlApiService.getLatestResults()
      .then((res) => {
        if (res) setStudentResult(res);
      })
      .catch(() => {});

    // Fetch history
    chatApiService.getSessionHistory(currentSession)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
        district: studentResult?.district,
        stream: studentResult?.stream,
        zScore: studentResult?.zScore ? Number(studentResult.zScore) : undefined,
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
          .sendMessage({
            message: textToSend,
            sessionId,
            district: studentResult?.district,
            stream: studentResult?.stream,
            zScore: studentResult?.zScore ? Number(studentResult.zScore) : undefined,
          })
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
    <AfterAlLayout title="PathWise AI" showAiChat={false}>
      <div className="w-full max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-125px)] max-h-[780px] min-h-[540px] overflow-hidden">
        {/* Chat Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">Live UGC Knowledge Assistant</span>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Session</span>
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30 text-sm">
          {messages.length === 0 && (
            <div className="text-center py-10 px-4 max-w-3xl mx-auto space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
                <AiSparkleIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">How can PathWise AI assist you today?</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Ask any question about cutoff scores, degree options, university quotas, or aptitude test preparation.
                </p>
              </div>

              {/* Starter Question Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="p-3 bg-white border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-xs text-slate-700 font-medium transition-all cursor-pointer shadow-2xs leading-snug"
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
                <div className="max-w-[80%] bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-br-xs shadow-xs text-sm font-medium leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[92%] bg-white border border-slate-200/90 text-slate-800 p-5 rounded-3xl rounded-bl-xs shadow-xs space-y-3 leading-relaxed">
                  <ChatMessageContent content={msg.content} className="text-sm text-slate-700 font-normal" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 p-3.5 rounded-2xl w-fit shadow-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Checking UGC cutoff records & analyzing...</span>
            </div>
          )}

          {/* Suggested Follow-up chips */}
          {followUps.length > 0 && !loading && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Suggested Follow-ups:</p>
              <div className="flex flex-wrap gap-2">
                {followUps.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="px-3 py-2 bg-white border border-blue-200 text-blue-700 font-semibold text-xs rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Area */}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-white border-t border-slate-200 flex items-center gap-3"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask anything about courses, minimum Z-scores, or prerequisites..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm flex items-center gap-2 flex-shrink-0"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AfterAlLayout>
  );
};

