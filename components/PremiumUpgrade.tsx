'use client';

import React from 'react';
import { motion } from 'motion/react';
import { X, Zap, Trophy, BarChart3, Users, Star, Check } from 'lucide-react';
import { db, doc, updateDoc } from '../firebase';

interface PremiumUpgradeProps {
  uid: string;
  onClose: () => void;
  onSuccess: () => void;
  reason?: 'TOURNAMENT_LIMIT' | 'RANKING_LIMIT' | 'ATHLETE_LIMIT' | 'FORMAT_LIMIT' | 'GENERIC' | 'VERIFIED_BADGE';
}

export const PremiumUpgrade = ({ uid, onClose, onSuccess, reason = 'GENERIC' }: PremiumUpgradeProps) => {

  const getReasonConfig = () => {
    switch (reason) {
      case 'TOURNAMENT_LIMIT':  return { title: 'Limite de Torneios!',      desc: 'Você atingiu o limite de 1 torneio ativo no plano Free. Seja Premium e organize torneios ilimitados.',      icon: <Zap className="w-8 h-8 text-slate-900" /> };
      case 'ATHLETE_LIMIT':     return { title: 'Limite de Atletas!',        desc: 'Torneios com mais de 8 atletas são exclusivos Premium. Organize eventos com quantos atletas quiser.',         icon: <Users className="w-8 h-8 text-slate-900" /> };
      case 'FORMAT_LIMIT':      return { title: 'Formato Exclusivo!',        desc: 'O formato Grupos + Mata-Mata é exclusivo Premium. Organize torneios profissionais com chaves automáticas.', icon: <Trophy className="w-8 h-8 text-slate-900" /> };
      case 'RANKING_LIMIT':     return { title: 'Criação de Ligas!',         desc: 'A criação de ligas é exclusiva do plano Premium. Atletas Free podem participar de até 2 ligas gratuitamente.', icon: <BarChart3 className="w-8 h-8 text-slate-900" /> };
      case 'VERIFIED_BADGE':    return { title: 'Selo Verificado',           desc: 'Destaque seu perfil com o selo oficial e mostre que você é um organizador profissional.',                    icon: <Star className="w-8 h-8 text-slate-900" /> };
      default:                  return { title: 'Beach Pró Premium',          desc: 'Leve sua organização de torneios ao próximo nível.',                                                          icon: <Trophy className="w-8 h-8 text-slate-900" /> };
    }
  };

  const reasonConfig = getReasonConfig();

  const handleSimulateUpgrade = async () => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isPremium: true,
        subscriptionExpiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
      });
      onSuccess();
    } catch (error) {
      console.error('Error upgrading:', error);
    }
  };

  const freeFeatures = [
    '1 torneio ativo por vez',
    'Até 8 atletas por torneio',
    'Participar de até 2 ligas',
    'Todos os formatos de disputa (exceto Grupos + Mata-Mata)',
    'Histórico de torneios',
  ];

  const premiumFeatures = [
    'Torneios ilimitados simultaneamente',
    'Atletas ilimitados por torneio',
    'Criar ligas e rankings oficiais',
    'Participar de ligas ilimitadas',
    'Formato Grupos + Mata-Mata',
    'Selo Premium no perfil e nas ligas',
    'Estatísticas avançadas dos atletas',
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur-sm rounded-2xl text-slate-800 shadow-xl border border-slate-100 hover:bg-white transition-all active:scale-95 z-20">
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 pt-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-400 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-blue-400 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400 rounded-2xl mb-6 shadow-xl shadow-amber-500/20 rotate-12">
            {reasonConfig.icon}
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            {reason === 'GENERIC' ? <>Beach Pró <span className="text-amber-400">Premium</span></> : reasonConfig.title}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">{reasonConfig.desc}</p>
        </div>

        {/* Comparison table */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {/* Free column */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Plano Free</p>
              <div className="space-y-2">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-[9px] font-black text-slate-500 leading-tight">{f}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium column */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <span className="bg-amber-400 text-slate-900 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">PRO</span>
              </div>
              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-3">Plano Premium</p>
              <div className="space-y-2">
                {premiumFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[9px] font-black text-amber-800 leading-tight">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-3">
            {/* Plano Mensal */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensal</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">R$ 19,90</span>
                  <span className="text-slate-400 text-xs">/mês</span>
                </div>
              </div>
            </div>

            {/* Plano Anual */}
            <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-400 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-amber-400 text-slate-900 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                MELHOR VALOR
              </div>
              <div>
                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Anual — 7 dias grátis</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">R$ 9,90</span>
                  <span className="text-slate-400 text-xs">/mês</span>
                </div>
                <p className="text-[8px] font-black text-amber-600 mt-1">Cobrado anualmente • Cancele antes de 7 dias sem custo</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <button
              onClick={handleSimulateUpgrade}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              SEJA PREMIUM AGORA
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </button>
            <button onClick={onClose} className="w-full py-3 bg-transparent text-slate-400 rounded-2xl font-black hover:bg-slate-50 transition-all text-xs uppercase tracking-widest">
              Talvez mais tarde
            </button>
            <p className="text-center text-[9px] text-slate-300 px-4 leading-relaxed">
              Ao assinar, você concorda com nossos termos. A renovação é automática e pode ser cancelada a qualquer momento.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
