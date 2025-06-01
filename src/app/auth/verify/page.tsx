'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { update } = useSession()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async (verificationToken: string) => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verificationToken }),
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage('¡Tu email ha sido verificado exitosamente!')
          
          // Update the session to reflect email verification
          if (update) {
            await update({
              user: {
                emailVerified: true
              }
            })
          }
          
          setTimeout(() => {
            router.push('/auth/signin')
          }, 3000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Error al verificar el email')
        }
      } catch (error) {
        setStatus('error')
        setMessage('Error al verificar el email')
      }
    }

    if (!token) {
      setStatus('error')
      setMessage('Token de verificación no encontrado')
      return
    }

    verifyEmail(token)
  }, [token, router])

  const handleResendVerification = async () => {
    if (!resendEmail) {
      setResendMessage('Por favor, introduce tu email')
      return
    }

    setResendLoading(true)
    setResendMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setResendMessage('Email de verificación enviado exitosamente. Revisa tu bandeja de entrada.')
        setShowResendForm(false)
        setResendEmail('')
      } else {
        setResendMessage(data.error || 'Error enviando el email')
      }
    } catch (error) {
      setResendMessage('Error enviando el email de verificación')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-bdns-blue" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Verificando tu email...
              </h2>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                ¡Email verificado!
              </h2>
              <Alert className="mt-4 border-green-500 bg-green-50">
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
              <p className="mt-4 text-sm text-gray-600">
                Redirigiendo al inicio de sesión...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-red-600" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Error de verificación
              </h2>
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>

              {/* Resend verification section */}
              {!showResendForm ? (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-4">
                    ¿Tu enlace de verificación expiró o no funciona?
                  </p>
                  <Button 
                    onClick={() => setShowResendForm(true)}
                    variant="outline" 
                    className="w-full mb-3"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Reenviar email de verificación
                  </Button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="resend-email">Email</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  {resendMessage && (
                    <Alert className={resendMessage.includes('exitosamente') ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                      <AlertDescription className={resendMessage.includes('exitosamente') ? 'text-green-800' : 'text-red-800'}>
                        {resendMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="flex-1"
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar'
                      )}
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowResendForm(false)
                        setResendMessage('')
                        setResendEmail('')
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    Ir a inicio de sesión
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">
                    Crear nueva cuenta
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}