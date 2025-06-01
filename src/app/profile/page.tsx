'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '@/components/ui/alert'
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Shield, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  })
  
  // Email change state
  const [emailChangeData, setEmailChangeData] = useState({
    newEmail: '',
    verificationCode: '',
  })
  const [emailChangeStep, setEmailChangeStep] = useState<'request' | 'verify' | null>(null)
  const [emailChangeExpiry, setEmailChangeExpiry] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loadingTwoFactor, setLoadingTwoFactor] = useState(false)
  
  // Email verification resend state
  const [resendingVerification, setResendingVerification] = useState(false)

  // Load user data
  useEffect(() => {
    if (session?.user) {
      setProfileData({
        name: session.user.name || '',
        email: session.user.email || '',
      })
      // Load 2FA status
      fetch('/api/profile/2fa')
        .then(res => res.json())
        .then(data => {
          if (data.enabled) {
            setTwoFactorEnabled(data.enabled)
          }
        })
        .catch(console.error)
    }
  }, [session])

  // Redirect if not authenticated
  useEffect(() => {
    if (!session && session !== undefined) {
      router.push('/auth/signin')
    }
  }, [session, router])

  // Countdown effect
  useEffect(() => {
    if (resendCountdown > 0) {
      countdownInterval.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
    }
  }, [resendCountdown])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (response.ok) {
        // Update the session with new name
        await update({
          user: {
            name: profileData.name
          }
        })
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' })
        // Don't revert the form data - keep the new value
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar el perfil' })
        // Revert on error
        if (session?.user) {
          setProfileData({
            name: session.user.name || '',
            email: session.user.email || '',
          })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: emailChangeData.newEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setEmailChangeStep('verify')
        setEmailChangeExpiry(data.expiresAt)
        setMessage({ type: 'success', text: data.message })
        setResendCountdown(30) // Start 30 second countdown
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al solicitar el cambio de email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChangeVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: emailChangeData.verificationCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setEmailChangeStep(null)
        setEmailChangeData({ newEmail: '', verificationCode: '' })
        // Sign out after email change for security
        setTimeout(async () => {
          await signOut({ redirect: true, callbackUrl: '/auth/signin?message=email-changed' })
        }, 2000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al verificar el cambio de email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChangeCancel = async () => {
    setLoading(true)
    try {
      await fetch('/api/profile/email', { method: 'DELETE' })
      setEmailChangeStep(null)
      setEmailChangeData({ newEmail: '', verificationCode: '' })
      setMessage({ type: 'success', text: 'Cambio de email cancelado' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cancelar el cambio' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al cambiar la contraseña' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactorToggle = async () => {
    setLoadingTwoFactor(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !twoFactorEnabled }),
      })

      const data = await response.json()

      if (response.ok) {
        setTwoFactorEnabled(!twoFactorEnabled)
        setMessage({ 
          type: 'success', 
          text: twoFactorEnabled 
            ? 'Autenticación de dos factores desactivada' 
            : 'Autenticación de dos factores activada. Recibirás un código por email en cada inicio de sesión.'
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al cambiar la configuración 2FA' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor' })
    } finally {
      setLoadingTwoFactor(false)
    }
  }

  const handleResendVerification = async () => {
    if (!session?.user?.email) return

    setResendingVerification(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email de verificación enviado. Revisa tu bandeja de entrada.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error enviando el email de verificación' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error enviando el email de verificación' })
    } finally {
      setResendingVerification(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">Administra tu información personal y configuración de seguridad</p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Información Personal</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Actividad</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Información Personal</h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="pl-10"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  {emailChangeStep === null ? (
                    <>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          className="pl-10 bg-gray-50"
                          disabled
                        />
                      </div>
                      
                      {/* Email verification status - only show when NOT verified */}
                      {!session?.user?.emailVerified && (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span className="text-sm text-amber-600">Email no verificado</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResendVerification}
                            disabled={resendingVerification}
                            className="text-xs"
                          >
                            {resendingVerification ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              'Reenviar verificación'
                            )}
                          </Button>
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEmailChangeStep('request')}
                        className="mt-2"
                      >
                        Cambiar email
                      </Button>
                    </>
                  ) : emailChangeStep === 'request' ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          value={emailChangeData.newEmail}
                          onChange={(e) => setEmailChangeData({ ...emailChangeData, newEmail: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && emailChangeData.newEmail) {
                              e.preventDefault()
                              handleEmailChangeRequest(e as any)
                            }
                          }}
                          className="pl-10"
                          placeholder="Nuevo email"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          disabled={loading || !emailChangeData.newEmail}
                          onClick={(e) => {
                            e.preventDefault()
                            handleEmailChangeRequest(e as any)
                          }}
                        >
                          {loading ? 'Enviando...' : 'Enviar código'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmailChangeStep(null)
                            setEmailChangeData({ newEmail: '', verificationCode: '' })
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Se ha enviado un código de verificación a tu email actual.
                      </p>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          value={emailChangeData.verificationCode}
                          onChange={(e) => setEmailChangeData({ ...emailChangeData, verificationCode: e.target.value })}
                          className="pl-10 text-center text-2xl tracking-widest"
                          placeholder="000000"
                          maxLength={6}
                          pattern="[0-9]{6}"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          disabled={loading || emailChangeData.verificationCode.length !== 6}
                          onClick={(e) => {
                            e.preventDefault()
                            handleEmailChangeVerify(e as any)
                          }}
                        >
                          {loading ? 'Verificando...' : 'Verificar código'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEmailChangeCancel}
                          disabled={loading}
                        >
                          Cancelar cambio
                        </Button>
                      </div>
                      {emailChangeExpiry && (
                        <p className="text-xs text-gray-500">
                          El código expira en {new Date(emailChangeExpiry).toLocaleTimeString('es-ES')}
                        </p>
                      )}
                      
                      {/* Resend code */}
                      <div className="flex items-center justify-center mt-4">
                        {resendCountdown > 0 ? (
                          <p className="text-sm text-gray-500">
                            Reenviar código en <span className="font-semibold">{resendCountdown}s</span>
                          </p>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              handleEmailChangeRequest(e as any)
                            }}
                            className="flex items-center gap-2 text-bdns-blue hover:text-blue-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Reenviar código
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Cambiar Contraseña</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña actual</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-sm text-gray-500">Mínimo 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Actualizar contraseña
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            {/* 2FA Section */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-4">Autenticación de dos factores (2FA)</h3>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">Verificación por email</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Recibe un código de verificación en tu email cada vez que inicies sesión
                    </p>
                  </div>
                  <div className="ml-4">
                    <Button
                      variant={twoFactorEnabled ? "destructive" : "default"}
                      size="sm"
                      onClick={handleTwoFactorToggle}
                      disabled={loadingTwoFactor}
                    >
                      {loadingTwoFactor ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : twoFactorEnabled ? (
                        'Desactivar'
                      ) : (
                        'Activar'
                      )}
                    </Button>
                  </div>
                </div>
                
                {twoFactorEnabled && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      <Shield className="inline h-4 w-4 mr-1" />
                      2FA activo: Se requiere código de verificación para iniciar sesión
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Actividad Reciente</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="font-medium">Cuenta creada</p>
                <p className="text-sm text-gray-500">
                  {session.user?.createdAt ? 
                    new Date(session.user.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 
                    'Fecha no disponible'
                  }
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <p className="font-medium">Email verificado</p>
                <p className="text-sm text-gray-500">
                  {session.user?.emailVerified ? 
                    'Verificado' : 
                    'Pendiente de verificación'
                  }
                </p>
              </div>
              
              <div className="border-l-4 border-gray-300 pl-4 py-2">
                <p className="font-medium">Última sesión</p>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}