-- Create chatbot_conversations table to store chat history
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on session_id for faster queries
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id 
ON public.chatbot_conversations(session_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at 
ON public.chatbot_conversations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admin) to view all conversations
CREATE POLICY "Allow authenticated users to read chatbot conversations"
ON public.chatbot_conversations
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert new conversations
CREATE POLICY "Allow authenticated users to insert chatbot conversations"
ON public.chatbot_conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update conversations
CREATE POLICY "Allow authenticated users to update chatbot conversations"
ON public.chatbot_conversations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
