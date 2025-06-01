'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, AlertCircle, Shield } from 'lucide-react'

const signinSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

const twoFASchema = z.object({
  verificationCode: z.string().min(6, 'El código debe tener 6 dígitos').max(6, 'El código debe tener 6 dígitos'),
})

type SigninForm = z.infer<typeof signinSchema>
type TwoFAForm = z.infer<typeof twoFASchema>

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string>('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninForm>({
    resolver: zodResolver(signinSchema),
  })

  const {
    register: register2FA,
    handleSubmit: handleSubmit2FA,
    formState: { errors: errors2FA },
    setValue: setValue2FA,
    watch: watch2FA,
  } = useForm<TwoFAForm>({
    resolver: zodResolver(twoFASchema),
  })

  // Countdown effect for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      countdownInterval.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            if (countdownInterval.current) {
              clearInterval(countdownInterval.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
    }
  }, [resendCountdown])

  const onSubmit = async (data: SigninForm) => {
    setIsLoading(true)
    setError(null)

    try {
      // First, check if user has 2FA enabled by attempting to send code
      const twoFAResponse = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      if (twoFAResponse.status === 404) {
        setError('Usuario no encontrado')
        setIsLoading(false)
        return
      }

      if (twoFAResponse.ok) {
        // User has 2FA enabled, verify credentials first
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Email o contraseña incorrectos')
        } else {
          // Credentials are correct, proceed with 2FA
          setPendingEmail(data.email)
          setShow2FA(true)
          setResendCountdown(30)
        }
      } else {
        // User doesn't have 2FA enabled, proceed with normal login
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Email o contraseña incorrectos')
        } else {
          router.push(callbackUrl)
          router.refresh()
        }
      }
    } catch (error) {
      setError('Ocurrió un error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl })
  }

  const onSubmit2FA = async (data: TwoFAForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail,
          code: data.verificationCode,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Código de verificación inválido')
      } else {
        // 2FA verified, complete the signin
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setError('Error verificando el código')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend2FA = async () => {
    if (resendCountdown > 0) return

    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      })

      if (response.ok) {
        setResendCountdown(30)
        setError(null)
      } else {
        setError('Error reenviando el código')
      }
    } catch (error) {
      setError('Error reenviando el código')
    }
  }

  const handleBack = () => {
    setShow2FA(false)
    setPendingEmail('')
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = watch2FA('verificationCode')
      if (code && code.length === 6) {
        handleSubmit2FA(onSubmit2FA)()
      }
    }
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
                  <h1 className="text-3xl font-bold mb-2">
                    {show2FA ? 'Verificación 2FA' : 'Bienvenido de vuelta'}
                  </h1>
                  <p className="text-blue-100 text-lg">
                    {show2FA ? 'Confirma tu identidad' : 'Accede a tu cuenta de BDNS Web'}
                  </p>
                </div>
                <div className="space-y-4">
                  {show2FA ? (
                    <>
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-blue-300" />
                        <span>Autenticación de dos factores</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-purple-300" />
                        <span>Código enviado por email</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Lock className="w-5 h-5 text-pink-300" />
                        <span>Máxima seguridad</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                        <span>Gestiona tus favoritos</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                        <span>Sigue el estado de tus solicitudes</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-pink-300 rounded-full"></div>
                        <span>Recibe alertas personalizadas</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                        <span>Acceso completo a la plataforma</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="p-8">
              {!show2FA ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Iniciar sesión
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">¿No tienes cuenta?</span>
                      <Link href="/auth/signup">
                        <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 hover:border-blue-300">
                          Crear cuenta
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

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="tu@email.com"
                            {...register('email')}
                          />
                        </div>
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="••••••••"
                            {...register('password')}
                          />
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <div className="text-sm">
                        <Link
                          href="/auth/forgot-password"
                          className="font-medium text-blue-600 hover:text-blue-500"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
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
                            Iniciando sesión...
                          </>
                        ) : (
                          'Iniciar sesión'
                        )}
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-white px-4 text-gray-500">O continúa con</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={handleGoogleSignIn}
                      >
                        <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continuar con Google
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  {/* 2FA Form */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Verificación 2FA
                    </h2>
                    <p className="text-gray-600">
                      Hemos enviado un código de verificación a <strong>{pendingEmail}</strong>
                    </p>
                    <button
                      onClick={handleBack}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-500"
                    >
                      ← Volver al login
                    </button>
                  </div>

                  <div className="space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <Label htmlFor="verificationCode">Código de verificación</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="verificationCode"
                          type="text"
                          maxLength={6}
                          className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-center text-lg font-mono"
                          placeholder="123456"
                          onKeyDown={handleKeyDown}
                          {...register2FA('verificationCode')}
                        />
                      </div>
                      {errors2FA.verificationCode && (
                        <p className="mt-1 text-sm text-red-600">{errors2FA.verificationCode.message}</p>
                      )}
                    </div>

                    <div className="text-center">
                      <button
                        onClick={handleSubmit2FA(onSubmit2FA)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          'Verificar código'
                        )}
                      </button>

                      <div className="text-sm text-gray-600">
                        ¿No recibiste el código?{' '}
                        <button
                          onClick={handleResend2FA}
                          disabled={resendCountdown > 0}
                          className="text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {resendCountdown > 0 ? `Reenviar en ${resendCountdown}s` : 'Reenviar código'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}