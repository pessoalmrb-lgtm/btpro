import dynamic from 'next/dynamic';

const PingProApp = dynamic(() => import('../components/PingProApp'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-500 font-medium text-center">Carregando BeachPró...</p>
    </div>
  ),
});

export default function Home() {
  return <PingProApp />;
}
