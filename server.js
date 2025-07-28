const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Store chat sessions in memory (use Redis or database for production)
const chatSessions = new Map();

// Middleware
app.use(cors({
  origin: ['https://hustlesynth.space', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Initialize or get chat session
function getOrCreateSession(sessionId) {
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, {
      messages: [],
      createdAt: new Date(),
      lastActive: new Date()
    });
  }
  return chatSessions.get(sessionId);
}

// Clean up old sessions (older than 24 hours)
function cleanupSessions() {
  const now = new Date();
  for (const [sessionId, session] of chatSessions.entries()) {
    const timeDiff = now - session.lastActive;
    if (timeDiff > 24 * 60 * 60 * 1000) { // 24 hours
      chatSessions.delete(sessionId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000);

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session ID
    let sessionId = req.cookies.chat_session_id;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('chat_session_id', sessionId, {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }

    // Get session data
    const session = getOrCreateSession(sessionId);
    session.lastActive = new Date();

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Prepare messages for OpenRouter (keep last 20 messages for context)
    const contextMessages = session.messages.slice(-20).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system message for context
    const systemMessage = {
      role: 'system',
      content: 'You are HustleSynth AI, an AI assistant that helps users with productivity and business growth. Be helpful, engaging, and professional.'
    };

    const requestBody = {
      model: 'deepseek-chat-v3-0324:free', // You can change this model
      messages: [systemMessage, ...contextMessages],
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    };

    // Make request to OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hustlesynth.space',
        'X-Title': 'HustleSynth AI'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add AI response to history
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    res.json({
      response: aiResponse,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history
app.get('/api/chat/history', (req, res) => {
  const sessionId = req.cookies.chat_session_id;
  
  if (!sessionId || !chatSessions.has(sessionId)) {
    return res.json({ messages: [] });
  }

  const session = chatSessions.get(sessionId);
  res.json({ messages: session.messages });
});

// Clear chat history
app.delete('/api/chat/history', (req, res) => {
  const sessionId = req.cookies.chat_session_id;
  
  if (sessionId && chatSessions.has(sessionId)) {
    chatSessions.delete(sessionId);
  }
  
  res.clearCookie('chat_session_id');
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Make sure to set OPENROUTER_API_KEY environment variable');
});