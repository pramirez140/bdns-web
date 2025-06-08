'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Book, Clock, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface WikiCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  children: WikiCategory[];
}

interface WikiPage {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category_name: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface WikiTag {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
  color: string | null;
}

export default function WikiHomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [popularPages, setPopularPages] = useState<WikiPage[]>([]);
  const [recentPages, setRecentPages] = useState<WikiPage[]>([]);
  const [tags, setTags] = useState<WikiTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWikiData();
  }, []);

  const fetchWikiData = async () => {
    try {
      const [categoriesRes, popularRes, recentRes, tagsRes] = await Promise.all([
        fetch('/api/wiki/categories'),
        fetch('/api/wiki/popular?limit=5'),
        fetch('/api/wiki/recent?limit=5'),
        fetch('/api/wiki/tags')
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.data);
      }

      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopularPages(data.data);
      }

      if (recentRes.ok) {
        const data = await recentRes.json();
        setRecentPages(data.data);
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTags(data.data.slice(0, 10)); // Top 10 tags
      }
    } catch (error) {
      console.error('Error fetching wiki data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/wiki/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Wiki BDNS</h1>
            <p className="text-xl text-gray-600">
              Base de conocimiento sobre subvenciones y ayudas públicas
            </p>
          </div>
          {session?.user && (
            <Button onClick={() => router.push('/wiki/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear página
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="search"
              placeholder="Buscar en la wiki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-6 text-lg"
            />
            <Button 
              type="submit" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              Buscar
            </Button>
          </div>
        </form>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Book className="h-5 w-5 mr-2" />
                Categorías
              </CardTitle>
              <CardDescription>
                Explora el contenido organizado por temas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/wiki/category/${category.slug}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-semibold mb-1 flex items-center">
                      {category.name}
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
                    </h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                    {category.children.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {category.children.length} subcategorías
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Popular Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Páginas populares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularPages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/wiki/${page.slug}`}
                    className="block hover:underline"
                  >
                    <p className="font-medium">{page.title}</p>
                    <p className="text-sm text-gray-500">
                      {page.view_count} visitas
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Páginas recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/wiki/${page.slug}`}
                    className="block hover:underline"
                  >
                    <p className="font-medium">{page.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(page.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Etiquetas populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/wiki/tag/${tag.slug}`}
                  >
                    <Badge 
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-200"
                      style={tag.color ? { backgroundColor: tag.color + '20', borderColor: tag.color } : {}}
                    >
                      {tag.name} ({tag.usage_count})
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Enlaces rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/wiki/guia-inicio"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <h3 className="font-semibold mb-1">Guía de inicio</h3>
              <p className="text-sm text-gray-600">
                Aprende a usar el sistema BDNS
              </p>
            </Link>
            <Link
              href="/wiki/api-documentation"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <h3 className="font-semibold mb-1">Documentación API</h3>
              <p className="text-sm text-gray-600">
                Integra BDNS en tu aplicación
              </p>
            </Link>
            <Link
              href="/wiki/faq"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <h3 className="font-semibold mb-1">Preguntas frecuentes</h3>
              <p className="text-sm text-gray-600">
                Respuestas a dudas comunes
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}