'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, Heart, Settings, LogOut, ChevronDown, Bell } from 'lucide-react'

export function Navbar() {
  const { data: session, status } = useSession()

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/' })
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-bdns-blue">BDNS Web</h1>
              <span className="ml-2 text-sm text-gray-500">
                Base de Datos Nacional de Subvenciones
              </span>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/?tab=search"
              className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
            >
              Búsqueda
            </Link>
            
            <Link
              href="/wiki"
              className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
            >
              Wiki
            </Link>
            
            {session && (
              <>
                <Link
                  href="/favorites"
                  className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
                >
                  Favoritos
                </Link>
                <Link
                  href="/tracking"
                  className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
                >
                  Seguimiento
                </Link>
              </>
            )}
            
            <Link
              href="/?tab=sync"
              className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
            >
              Gestión de Datos
            </Link>
            
            <Link
              href="/expedientes"
              className="text-gray-700 hover:text-bdns-blue px-3 py-2 rounded-md text-sm font-medium"
            >
              Expedientes
            </Link>

            <div className="flex items-center space-x-3 ml-4 pl-4 border-l">
              {status === 'loading' ? (
                <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
              ) : session ? (
                <>
                  <button className="relative p-2 text-gray-600 hover:text-gray-900">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                  </button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-bdns-blue text-white flex items-center justify-center">
                          {session.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium">{session.user?.name}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{session.user?.name}</p>
                          <p className="text-xs text-gray-500">{session.user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Mi Perfil</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/favorites" className="flex items-center cursor-pointer">
                          <Heart className="mr-2 h-4 w-4" />
                          <span>Mis Favoritos</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="flex items-center cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Configuración</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="flex items-center cursor-pointer text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar sesión</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/auth/signin">
                    <Button variant="ghost" size="sm">
                      Iniciar sesión
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm">
                      Registrarse
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}