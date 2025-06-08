'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  Clock, 
  User, 
  Tag, 
  Eye, 
  MessageSquare,
  ChevronLeft,
  Share,
  Bookmark,
  History
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WikiPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  content_type: string;
  status: string;
  visibility: string;
  view_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  last_edited_at: string | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  author?: {
    id: string;
    name: string;
    email: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
    color: string | null;
  }>;
}

export default function WikiPageView() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.slug) {
      fetchPage(params.slug as string);
    }
  }, [params.slug]);

  const fetchPage = async (slug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wiki/pages/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Página no encontrada');
        } else if (response.status === 401) {
          setError('Necesitas iniciar sesión para ver esta página');
        } else {
          setError('Error al cargar la página');
        }
        return;
      }

      const data = await response.json();
      setPage(data.data);
    } catch (error) {
      console.error('Error fetching page:', error);
      setError('Error al cargar la página');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEdit = () => {
    if (!session?.user || !page) return false;
    return page.author?.id === session.user.id || session.user.role === 'admin';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/wiki')}>
            Volver a la wiki
          </Button>
        </div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 mb-6 text-sm">
          <Link href="/wiki" className="text-gray-500 hover:text-gray-700">
            Wiki
          </Link>
          <span className="text-gray-400">/</span>
          {page.category && (
            <>
              <Link 
                href={`/wiki/category/${page.category.slug}`}
                className="text-gray-500 hover:text-gray-700"
              >
                {page.category.name}
              </Link>
              <span className="text-gray-400">/</span>
            </>
          )}
          <span className="text-gray-700">{page.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold">{page.title}</h1>
            <div className="flex items-center space-x-2">
              {canEdit() && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/wiki/${page.slug}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              <span>Por {page.author?.name || 'Anónimo'}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>Actualizado {formatDate(page.updated_at)}</span>
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              <span>{page.view_count} visitas</span>
            </div>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{page.comment_count} comentarios</span>
            </div>
          </div>

          {/* Tags */}
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {page.tags.map((tag) => (
                <Link key={tag.id} href={`/wiki/tag/${tag.slug}`}>
                  <Badge 
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200"
                    style={tag.color ? { 
                      backgroundColor: tag.color + '20', 
                      borderColor: tag.color 
                    } : {}}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Separator className="mb-8" />

        {/* Content */}
        <Card>
          <CardContent className="prose prose-lg max-w-none py-8">
            {page.content_type === 'markdown' ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {page.content}
              </ReactMarkdown>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: page.content }} />
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/wiki/${page.slug}/history`)}
          >
            <History className="h-4 w-4 mr-2" />
            Ver historial
          </Button>
        </div>

        {/* Related Pages Section */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Páginas relacionadas</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Próximamente...</p>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Comentarios ({page.comment_count})</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Sistema de comentarios próximamente...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}