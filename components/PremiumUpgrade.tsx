'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Trophy, BarChart3, Users, X, Star } from 'lucide-react';
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
      case 'TOURNAMENT_LIMIT':
        return {
          title: "Limite de Torneios!",
          desc: "Você atingiu o limite de 1 torneio ativo. Como usuário PRO, você pode organizar infinitos torneios simultâneos.",
          icon: <Zap className="w-8 h-8 text-slate-900" />
        };
      case 'ATHLETE_LIMIT':
        return {
          title: "Limite de Atletas!",
          desc: "Torneios com mais de 8 atletas são exclusivos para usuários PRO. Organize grandes eventos com quantos atletas quiser!",
          icon: <Users className="w-8 h-8 text-slate-900" />
        };
      case 'FORMAT_LIMIT':
        return {
          title: "Formatos Exclusivos!",
          desc: "O formato de Grupos + Mata-mata é uma função exclusiva Premium. Organize torneios profissionais com chaves automáticas!",
          icon: <Trophy className="w-8 h-8 text-slate-900" />
        };
      case 'RANKING_LIMIT':
        return {
          title: "Limite de Rankings!",
          desc: "Usuários Free podem ter 1 ranking ativo. No plano PRO, você cria rankings ilimitados para todas as suas ligas.",
          icon: <BarChart3 className="w-8 h-8 text-slate-900" />
        };
      case 'VERIFIED_BADGE':
        return {
          title: "Selo de Verificado",
          desc: "Destaque seu perfil com o selo oficial. Mostre para todos que você é um organizador profissional.",
          icon: <Star className="w-8 h-8 text-slate-900" />
        };
      default:
        return {
          title: "Beach Pró Premium",
          desc: "Leve sua organização de torneios para o próximo nível.",
          icon: <Trophy className="w-8 h-8 text-slate-900" />
        };
    }
  };

  const reasonConfig = getReasonConfig();
  
  const handleSimulateUpgrade = async () => {
    try {
      // In a real scenario, this would be called after a successful Stripe/PlayStore session
      await updateDoc(doc(db, 'users', uid), {
        isPremium: true,
        subscriptionExpiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      });
      onSuccess();
    } catch (error) {
      console.error("Error upgrading:", error);
    }
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      title: "Torneios Ilimitados",
      desc: "Crie e gerencie quantos torneios quiser sem restrições."
    },
    {
      icon: <Trophy className="w-5 h-5 text-blue-500" />,
      title: "Formatos Exclusivos",
      desc: "Acesso total a Grupos + Mata-mata e chaves personalizadas."
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-green-500" />,
      title: "Rankings Avançados",
      desc: "Estatísticas detalhadas de vitórias, pneus e histórico de atletas."
    },
    {
      icon: <Users className="w-5 h-5 text-purple-500" />,
      title: "Gestão de Ligas",
      desc: "Crie ligas oficiais e convide centenas de atletas via ID ou Tag."
    },
    {
      icon: <Star className="w-5 h-5 text-rose-500" />,
      title: "Selo Verificado",
      desc: "Destaque seu perfil e suas ligas com o selo de autenticidade."
    }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur-sm rounded-2xl text-slate-800 shadow-xl border border-slate-100 hover:bg-white transition-all transform active:scale-95 z-20"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 pt-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-amber-400 rounded-full blur-3xl animate-pulse" />
             <div className="absolute bottom-[-50px] right-[-50px] w-40 h-40 bg-blue-400 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400 rounded-2xl mb-6 shadow-xl shadow-amber-500/20 rotate-12">
            {reasonConfig.icon}
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            {reason === 'GENERIC' ? (
              <>Beach Pró <span className="text-amber-400">Premium</span></>
            ) : (
              reasonConfig.title
            )}
          </h2>
          <p className="text-slate-400 text-sm">{reasonConfig.desc}</p>
        </div>

        {/* content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="mt-1">{f.icon}</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{f.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-2">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Comparativo de Versões</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] border-b border-white pb-1">
                <span className="text-slate-600 font-bold">Torneios Ativos</span>
                <div className="flex gap-4">
                  <span className="text-slate-400">Free: 1</span>
                  <span className="text-amber-600 font-black italic">PRO: ∞</span>
                </div>
              </div>
              <div className="flex justify-between text-[11px] border-b border-white pb-1">
                <span className="text-slate-600 font-bold">Ligas & Rankings</span>
                <div className="flex gap-4">
                  <span className="text-slate-400">Free: 1</span>
                  <span className="text-amber-600 font-black italic">PRO: ∞</span>
                </div>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 font-bold">Selo de Verificado</span>
                <div className="flex gap-4">
                  <span className="text-slate-400">Não</span>
                  <span className="text-amber-600 font-black italic">Sim</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-medium">Assinatura Mensal</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">R$ 19,90</span>
                  <span className="text-slate-400 text-xs">/mês</span>
                </div>
              </div>
              <div className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                Melhor Valor
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <button 
               onClick={handleSimulateUpgrade}
               className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all transform active:scale-95 flex items-center justify-center gap-2"
             >
               SEJA PREMIUM AGORA
               <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
             </button>
             <button 
               onClick={onClose}
               className="w-full py-3 bg-transparent text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all"
             >
               Talvez mais tarde
             </button>
             <p className="text-center text-[10px] text-slate-400 px-4">
               Ao assinar, você concorda com nossos termos. A renovação é automática e pode ser cancelada a qualquer momento.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
