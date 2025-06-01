import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BDNS Web - Base de Datos Nacional de Subvenciones',
  description: 'Aplicación web para consultar y gestionar datos de la Base de Datos Nacional de Subvenciones de España',
  keywords: ['BDNS', 'subvenciones', 'españa', 'gobierno', 'ayudas'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="bg-white border-t mt-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="text-center text-sm text-gray-500">
                  <p>
                    Datos proporcionados por la{' '}
                    <a 
                      href="https://www.infosubvenciones.es/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-bdns-blue hover:underline"
                    >
                      Base de Datos Nacional de Subvenciones
                    </a>
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}