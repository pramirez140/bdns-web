'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  grantId: number
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function FavoriteButton({ grantId, className, size = 'default' }: FavoriteButtonProps) {
  const { data: session } = useSession()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      if (session) {
        try {
          const response = await fetch(`/api/favorites/check?grantIds=${grantId}`)
          if (response.ok) {
            const data = await response.json()
            setIsFavorite(data.favorited[grantId] || false)
          }
        } catch (error) {
          console.error('Error checking favorite status:', error)
        }
      }
    }

    checkStatus()
  }, [session, grantId])


  const toggleFavorite = async () => {
    if (!session) {
      // Redirect to login
      window.location.href = `/auth/signin?callbackUrl=${window.location.pathname}`
      return
    }

    setLoading(true)
    try {
      if (isFavorite) {
        const response = await fetch(`/api/favorites?grantId=${grantId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFavorite(false)
        }
      } else {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grantId }),
        })
        if (response.ok) {
          setIsFavorite(true)
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFavorite}
      disabled={loading}
      className={cn(
        sizeClasses[size],
        'hover:bg-red-50',
        className
      )}
      title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-colors',
          isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'
        )}
      />
    </Button>
  )
}