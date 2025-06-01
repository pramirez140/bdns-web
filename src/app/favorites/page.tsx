'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Heart, Search, Filter, ExternalLink, Calendar, Euro, Building, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Favorite {
  id: string
  grantId: number
  notes: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  grant: {
    id: number
    titulo: string
    organoConvocante: string
    tipoBeneficiario: string[]
    tipoConvocatoria: string
    presupuestoTotal: number
    fechaPublicacion: string
    fechaFinSolicitud: string | null
    urlConvocatoria: string | null
  }
}

export default function FavoritesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/favorites')
    } else if (status === 'authenticated') {
      fetchFavorites()
    }
  }, [status, router])

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites)
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (grantId: number) => {
    try {
      const response = await fetch(`/api/favorites?grantId=${grantId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setFavorites(favorites.filter(f => f.grantId !== grantId))
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  const updateFavorite = async () => {
    if (!editingFavorite) return

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: editingFavorite.grantId,
          notes: editNotes,
          tags: editTags,
        }),
      })

      if (response.ok) {
        fetchFavorites()
        setEditingFavorite(null)
      }
    } catch (error) {
      console.error('Error updating favorite:', error)
    }
  }

  const filteredFavorites = favorites.filter(favorite => {
    const matchesSearch = 
      favorite.grant.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      favorite.grant.organoConvocante.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (favorite.notes && favorite.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => favorite.tags.includes(tag))
    
    return matchesSearch && matchesTags
  })

  const allTags = Array.from(new Set(favorites.flatMap(f => f.tags)))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-bdns-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Favoritos</h1>
          <p className="text-gray-600 mt-1">
            {favorites.length} convocatoria{favorites.length !== 1 ? 's' : ''} guardada{favorites.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar en favoritos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Etiquetas:</span>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag))
                  } else {
                    setSelectedTags([...selectedTags, tag])
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Favorites List */}
      {filteredFavorites.length === 0 ? (
        <Alert>
          <AlertDescription>
            {favorites.length === 0 
              ? 'No tienes convocatorias guardadas en favoritos.'
              : 'No se encontraron favoritos que coincidan con tu búsqueda.'
            }
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFavorites.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                    {favorite.grant.titulo}
                  </h3>
                  <button
                    onClick={() => removeFavorite(favorite.grantId)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Building className="h-4 w-4 mr-2" />
                    <span className="truncate">{favorite.grant.organoConvocante}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Euro className="h-4 w-4 mr-2" />
                    <span>{formatCurrency(favorite.grant.presupuestoTotal)}</span>
                  </div>

                  {favorite.grant.fechaFinSolicitud && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Cierra: {formatDate(favorite.grant.fechaFinSolicitud)}</span>
                    </div>
                  )}
                </div>

                {favorite.notes && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">{favorite.notes}</p>
                  </div>
                )}

                {favorite.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {favorite.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingFavorite(favorite)
                      setEditNotes(favorite.notes || '')
                      setEditTags(favorite.tags)
                    }}
                  >
                    Editar notas
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/convocatoria/${favorite.grantId}`)}
                  >
                    Ver detalles
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFavorite} onOpenChange={() => setEditingFavorite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar notas y etiquetas</DialogTitle>
            <DialogDescription>
              Añade notas personales y etiquetas para organizar mejor tus favoritos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Añade notas sobre esta convocatoria..."
                className="mt-1"
                rows={4}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Etiquetas</label>
              <Input
                value={editTags.join(', ')}
                onChange={(e) => setEditTags(e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                placeholder="Separa las etiquetas con comas"
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFavorite(null)}>
              Cancelar
            </Button>
            <Button onClick={updateFavorite}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}