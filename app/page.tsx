import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const PingProApp = dynamic(() => import('../components/PingProApp'), {
  ssr: false,
});

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-slate-500 font-medium text-center italic uppercase tracking-widest text-[10px] font-black">Carregando BeachPro...</p>
      </div>
    }>
      <PingProApp />
    </Suspense>
  );
}
