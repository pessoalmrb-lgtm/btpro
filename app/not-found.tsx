import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Página não encontrada</h1>
      <p className="text-slate-500 mb-8">Desculpe, a página que você está procurando não existe.</p>
      <Link href="/" className="btn-primary">Voltar ao início</Link>
    </div>
  );
}
