export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-center">
      <h1 className="text-6xl font-black text-primary mb-2 italic tracking-tighter">404</h1>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-8">Página não encontrada</p>
      <a 
        href="/" 
        className="px-8 py-4 bg-primary text-on-primary rounded-full font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20"
      >
        Voltar ao início
      </a>
    </div>
  );
}
