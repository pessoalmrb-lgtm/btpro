import type { Metadata } from 'next';
import { Inter, Epilogue } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BeachPro - Gestão de Torneios',
  description: 'Aplicativo moderno e intuitivo para gerenciamento de torneios de Beach Tennis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${epilogue.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
