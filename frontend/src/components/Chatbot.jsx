// frontend/src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, MessageSquare } from 'lucide-react';
import api from '../services/api';

export default function Chatbot({ sectorSlug, sectorName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Olá! 👋 Sou o assistente de IA do setor de ${sectorName}. Como posso ajudar você hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        sectorSlug,
        message: userText,
        history: messages.slice(-5) // Envia as últimas 5 mensagens para contexto
      });

      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Desculpe, ocorreu um erro na conexão. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {isOpen ? (
        <div className="chatbot-window">
          {/* Header estilo LastPass */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="avatar-circle">
                <Bot size={20} color="white" />
                <span className="online-indicator"></span>
              </div>
              <div className="header-text">
                <span className="bot-name">Assistente {sectorName}</span>
                <span className="bot-status">Online</span>
              </div>
            </div>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="chatbot-messages">
            <div className="chat-date">HOJE {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')}</div>
            
            {messages.map((msg, index) => (
              <div key={index} className={`chat-bubble-container ${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="chat-avatar">
                    <Bot size={16} />
                  </div>
                )}
                <div className={`chat-message ${msg.role}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-bubble-container ai">
                <div className="chat-avatar"><Bot size={16} /></div>
                <div className="chat-message ai typing">A pensar...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-area" onSubmit={sendMessage}>
            <input 
              type="text" 
              placeholder="Escreva sua mensagem..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              disabled={isLoading}
            />
            <button type="submit" className="chatbot-send-btn" disabled={!input.trim() || isLoading}>
              <Send size={18} />
            </button>
          </form>
          <div className="chatbot-footer-brand">
             Central de Documentação © 2026
          </div>
        </div>
      ) : (
        /* Botão Flutuante Estilo Image_8c0e07 */
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          <MessageSquare size={28} color="white" />
        </button>
      )}
    </div>
  );
}