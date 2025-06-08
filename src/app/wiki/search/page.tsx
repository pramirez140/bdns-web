'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WikiSearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category_name: string;
  rank: number;
  headline: string;
}

export default function WikiSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string, searchOffset = 0) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/wiki/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${searchOffset}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (searchOffset === 0) {
          setResults(data.data);
        } else {
          setResults(prev => [...prev, ...data.data]);
        }
        setTotal(data.pagination.total);
        setOffset(searchOffset);
      }
    } catch (error) {
      console.error('Error searching wiki:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && query !== initialQuery) {
      router.push(`/wiki/search?q=${encodeURIComponent(query)}`);
      performSearch(query);
    }
  };

  const loadMore = () => {
    performSearch(query, offset + limit);
  };

  const hasMore = offset + limit < total;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/wiki')}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a la wiki
          </Button>

          <h1 className="text-3xl font-bold mb-4">Buscar en la Wiki</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="search"
                placeholder="Buscar páginas wiki..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4 py-6 text-lg"
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </form>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                Se encontraron {total} resultados para "{initialQuery}"
              </p>
            </div>

            <div className="space-y-4">
              {results.map((result) => (
                <Card key={result.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          <Link 
                            href={`/wiki/${result.slug}`}
                            className="hover:text-blue-600"
                          >
                            {result.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <FileText className="h-4 w-4 mr-1" />
                          {result.category_name}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        Relevancia: {(result.rank * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.headline ? (
                      <div 
                        className="text-gray-600"
                        dangerouslySetInnerHTML={{ __html: result.headline }}
                      />
                    ) : (
                      <p className="text-gray-600">{result.excerpt}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? 'Cargando...' : 'Cargar más resultados'}
                </Button>
              </div>
            )}
          </>
        ) : (
          initialQuery && !loading && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">
                  No se encontraron resultados para "{initialQuery}"
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Intenta con otros términos de búsqueda
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}