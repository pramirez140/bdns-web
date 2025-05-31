import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-bdns-blue">
                    BDNS Web
                  </h1>
                  <span className="ml-2 text-sm text-gray-500">
                    Base de Datos Nacional de Subvenciones
                  </span>
                </div>
                <nav className="flex space-x-4">
                  <a 
                    href="/?tab=search" 
                    className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Búsqueda
                  </a>
                  <a 
                    href="/?tab=sync" 
                    className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Gestión de Datos
                  </a>
                  <a 
                    href="/expedientes" 
                    className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Expedientes
                  </a>
                </nav>
              </div>
            </div>
          </header>
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
      </body>
    </html>
  );
}