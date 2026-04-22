'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      try {
        const errorStr = String(this.state.errorInfo || "");
        if (errorStr.startsWith("{")) {
          const parsed = JSON.parse(errorStr);
          if (parsed && typeof parsed === 'object' && parsed.error && parsed.error.includes("insufficient permissions")) {
            displayMessage = "Erro de permissão no banco de dados. Por favor, verifique se você está logado corretamente.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
            <AlertCircle size={48} className="text-error mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-500 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-3"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
