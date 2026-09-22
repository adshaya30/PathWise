import { useState, useEffect, useRef, type FC, type FormEvent } from 'react';
import {
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import { AiSparkleIcon } from '../../components/common/AiSparkleIcon';
import { ChatMessageContent } from '../../components/chat/ChatMessageContent';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';
import { chatApiService, type ChatMessageData } from '../../services/chat/chatApiService';

const OL_STARTER_PROMPTS = [
  'What A/L subjects do I need to study Software Engineering at Moratuwa?',
  'What is the difference between Physical Science and Technology stream?',
  'Can I do Medicine if I choose Chemistry, Biology, and Agriculture?',
  'What are the best career paths after Commerce stream?',
];

export const AfterOlAiPage: FC = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [followUps, setFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize session and fetch history
  useEffect(() => {
    let currentSession = localStorage.getItem('pathwise_ol_chat_session_id');
    if (!currentSession) {
      currentSession = 'ol_session_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('pathwise_ol_chat_session_id', currentSession);
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
        stream: 'After O/L Pathways',
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
          localStorage.setItem('pathwise_ol_chat_session_id', streamSessionId);
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

        if (completeData.suggestedFollowUps && completeData.suggestedFollowUps.length > 0) {
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
            stream: 'After O/L Pathways',
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
                  content: 'Sorry, I encountered an issue connecting to the pathways advisor service. Please try again shortly.',
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
    const newSession = 'ol_session_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('pathwise_ol_chat_session_id', newSession);
    setSessionId(newSession);
    setMessages([]);
    setFollowUps([]);
  };

  return (
    <AfterOlLayout
      title="PathWise AI"
      subtitle="Ask questions about Sri Lankan A/L streams, 3-subject combinations, and university requirements."
      showAiChat={false}
    >
      <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col h-[calc(100vh-125px)] max-h-[780px] min-h-[540px] overflow-hidden">
        {/* Chat Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">Live After O/L Pathways Advisor</span>
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
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0D645B] flex items-center justify-center mx-auto border border-teal-100 shadow-2xs">
                <AiSparkleIcon className="w-8 h-8 text-[#0D645B]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-heading">How can PathWise AI guide your A/L choices today?</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Ask any question about stream eligibility, 3-subject combinations for specific degrees, or career pathways.
                </p>
              </div>

              {/* Starter Question Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
                {OL_STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="p-4 bg-white border border-slate-200/90 hover:border-[#0D645B]/40 hover:bg-teal-50/40 rounded-2xl text-xs text-slate-700 font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-md leading-relaxed group"
                  >
                    <span className="group-hover:text-[#0D645B] transition-colors">{prompt}</span>
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
                <div className="max-w-[80%] bg-[#0D645B] text-white px-5 py-3 rounded-2xl rounded-br-xs shadow-xs text-sm font-medium leading-relaxed">
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
              <Loader2 className="w-4 h-4 animate-spin text-[#0D645B]" />
              <span className="text-xs font-medium">Analyzing A/L subject criteria & pathways...</span>
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
                    className="px-3 py-2 bg-white border border-teal-200 text-teal-800 font-semibold text-xs rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
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
            placeholder="Ask anything about A/L subject combinations, streams, or degree paths..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D645B]/20 focus:border-[#0D645B] transition-all"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="px-5 py-3 bg-gradient-to-r from-[#0D645B] to-[#0A4E46] text-white rounded-2xl font-bold text-sm hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm flex items-center gap-2 flex-shrink-0"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AfterOlLayout>
  );
};
