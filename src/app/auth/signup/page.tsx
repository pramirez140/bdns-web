'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Mail, Lock, User, Building, Phone, AlertCircle, CheckCircle } from 'lucide-react'

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  organizationName: z.string().optional(),
  organizationType: z.string().optional(),
  phone: z.string().optional(),
  province: z.string().optional(),
  sector: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type SignupForm = z.infer<typeof signupSchema>

const organizationTypes = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'autonomo', label: 'Autónomo' },
  { value: 'asociacion', label: 'Asociación' },
  { value: 'fundacion', label: 'Fundación' },
  { value: 'universidad', label: 'Universidad' },
  { value: 'investigacion', label: 'Centro de Investigación' },
  { value: 'otro', label: 'Otro' },
]

const sectors = [
  { value: 'tecnologia', label: 'Tecnología e I+D+i' },
  { value: 'salud', label: 'Salud y Bienestar' },
  { value: 'educacion', label: 'Educación y Formación' },
  { value: 'industria', label: 'Industria y Manufactura' },
  { value: 'comercio', label: 'Comercio y Servicios' },
  { value: 'agricultura', label: 'Agricultura y Ganadería' },
  { value: 'turismo', label: 'Turismo y Hostelería' },
  { value: 'cultura', label: 'Cultura y Arte' },
  { value: 'social', label: 'Acción Social' },
  { value: 'medioambiente', label: 'Medio Ambiente' },
  { value: 'energia', label: 'Energía y Sostenibilidad' },
  { value: 'transporte', label: 'Transporte y Logística' },
  { value: 'otro', label: 'Otro' },
]

const provinces = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona',
  'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba',
  'A Coruña', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Gipuzkoa', 'Huelva',
  'Huesca', 'Illes Balears', 'Jaén', 'León', 'Lleida', 'Lugo', 'Madrid', 'Málaga',
  'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Las Palmas', 'Pontevedra', 'La Rioja',
  'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria', 'Tarragona',
  'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Bizkaia', 'Zamora', 'Zaragoza',
  'Ceuta', 'Melilla'
].map(province => ({ value: province.toLowerCase().replace(/\s+/g, '-'), label: province }))

function SignUpForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al crear la cuenta')
      } else {
        setSuccess(true)
      }
    } catch (error) {
      setError('Ocurrió un error al crear la cuenta')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta creada!</h2>
            <p className="text-gray-600 mb-6">
              Tu cuenta se ha creado exitosamente. 
            </p>
            <div className="space-y-4">
              <Link href="/auth/signin">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                  Ir a iniciar sesión
                </button>
              </Link>
              <p className="text-xs text-gray-500">
                En modo desarrollo: Revisa la consola del servidor para el enlace de verificación
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left side - Branding */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white hidden md:flex flex-col justify-center">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Únete a BDNS Web</h1>
                  <p className="text-blue-100 text-lg">La plataforma más completa para gestionar subvenciones españolas</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                    <span>Acceso a +500k convocatorias</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                    <span>Sistema de favoritos inteligente</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-pink-300 rounded-full"></div>
                    <span>Alertas personalizadas por email</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    <span>Seguimiento de aplicaciones</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Crear cuenta
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">¿Ya tienes cuenta?</span>
                  <Link href="/auth/signin">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 hover:border-blue-300">
                      Inicia sesión
                    </button>
                  </Link>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-6">
                  {/* Información Personal */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">Datos personales</h3>
                    
                    <div>
                      <Label htmlFor="name">Nombre completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          type="text"
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Tu nombre completo"
                          {...register('name')}
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="nombre@empresa.com"
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password">Contraseña *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          type="password"
                          autoComplete="new-password"
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Mínimo 8 caracteres"
                          {...register('password')}
                        />
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Repite la contraseña"
                          {...register('confirmPassword')}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Información de Organización */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">Información opcional</h3>
                    
                    <div>
                      <Label htmlFor="organizationName">Nombre de organización</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="organizationName"
                          type="text"
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Nombre de tu empresa u organización"
                          {...register('organizationName')}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="organizationType">Tipo de organización</Label>
                      <Select onValueChange={(value: string) => setValue('organizationType', value)}>
                        <SelectTrigger className="w-full border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 h-11">
                          <SelectValue placeholder="Selecciona tu tipo de organización" className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-white border border-gray-300 shadow-lg rounded-md z-50">
                          {organizationTypes.map((type) => (
                            <SelectItem 
                              key={type.value} 
                              value={type.value} 
                              className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 text-gray-900 px-3 py-2"
                            >
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sector">Sector de actividad</Label>
                      <Select onValueChange={(value: string) => setValue('sector', value)}>
                        <SelectTrigger className="w-full border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 h-11">
                          <SelectValue placeholder="¿En qué sector trabajas?" className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-white border border-gray-300 shadow-lg rounded-md z-50">
                          {sectors.map((sector) => (
                            <SelectItem 
                              key={sector.value} 
                              value={sector.value} 
                              className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 text-gray-900 px-3 py-2"
                            >
                              {sector.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="600 123 456"
                          {...register('phone')}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="province">Provincia</Label>
                      <Select onValueChange={(value: string) => setValue('province', value)}>
                        <SelectTrigger className="w-full border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 h-11">
                          <SelectValue placeholder="Selecciona tu provincia" className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-white border border-gray-300 shadow-lg rounded-md z-50">
                          {provinces.map((province) => (
                            <SelectItem 
                              key={province.value} 
                              value={province.value} 
                              className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 text-gray-900 px-3 py-2"
                            >
                              {province.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando cuenta...
                        </>
                      ) : (
                        'Crear cuenta gratuita'
                      )}
                    </button>

                    <p className="text-center text-xs text-gray-500">
                      Al registrarte, aceptas nuestros{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                        términos
                      </Link>{' '}
                      y{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                        política de privacidad
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}