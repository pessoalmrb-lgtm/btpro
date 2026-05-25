'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lightbulb, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface SuggestionModalProps {
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export const SuggestionModal = ({ onClose, userEmail = '', userName = '' }: SuggestionModalProps) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // ─── Configure aqui ───────────────────────────────────────────────
  // 1. Crie conta em https://emailjs.com (plano gratuito: 200 envios/mês)
  // 2. Crie um "Email Service" conectando seu Gmail
  // 3. Crie um "Email Template" com as variáveis abaixo
  // 4. Substitua os valores pelos seus
  const EMAILJS_SERVICE_ID  = 'service_h45e5rc';   // ex: 'service_abc123'
  const EMAILJS_TEMPLATE_ID = 'template_r3body8';  // ex: 'template_xyz789'
  const EMAILJS_PUBLIC_KEY  = 'ylfdKqLyTrF7pbccA';   // ex: 'XXXXXXXXXXXXXXXX'
  // ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!message.trim() || message.trim().length < 10) return;
    setStatus('sending');

    try {
      const { send } = await import('@emailjs/browser');
      await send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          title:   'Nova Sugestão',
          name:    userName  || 'Usuário anônimo',
          email:   userEmail || 'Não informado',
          message: message.trim(),
          time:    new Date().toLocaleString('pt-BR'),
        },
        EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
    } catch (err) {
      console.error('EmailJS error:', err);
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center p-4 bg-slate-900/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/10 rounded-2xl text-white/70 hover:bg-white/20 transition-all active:scale-90"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-400/20 rotate-6">
            <Lightbulb size={22} className="text-slate-900" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Sua Sugestão</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Nos ajude a melhorar o BeachPró</p>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight italic mb-1">Obrigado!</p>
                  <p className="text-xs text-slate-500">Sua sugestão foi enviada. Lemos todas e usamos para melhorar o app.</p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  FECHAR
                </button>
              </motion.div>
            ) : status === 'error' ? (
              <motion.div
                key="error"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                  <AlertCircle size={36} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight italic mb-1">Falhou</p>
                  <p className="text-xs text-slate-500">Não foi possível enviar. Verifique sua conexão e tente novamente.</p>
                </div>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  TENTAR NOVAMENTE
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    O que podemos melhorar?
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Descreva sua ideia, bug encontrado ou melhoria que gostaria de ver no app..."
                    rows={5}
                    maxLength={1000}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-slate-300 transition-all"
                  />
                  <p className="text-[9px] text-slate-400 text-right mt-1 font-medium">{message.length}/1000</p>
                </div>

                <button
                  onClick={handleSend}
                  disabled={message.trim().length < 10 || status === 'sending'}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  {status === 'sending' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ENVIANDO...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      ENVIAR SUGESTÃO
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
