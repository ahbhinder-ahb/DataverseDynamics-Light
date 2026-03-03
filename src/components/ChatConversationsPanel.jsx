import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { MessageCircle, Loader2, RefreshCcw, Download, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ChatConversationsPanel = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  const fetchConversations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chatbot_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();

        if (dateFilter === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          startDate.setMonth(now.getMonth() - 1);
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setConversations(data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [dateFilter]);

  const toggleSession = (sessionId) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const groupedConversations = conversations.reduce((acc, conv) => {
    if (!acc[conv.session_id]) {
      acc[conv.session_id] = [];
    }
    acc[conv.session_id].push(conv);
    return acc;
  }, {});

  const filteredSessions = Object.entries(groupedConversations).filter(
    ([sessionId, messages]) => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return messages.some(
        (msg) =>
          msg.user_message.toLowerCase().includes(lowerSearch) ||
          msg.bot_reply.toLowerCase().includes(lowerSearch)
      );
    }
  );

  const exportToCSV = () => {
    const rows = [['Session ID', 'Timestamp', 'User Message', 'Bot Reply']];
    conversations.forEach((conv) => {
      rows.push([
        conv.session_id,
        new Date(conv.created_at).toLocaleString(),
        conv.user_message,
        conv.bot_reply
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-conversations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-slate-900">Chatbot Conversations</h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchConversations}
            disabled={loading}
            variant="outline"
            className="border-blue-300 text-slate-700 hover:bg-blue-50"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={conversations.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm text-slate-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user messages or bot replies..."
                className="w-full rounded-lg border border-blue-300 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-700">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Found {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} (
          {conversations.length} total messages)
        </div>
      </div>

      {/* Conversations List */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-slate-700">Loading conversations...</span>
        </div>
      )}

      {!loading && filteredSessions.length === 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-8 text-center">
          <MessageCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <p className="text-slate-600">No conversations found</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredSessions.map(([sessionId, messages]) => {
          const isExpanded = expandedSessions.has(sessionId);
          const firstMessage = messages[0];
          const messageCount = messages.length;
          const lastUpdate = new Date(firstMessage.created_at);

          return (
            <div key={sessionId} className="overflow-hidden rounded-lg border border-blue-200 bg-white">
              {/* Session Header */}
              <button
                onClick={() => toggleSession(sessionId)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-slate-600 truncate">Session: {sessionId}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {messageCount} message{messageCount !== 1 ? 's' : ''} •{' '}
                    {lastUpdate.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                    "{messages[0].user_message}"
                  </p>
                </div>
                <ChevronDown
                  className={`ml-2 h-5 w-5 text-slate-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {/* Session Details */}
              {isExpanded && (
                <div className="border-t border-blue-200 bg-blue-50 px-4 py-4">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="inline-block rounded bg-blue-200 px-2 py-1 text-xs font-semibold text-blue-800">
                            {msg.user_message ? 'User' : 'Bot'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {msg.user_message && (
                          <p className="text-slate-800">{msg.user_message}</p>
                        )}
                        {msg.bot_reply && (
                          <p className="italic text-slate-700">{msg.bot_reply}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatConversationsPanel;
