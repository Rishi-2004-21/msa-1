import { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, MessageSquare, Zap, Bot } from 'lucide-react';

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
const AGENT_COLORS = {
    'Lead Capture Agent':    '#6366f1',
    'Qualification Agent':   '#8b5cf6',
    'Sales Bot':             '#06b6d4',
    'Recommendation Agent':  '#f59e0b',
    'Site Visit Agent':      '#10b981',
    'CRM Agent':             '#ec4899',
    'Post-Sales Agent':      '#14b8a6',
};

const AGENT_EMOJIS = {
    'Lead Capture Agent':    '📥',
    'Qualification Agent':   '🧠',
    'Sales Bot':             '💬',
    'Recommendation Agent':  '🎯',
    'Site Visit Agent':      '🏢',
    'CRM Agent':             '🗂️',
    'Post-Sales Agent':      '🌟',
};

const PIPELINE_AGENTS = [
    { name: 'Lead Capture',    emoji: '📥', id: 1 },
    { name: 'Qualification',   emoji: '🧠', id: 2 },
    { name: 'Sales Bot',       emoji: '💬', id: 3 },
    { name: 'Recommendation',  emoji: '🎯', id: 4 },
    { name: 'Site Visit',      emoji: '🏢', id: 5 },
    { name: 'CRM',             emoji: '🗂️', id: 6 },
    { name: 'Post-Sales',      emoji: '🌟', id: 7 },
];

const STAGE_INDEX = {
    capture: 0, qualify: 1, sales: 2, recommend: 3, sitevisit: 4, crm: 5, postsales: 6, complete: 6,
};

function generateSessionId() {
    return 'web_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
}

function formatMessage(text) {
    // Render bold **text** and line breaks
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
}

export default function ChatBot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState('capture');
    const [sessionId] = useState(() => {
        const saved = sessionStorage.getItem('msa_session');
        if (saved) return saved;
        const id = generateSessionId();
        sessionStorage.setItem('msa_session', id);
        return id;
    });
    const [leadId, setLeadId] = useState(null);
    const messagesEndRef = useRef(null);

    // Load existing session on mount
    useEffect(() => {
        fetch(`${API}/chat/session/${sessionId}`)
            .then(r => r.json())
            .then(data => {
                if (data.exists && data.history?.length) {
                    const msgs = data.history.map(h => ({
                        role: h.role,
                        text: h.content,
                        agentName: h.agentName || null,
                        ts: h.ts,
                    }));
                    setMessages(msgs);
                    setStage(data.stage || 'capture');
                    setLeadId(data.leadId);
                } else {
                    // Send a greeting trigger
                    sendMessage('hi', true);
                }
            })
            .catch(() => sendMessage('hi', true));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage(text, silent = false) {
        const msg = text || input.trim();
        if (!msg) return;

        if (!silent) {
            setMessages(prev => [...prev, { role: 'user', text: msg, ts: new Date().toISOString() }]);
            setInput('');
        }
        setLoading(true);

        try {
            const res = await fetch(`${API}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: msg, source: 'web' }),
            });
            const data = await res.json();

            if (data.responses) {
                const newMsgs = data.responses.map(r => ({
                    role: 'agent',
                    text: r.text,
                    agentName: r.agent?.name || 'Agent',
                    action: r.action,
                    leadId: r.leadId || data.leadId,
                    ts: new Date().toISOString(),
                }));
                setMessages(prev => [...prev, ...newMsgs]);
                setStage(data.stage || stage);
                if (data.leadId) setLeadId(data.leadId);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'agent', text: '⚠️ Connection error. Please try again.', agentName: 'System', ts: new Date().toISOString() }]);
        } finally {
            setLoading(false);
        }
    }

    function resetChat() {
        fetch(`${API}/chat/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
        sessionStorage.removeItem('msa_session');
        setMessages([]);
        setStage('capture');
        setLeadId(null);
        setTimeout(() => sendMessage('hi', true), 100);
    }

    const activeAgentIdx = STAGE_INDEX[stage] ?? 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🤖</div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>MSA Multi-Agent System</h2>
                            <p style={{ fontSize: '.78rem', color: 'var(--text-3)', margin: 0 }}>7-Agent AI Pipeline · Ushnik Technologies</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                        {leadId && (
                            <a href={`/leads/${leadId}`} className="btn btn-secondary btn-sm" style={{ fontSize: '.75rem' }}>
                                View Lead →
                            </a>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={resetChat} title="Start New Chat">
                            <RefreshCw size={13} /> New Chat
                        </button>
                    </div>
                </div>

                {/* Agent Pipeline Progress */}
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {PIPELINE_AGENTS.map((agent, idx) => {
                        const isActive = idx === activeAgentIdx;
                        const isDone = idx < activeAgentIdx;
                        return (
                            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '.72rem', fontWeight: 600,
                                    background: isActive ? 'rgba(99,102,241,0.2)' : isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : isDone ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                                    color: isActive ? 'var(--indigo)' : isDone ? 'var(--emerald)' : 'var(--text-3)',
                                    transition: 'all .3s',
                                }}>
                                    <span>{agent.emoji}</span>
                                    <span style={{ display: 'none', ['@media(min-width:600px)']: { display: 'inline' } }}>{agent.name}</span>
                                </div>
                                {idx < PIPELINE_AGENTS.length - 1 && (
                                    <div style={{ width: 8, height: 1, background: isDone ? 'var(--emerald)' : 'var(--border)', flexShrink: 0 }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Messages */}
            <div className="card" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {messages.length === 0 && (
                    <div className="empty-state">
                        <Bot size={48} style={{ margin: '0 auto 1rem', opacity: .3 }} />
                        <h3>Starting AI Agents...</h3>
                        <p style={{ fontSize: '.875rem' }}>Your 7-agent pipeline is initialising</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const agentColor = AGENT_COLORS[msg.agentName] || '#6366f1';
                    const agentEmoji = AGENT_EMOJIS[msg.agentName] || '🤖';

                    return (
                        <div key={idx} style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: '.6rem', alignItems: 'flex-start' }}>
                            {/* Avatar */}
                            <div style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem',
                                background: isUser ? 'rgba(99,102,241,0.2)' : `${agentColor}22`,
                                border: `1px solid ${isUser ? 'rgba(99,102,241,0.4)' : `${agentColor}44`}`,
                            }}>
                                {isUser ? '👤' : agentEmoji}
                            </div>

                            {/* Bubble */}
                            <div style={{ maxWidth: '75%' }}>
                                {!isUser && msg.agentName && (
                                    <div style={{ fontSize: '.7rem', fontWeight: 700, color: agentColor, marginBottom: '.2rem', letterSpacing: '.02em' }}>
                                        {msg.agentName.toUpperCase()}
                                    </div>
                                )}
                                <div style={{
                                    padding: '.65rem 1rem', borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                    background: isUser ? 'rgba(99,102,241,0.2)' : 'var(--bg-card2)',
                                    border: `1px solid ${isUser ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                                    fontSize: '.875rem', lineHeight: 1.6, color: 'var(--text)',
                                }} dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                                <div style={{ fontSize: '.65rem', color: 'var(--text-3)', marginTop: '.2rem', textAlign: isUser ? 'right' : 'left' }}>
                                    {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                        <div style={{ padding: '.65rem 1rem', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--indigo)', animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
                {['📅 Book a meeting', '📄 Get a proposal', '🎯 Recommendations', '🏢 Site visit', '📋 KYC help'].map(q => (
                    <button key={q} className="filter-pill" onClick={() => { setInput(q); sendMessage(q); }} style={{ fontSize: '.75rem' }}>
                        {q}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '.5rem' }}>
                <input
                    className="form-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
                    placeholder="Type your message..."
                    disabled={loading}
                    style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                    {loading ? <RefreshCw size={16} style={{ animation: 'spin .7s linear infinite' }} /> : <Send size={16} />}
                </button>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: .4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
