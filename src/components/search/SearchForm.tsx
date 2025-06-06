'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchFormProps {
  onSearch: (query?: string) => void;
  loading?: boolean;
  initialQuery?: string;
}

interface SearchSuggestion {
  query: string;
  last_searched: string;
  result_count: number;
}

export default function SearchForm({ onSearch, loading = false, initialQuery = '' }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { data: session } = useSession();
  const searchRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim() || undefined);
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    onSearch(searchTerm);
    setShowSuggestions(false);
  };

  const fetchSuggestions = useCallback(async (searchQuery: string, append = false) => {
    if (!session || loadingMore) return;
    
    const currentOffset = append ? offset : 0;
    if (append) setLoadingMore(true);
    
    try {
      const response = await fetch(
        `/api/search/history?q=${encodeURIComponent(searchQuery)}&limit=10&offset=${currentOffset}`
      );
      if (response.ok) {
        const data = await response.json();
        const newSuggestions = data.data || [];
        
        if (append) {
          setSuggestions(prev => [...prev, ...newSuggestions]);
        } else {
          setSuggestions(newSuggestions);
          setOffset(0);
          setHasMore(true);
        }
        
        // If we got less than 10 results, we've reached the end
        if (newSuggestions.length < 10) {
          setHasMore(false);
        }
        
        if (append) {
          setOffset(currentOffset + newSuggestions.length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [session, offset, loadingMore]);

  const deleteSuggestion = async (suggestionQuery: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/search/history?query=${encodeURIComponent(suggestionQuery)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.query !== suggestionQuery));
      }
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  useEffect(() => {
    if (session && debouncedQuery) {
      fetchSuggestions(debouncedQuery);
    } else if (session && !debouncedQuery && showSuggestions) {
      fetchSuggestions('');
    }
  }, [debouncedQuery, session, fetchSuggestions, showSuggestions]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more when user scrolls past 50% or reaches the bottom
      if ((scrollTop + clientHeight >= scrollHeight - 100 || 
           scrollTop > (scrollHeight - clientHeight) * 0.5) && 
          hasMore && !loadingMore) {
        fetchSuggestions(debouncedQuery, true);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [debouncedQuery, hasMore, loadingMore, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev < suggestions.length - 1 ? prev + 1 : prev;
          // Scroll to the selected item if needed
          if (scrollRef.current && newIndex >= 0) {
            const items = scrollRef.current.children;
            if (items[newIndex]) {
              (items[newIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
            }
          }
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : -1;
          // Scroll to the selected item if needed
          if (scrollRef.current && newIndex >= 0) {
            const items = scrollRef.current.children;
            if (items[newIndex]) {
              (items[newIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
            }
          }
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleQuickSearch(suggestions[selectedIndex].query);
        } else {
          handleSubmit(e as any);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
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
      <div ref={searchRef} className="relative">
        <form onSubmit={handleSubmit}>
          <div className="flex">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                  setSelectedIndex(-1);
                  setOffset(0);
                  setHasMore(true);
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                  setOffset(0);
                  setHasMore(true);
                }}
                onKeyDown={handleKeyDown}
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

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
            <div 
              ref={scrollRef}
              className="max-h-[256px] overflow-y-auto"
              style={{ scrollBehavior: 'smooth' }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.query}-${index}`}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                    index === selectedIndex ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => handleQuickSearch(suggestion.query)}
                >
                  <div className="flex items-center flex-1">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{suggestion.query}</p>
                      <p className="text-xs text-gray-500">
                        {suggestion.result_count} resultados • {new Date(suggestion.last_searched).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteSuggestion(suggestion.query, e)}
                    className="ml-2 p-1 hover:bg-gray-200 rounded"
                    title="Eliminar de historial"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              ))}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                </div>
              )}
              {!hasMore && suggestions.length > 0 && (
                <div className="px-4 py-2 text-xs text-gray-400 text-center bg-gray-50">
                  No hay más búsquedas
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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