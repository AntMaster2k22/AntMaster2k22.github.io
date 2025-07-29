const express = require('express');
const cors = require('cors');
const path = require('path'); // Added for static file serving
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for chat sessions
const chatSessions = new Map();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files from root directory

// Generate simple session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get or create session
function getSession(sessionId) {
  if (!sessionId || !chatSessions.has(sessionId)) {
    const newSessionId = generateSessionId();
    chatSessions.set(newSessionId, {
      messages: [],
      created: new Date()
    });
    return { sessionId: newSessionId, session: chatSessions.get(newSessionId) };
  }
  return { sessionId, session: chatSessions.get(sessionId) };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'HustleSynth AI Backend is running!'
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId: clientSessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    const { sessionId, session } = getSession(clientSessionId);

    // Add user message
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Prepare messages for OpenRouter
    const messages = [
      {
        role: 'system',
        content: 'You are HustleSynth AI, a helpful AI assistant focused on productivity and business growth. Be engaging, helpful, and professional.'
      },
      ...session.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hustlesynth.space',
        'X-Title': 'HustleSynth AI'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add AI response to session
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
    res.status(500).json({ 
      error: 'Sorry, I encountered an error. Please try again.',
      details: error.message 
    });
  }
});

// Get chat history
app.get('/api/chat/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = chatSessions.get(sessionId);
  
  if (!session) {
    return res.json({ messages: [] });
  }
  
  res.json({ messages: session.messages });
});

// Clear chat
app.delete('/api/chat/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  chatSessions.delete(sessionId);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HustleSynth AI Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'Set ✅' : 'Missing ❌'}`);
});