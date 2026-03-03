import React, { useMemo, useRef, useState, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { getBotReply, containsOffensiveLanguage, getWarningForOffensiveLanguage, shouldSearchInternet } from '@/chatbot/chatEngine';
import { supabase } from '@/lib/customSupabaseClient';

const starterPrompts = [
  'What services do you provide?',
  'Do you offer SEO services?',
  'Which industries do you serve?',
  'How do I schedule a consultation?'
];

const getOrCreateSessionId = () => {
  const key = 'chatbot_session_id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'Hi! I am the Dataverse assistant. I can help with services, company info, and consultation booking.'
    }
  ]);
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [streamingId, setStreamingId] = useState(null);

  const messageEndRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  useEffect(() => {
    if (isOpen && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (textOverride) => {
    const raw = typeof textOverride === 'string' ? textOverride : input;
    const text = raw.trim();

    if (!text || isSaving || isLoading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text
    };

    // Create updated messages array with the new user message (for context passing to bot)
    const updatedMessages = [...messages, userMessage];

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setDisplayedText('');

    // Simulate thinking delay (800ms to 1200ms for natural feel)
    const thinkingDelay = 800 + Math.random() * 400;
    await new Promise((resolve) => setTimeout(resolve, thinkingDelay));

    // Check for offensive language
    if (containsOffensiveLanguage(text)) {
      // Count warnings in this conversation
      const warningCount = updatedMessages.filter(msg =>
        msg.role === 'bot' &&
        (msg.text.includes('respectful') || msg.text.includes('professional') || msg.text.includes('colorful language'))
      ).length;

      const warningMessageText = getWarningForOffensiveLanguage(text, updatedMessages, warningCount);
      const botMessageId = Date.now() + 1;
      setStreamingId(botMessageId);

      // Add bot message with empty text, then stream the warning
      setMessages((prev) => [...prev, {
        id: botMessageId,
        role: 'bot',
        text: ''
      }]);

      // Stream the warning response character by character
      let charIndex = 0;
      const streamInterval = setInterval(() => {
        if (charIndex < warningMessageText.length) {
          charIndex++;
          setDisplayedText(warningMessageText.substring(0, charIndex));
        } else {
          clearInterval(streamInterval);
          // Update the actual message with full text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, text: warningMessageText } : msg
            )
          );
          setDisplayedText('');
          setStreamingId(null);
          setIsLoading(false);
        }
      }, 15); // 15ms between characters = natural reading speed
      return;
    }

    // Pass updated conversation history to getBotReply for context-aware responses
    const botReplyText = getBotReply(text, updatedMessages);

    // Only search internet if the response is a generic/default response (meaning bot doesn't know)
    const isGenericResponse = botReplyText.includes("might not have all the details") ||
      botReplyText.includes("might not have that exact detail") ||
      botReplyText.includes("not all details are in my system") ||
      botReplyText.includes("While my knowledge base might not") ||
      botReplyText.includes("beyond my knowledge base");

    let finalBotResponse = botReplyText;

    // Internet search functionality has been disabled
    // Previously used Tavily Search API for generic responses

    const botMessageId = Date.now() + 1;

    setStreamingId(botMessageId);

    // Add bot message with empty text, then stream it
    setMessages((prev) => [...prev, {
      id: botMessageId,
      role: 'bot',
      text: ''
    }]);

    // Stream the response character by character
    let charIndex = 0;
    const streamInterval = setInterval(() => {
      if (charIndex < finalBotResponse.length) {
        charIndex++;
        setDisplayedText(finalBotResponse.substring(0, charIndex));
      } else {
        clearInterval(streamInterval);
        // Update the actual message with full text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: finalBotResponse } : msg
          )
        );
        setDisplayedText('');
        setStreamingId(null);
        setIsLoading(false);

        // Save to Supabase in the background
        try {
          supabase.from('chatbot_conversations').insert({
            session_id: sessionId,
            user_message: text,
            bot_reply: finalBotResponse
          }).catch(err => console.error('Failed to save chat:', err));
        } catch (error) {
          console.error('Failed to save chat to Supabase:', error);
        }
      }
    }, 15); // 15ms between characters = ~67 chars/sec = natural reading speed
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className={`fixed bottom-5 right-5 z-50 rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center ${isOpen ? 'h-14 w-14' : 'h-14 px-4 gap-2'
          }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Ask me</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[34rem] w-[22rem] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-semibold text-slate-900">Dataverse Assistant</p>
            </div>
            <span className="text-xs text-green-600">Online 24/7</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white p-3">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isStreaming = streamingId === message.id;
              const displayText = isStreaming ? displayedText : message.text;
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${isUser
                        ? 'bg-blue-600 text-white'
                        : 'border border-blue-300 bg-blue-50 text-slate-900'
                      }`}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[11px] opacity-80">
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      <span>{isUser ? 'You' : 'Assistant'}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{displayText}{isStreaming && <span className="animate-pulse">▌</span>}</p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="border border-blue-300 bg-blue-50 rounded-2xl px-3 py-2">
                  <div className="mb-1 flex items-center gap-1 text-[11px] opacity-80">
                    <Bot className="h-3.5 w-3.5" />
                    <span>Assistant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 1 && !isLoading && (
              <div className="space-y-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-blue-500 hover:bg-blue-50\"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t border-blue-200 bg-blue-50/60 p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    sendMessage();
                  }
                }}
                placeholder="Ask about services, company, or consultation..."
                className="h-10 w-full rounded-lg border border-blue-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!canSend || isLoading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;