'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchFormProps {
  onSearch: (query?: string) => void;
  loading?: boolean;
  initialQuery?: string;
}

export default function SearchForm({ onSearch, loading = false, initialQuery = '' }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim() || undefined);
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    onSearch(searchTerm);
  };

  const quickSearchTerms = [
    'I+D+i',
    'Empleo',
    'Medio Ambiente',
    'Turismo',
    'Agricultura',
    'Educación',
    'Cultura',
    'Deportes'
  ];

  return (
    <div className="space-y-4">
      {/* Main Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar subvenciones, organismos, materias..."
              className="form-input pl-10 pr-4 py-3 text-lg"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary ml-3 px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Buscando...
              </div>
            ) : (
              'Buscar'
            )}
          </button>
        </div>
      </form>

      {/* Quick Search Terms */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Búsquedas populares:</p>
        <div className="flex flex-wrap gap-2">
          {quickSearchTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleQuickSearch(term)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Search Tips */}
      <div className="text-xs text-gray-500">
        <p>
          <strong>Consejos de búsqueda:</strong> 
          Usa comillas para buscar frases exactas ("ayudas agricultura"),
          el símbolo + para términos obligatorios (+empleo +joven),
          o el símbolo - para excluir términos (-préstamo).
        </p>
      </div>
    </div>
  );
}