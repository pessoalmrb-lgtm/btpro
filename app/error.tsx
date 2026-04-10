'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Algo deu errado!</h2>
      <button
        onClick={() => reset()}
        className="btn-primary"
      >
        Tentar novamente
      </button>
    </div>
  );
}
