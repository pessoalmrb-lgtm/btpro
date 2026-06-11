'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Zap, Trophy, BarChart3, Users, Star, Check } from 'lucide-react';
import { db, doc, updateDoc } from '../firebase';
import { auth } from '../firebase';

interface PremiumUpgradeProps {
  uid: string;
  onClose: () => void;
  onSuccess: () => void;
  reason?: 'TOURNAMENT_LIMIT' | 'RANKING_LIMIT' | 'ATHLETE_LIMIT' | 'FORMAT_LIMIT' | 'GENERIC' | 'VERIFIED_BADGE';
}

export const PremiumUpgrade = ({ uid, onClose, onSuccess, reason = 'GENERIC' }: PremiumUpgradeProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getReasonConfig = () => {
    switch (reason) {
      case 'TOURNAMENT_LIMIT': return { title: 'Limite de Torneios!',  desc: 'Você atingiu o limite de 1 torneio ativo no plano Free.',         icon: <Zap className="w-8 h-8 text-slate-900" /> };
      case 'ATHLETE_LIMIT':    return { title: 'Limite de Atletas!',   desc: 'Torneios com mais de 8 atletas são exclusivos Premium.',           icon: <Users className="w-8 h-8 text-slate-900" /> };
      case 'FORMAT_LIMIT':     return { title: 'Formato Exclusivo!',   desc: 'O formato Grupos + Mata-Mata é exclusivo Premium.',                icon: <Trophy className="w-8 h-8 text-slate-900" /> };
      case 'RANKING_LIMIT':    return { title: 'Criação de Ligas!',    desc: 'A criação de ligas é exclusiva do plano Premium.',                 icon: <BarChart3 className="w-8 h-8 text-slate-900" /> };
      case 'VERIFIED_BADGE':   return { title: 'Selo Verificado',      desc: 'Destaque seu perfil com o selo oficial.',                          icon: <Star className="w-8 h-8 text-slate-900" /> };
      default:                 return { title: 'Beach Pró Premium',    desc: 'Leve sua organização de torneios ao próximo nível.',               icon: <Trophy className="w-8 h-8 text-slate-900" /> };
    }
  };

  const reasonConfig = getReasonConfig();

  const handleUpgrade = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { Capacitor } = await import('@capacitor/core');
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');

        // Configura o SDK com a API key do BeachPró
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey: 'goog_zjhFiEAkdPNxktnZYxXyCFcQMVc' });

        // Identifica o usuário
        if (uid) {
          await Purchases.logIn({ appUserID: uid });
        }

        // Busca os offerings disponíveis
        const { current } = await Purchases.getOfferings();
        if (!current) throw new Error('Nenhum plano disponível no momento.');

        // Seleciona o package correto
        const packageToBuy = selectedPlan === 'annual'
          ? current.annual ?? current.availablePackages.find(p => p.packageType === 'ANNUAL')
          : current.monthly ?? current.availablePackages.find(p => p.packageType === 'MONTHLY');

        if (!packageToBuy) throw new Error('Plano não encontrado.');

        // Inicia a compra
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToBuy });

        // Verifica se o entitlement foi concedido
        const entitlement = customerInfo.entitlements.active['com.beachpro.app Pro'];
        if (entitlement) {
          // Atualiza Firestore
          await updateDoc(doc(db, 'users', uid), {
            isPremium: true,
            subscriptionPlan: selectedPlan,
            subscriptionExpiresAt: entitlement.expirationDate
              ? new Date(entitlement.expirationDate).getTime()
              : Date.now() + (365 * 24 * 60 * 60 * 1000),
          });
          onSuccess();
        } else {
          throw new Error('Assinatura não ativada. Tente novamente.');
        }
      } else {
        // Fallback web: simula para testes no browser
        const days = selectedPlan === 'annual' ? 365 : 30;
        await updateDoc(doc(db, 'users', uid), {
          isPremium: true,
          subscriptionPlan: selectedPlan,
          subscriptionExpiresAt: Date.now() + (days * 24 * 60 * 60 * 1000),
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error?.code === 'PURCHASE_CANCELLED' || error?.message?.includes('cancel')) {
        // usuário cancelou — silencioso
      } else {
        setErrorMsg(error?.message || 'Erro ao processar assinatura. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const freeFeatures = [
    '1 torneio ativo por vez',
    'Até 8 atletas por torneio',
    'Participar de até 2 ligas',
    'Todos os formatos (exceto Grupos + Mata-Mata)',
    'Histórico de torneios',
  ];

  const premiumFeatures = [
    'Torneios ilimitados',
    'Atletas ilimitados por torneio',
    'Criar ligas e rankings oficiais',
    'Participar de ligas ilimitadas',
    'Formato Grupos + Mata-Mata',
    'Selo Premium no perfil',
    'Estatísticas avançadas',
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-5 right-5 p-2.5 bg-white/80 backdrop-blur-sm rounded-2xl text-slate-800 shadow-xl border border-slate-100 hover:bg-white transition-all active:scale-95 z-20">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 pt-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-400 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-blue-400 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-400 rounded-2xl mb-4 shadow-xl shadow-amber-500/20 rotate-12">
            {reasonConfig.icon}
          </div>
          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
            {reason === 'GENERIC' ? <>Beach Pró <span className="text-amber-400">Premium</span></> : reasonConfig.title}
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">{reasonConfig.desc}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Free vs Premium comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Free</p>
              <div className="space-y-1.5">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Check className="w-2.5 h-2.5 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-[8px] font-black text-slate-500 leading-tight">{f}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 relative overflow-hidden">
              <div className="absolute top-1.5 right-1.5">
                <span className="bg-amber-400 text-slate-900 text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">PRO</span>
              </div>
              <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest mb-2">Premium</p>
              <div className="space-y-1.5">
                {premiumFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Check className="w-2.5 h-2.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[8px] font-black text-amber-800 leading-tight">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plan selector */}
          <div className="space-y-2">
            {/* Annual — default selected */}
            <button
              onClick={() => setSelectedPlan('annual')}
              className={`w-full rounded-2xl p-4 border-2 transition-all text-left relative overflow-hidden ${
                selectedPlan === 'annual'
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-100 bg-slate-50'
              }`}
            >
              {selectedPlan === 'annual' && (
                <div className="absolute top-2 right-2 bg-amber-400 text-slate-900 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  MELHOR VALOR
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedPlan === 'annual' ? 'border-amber-400' : 'border-slate-300'
                }`}>
                  {selectedPlan === 'annual' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedPlan === 'annual' ? 'text-amber-700' : 'text-slate-400'}`}>
                    Anual — 7 dias grátis
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900">R$ 9,90</span>
                    <span className="text-slate-400 text-xs">/mês</span>
                    <span className="text-slate-300 text-[9px] font-black">· R$ 118,80/ano</span>
                  </div>
                  <p className="text-[8px] font-black text-amber-600 mt-0.5">Cancele antes de 7 dias sem custo</p>
                </div>
              </div>
            </button>

            {/* Monthly */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`w-full rounded-2xl p-4 border-2 transition-all text-left ${
                selectedPlan === 'monthly'
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedPlan === 'monthly' ? 'border-slate-500' : 'border-slate-300'
                }`}>
                  {selectedPlan === 'monthly' && <div className="w-2 h-2 rounded-full bg-slate-500" />}
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensal</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">R$ 19,90</span>
                    <span className="text-slate-400 text-xs">/mês</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            {errorMsg && (
              <p className="text-[9px] font-black text-red-500 uppercase tracking-tight text-center px-2">{errorMsg}</p>
            )}
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading
                ? <span className="animate-spin text-lg">⏳</span>
                : <>
                    {selectedPlan === 'annual' ? 'COMEÇAR 7 DIAS GRÁTIS' : 'ASSINAR AGORA'}
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </>
              }
            </button>
            <button onClick={onClose} className="w-full py-2.5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
              Talvez mais tarde
            </button>
            <p className="text-center text-[8px] text-slate-300 px-4 leading-relaxed">
              Ao assinar, você concorda com nossos termos. A renovação é automática e pode ser cancelada a qualquer momento.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
