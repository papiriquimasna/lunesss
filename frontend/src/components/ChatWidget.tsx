import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

// Mock message structure
interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
}

// Initial messages
const initialMessages: Message[] = [
  {
    id: 1,
    text: '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy con tus modelos?',
    sender: 'bot',
  },
  {
    id: 2,
    text: 'Me gustaría ver un resumen del rendimiento del último entrenamiento.',
    sender: 'user',
  },
  {
    id: 3,
    text: '¡Claro! El último modelo de clasificación alcanzó una precisión del 92.7%. ¿Quieres ver la matriz de confusión?',
    sender: 'bot',
  }
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleOpen}
          className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
          aria-label="Abrir chat"
        >
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 w-[360px] h-[500px] bg-card border rounded-lg shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Asistente IA</h3>
                  <p className="text-xs text-muted-foreground">En línea</p>
                </div>
              </div>
              <button
                onClick={toggleOpen}
                className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Cerrar chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-end gap-2',
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.sender === 'bot' && (
                     <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'max-w-[75%] px-4 py-2 rounded-lg',
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none'
                    )}
                  >
                    <p className="text-sm">{message.text}</p>
                  </motion.div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer/Input */}
            <footer className="p-4 border-t">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  className="w-full bg-muted border border-transparent rounded-lg pl-4 pr-12 py-2 text-sm focus:ring-primary focus:border-primary"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
