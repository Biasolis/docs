// frontend/src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, MessageSquare } from 'lucide-react';
import api from '../services/api';

// COMPONENTE MÁGICO REESCRITO: Agora 100% seguro contra travamentos do navegador!
const TypewriterHTML = ({ html, speed = 15 }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    let i = 0;
    let isMounted = true;

    const typeChar = () => {
      if (!isMounted || i >= html.length) return;

      let charCount = 1;
      
      // Se for o início de uma tag HTML (ex: <strong>, <br>), avança a tag inteira de uma vez
      if (html[i] === '<') {
        const endIndex = html.indexOf('>', i);
        if (endIndex !== -1) {
          charCount = (endIndex - i) + 1;
        }
      } 
      // Se for um caractere especial do HTML (ex: &nbsp; ou &#39;)
      else if (html[i] === '&') {
        const endIndex = html.indexOf(';', i);
        if (endIndex !== -1 && (endIndex - i) < 10) { 
          charCount = (endIndex - i) + 1;
        }
      }

      i += charCount;
      // Atualiza o texto cortando a string até a posição atual (muito mais seguro)
      setContent(html.substring(0, i));

      // Se pulou uma tag inteira, digita instantaneamente. Se for letra, espera os 15ms.
      setTimeout(typeChar, charCount > 1 ? 0 : speed);
    };

    typeChar();

    return () => { isMounted = false; };
  }, [html, speed]);

  return <span dangerouslySetInnerHTML={{ __html: content }} />;
};


export default function Chatbot({ sectorSlug, sectorName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Olá! 👋 Sou o assistente de IA do setor de ${sectorName}. Como posso ajudar você hoje?`, html: `<p>Olá! 👋 Sou o assistente de IA do setor de ${sectorName}. Como posso ajudar você hoje?</p>`, isNew: false }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
    
    // CORREÇÃO CRÍTICA: Tira a propriedade 'isNew' de todas as mensagens antigas, 
    // para garantir que a IA não comece a digitar o histórico todo novamente.
    const cleanHistory = messages.map(m => ({ ...m, isNew: false }));
    
    const newMessages = [...cleanHistory, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        sectorSlug,
        message: userText,
        history: newMessages 
      });

      // Adiciona apenas a resposta atual com 'isNew: true' para ativar a "Máquina de Escrever"
      setMessages(prev => [
        ...prev.map(m => ({ ...m, isNew: false })), 
        { role: 'ai', text: res.data.answer, html: res.data.html, isNew: true }
      ]);
    } catch (error) {
      console.error(error);
      
      if (error.response && error.response.status === 423) {
          setMessages(prev => [
            ...prev.map(m => ({ ...m, isNew: false })), 
            { 
              role: 'ai', 
              text: error.response.data.message,
              html: `<p style="color: #d97706; font-weight: bold;">⏳ ${error.response.data.message}</p>`, 
              isNew: false 
            }
          ]);
      } else {
          setMessages(prev => [
            ...prev.map(m => ({ ...m, isNew: false })), 
            { 
              role: 'ai', 
              text: 'Erro de conexão.',
              html: '<p>Desculpe, ocorreu um erro na conexão. Tente novamente.</p>', 
              isNew: false 
            }
          ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {isOpen ? (
        <div className="chatbot-window">
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
                  <div className="chat-avatar"><Bot size={16} /></div>
                )}
                
                <div className={`chat-message ${msg.role}`}>
                  {msg.html ? (
                    // Aqui decidimos: se a msg for da IA e acabou de chegar (isNew), digita! Se for velha, mostra instantaneamente.
                    (msg.role === 'ai' && msg.isNew) 
                        ? <TypewriterHTML html={msg.html} /> 
                        : <span dangerouslySetInnerHTML={{ __html: msg.html }} />
                  ) : (
                    <span>{msg.text}</span>
                  )}
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
              autoFocus
            />
            <button type="submit" className="chatbot-send-btn" disabled={!input.trim() || isLoading}>
              <Send size={18} />
            </button>
          </form>
          <div className="chatbot-footer-brand">Portal de Documentação © 2026</div>
        </div>
      ) : (
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          <MessageSquare size={28} color="white" />
        </button>
      )}
    </div>
  );
}