const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

const chatSessions = new Map();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- ADDED/MODIFIED STATIC FILE SERVING SECTION ---
// Serve compiled assets from the 'dist' directory when requested via the /dist URL path.
// For example, a request for /dist/output.css will look in the ./dist/output.css file.
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Serve other static assets (like index.html) directly from the project root.
// This allows index.html to be accessed at the root URL ("/").
app.use(express.static(path.join(__dirname, '.')));
// --- END STATIC FILE SERVING SECTION ---


function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getSession(sessionId) {
    if (!sessionId || !chatSessions.has(sessionId)) {
        const newSessionId = generateSessionId();
        chatSessions.set(newSessionId, { messages: [], created: new Date() });
        return { sessionId: newSessionId, session: chatSessions.get(newSessionId) };
    }
    return { sessionId, session: chatSessions.get(sessionId) };
}

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), message: 'HustleSynth AI Backend is running!' });
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId: clientSessionId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const { sessionId, session } = getSession(clientSessionId);

        session.messages.push({ role: 'user', content: message, timestamp: new Date() });

        const messages = [
            {
                role: 'system',
                content: 'You are HustleSynth AI, a helpful AI assistant focused on productivity and business growth. Be engaging, helpful, and professional.'
            },
            ...session.messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content }))
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://hustlesynth.space',
                'X-Title': 'HustleSynth AI'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat-v3-0324:free',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OpenRouter response data:', JSON.stringify(data, null, 2));

        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Malformed response from OpenRouter API');
        }

        const aiResponse = data.choices[0].message.content;

        session.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });

        res.json({ response: aiResponse, sessionId: sessionId });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Sorry, I encountered an error. Please try again.', details: error.message });
    }
});

app.get('/api/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = chatSessions.get(sessionId);
    if (!session) return res.json({ messages: [] });
    res.json({ messages: session.messages });
});

app.delete('/api/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    chatSessions.delete(sessionId);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 HustleSynth AI Backend running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'Set ✅' : 'Missing ❌'}`);
});