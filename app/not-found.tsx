import React from 'react';

export default function NotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem', 
      backgroundColor: '#f8fafc', 
      textAlign: 'center', 
      fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>404</h1>
      <p style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', marginBottom: '2rem' }}>Página não encontrada</p>
      <a 
        href="/" 
        style={{ 
          padding: '1rem 2rem', 
          backgroundColor: '#0f172a', 
          color: 'white', 
          borderRadius: '9999px', 
          fontWeight: 900, 
          fontSize: '0.75rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em', 
          textDecoration: 'none' 
        }}
      >
        Voltar ao início
      </a>
    </div>
  );
}
