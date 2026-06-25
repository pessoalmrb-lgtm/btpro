import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-black text-primary italic uppercase mb-4">404 - Página não encontrada</h2>
      <Link href="/" className="text-secondary underline font-bold">
        Voltar para a home
      </Link>
    </div>
  );
}
