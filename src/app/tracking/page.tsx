'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ClipboardList, Search, Filter, ExternalLink, Calendar, Euro, Building, 
  Loader2, AlertCircle, FileText, Bell, CheckCircle, XCircle, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface TrackedGrant {
  id: string
  grantId: number
  status: 'interested' | 'applying' | 'applied' | 'awarded' | 'rejected'
  applicationDeadline: string | null
  notes: string | null
  documents: any[]
  reminders: any[]
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

const statusConfig = {
  interested: { label: 'Interesado', color: 'bg-blue-100 text-blue-800', icon: Clock },
  applying: { label: 'Preparando solicitud', color: 'bg-yellow-100 text-yellow-800', icon: FileText },
  applied: { label: 'Solicitado', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  awarded: { label: 'Concedido', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function TrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trackedGrants, setTrackedGrants] = useState<TrackedGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingGrant, setEditingGrant] = useState<TrackedGrant | null>(null)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editNotes, setEditNotes] = useState('')
  const [editDeadline, setEditDeadline] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/tracking')
    } else if (status === 'authenticated') {
      fetchTrackedGrants()
    }
  }, [status, router])

  const fetchTrackedGrants = async () => {
    try {
      const response = await fetch('/api/tracking')
      if (response.ok) {
        const data = await response.json()
        setTrackedGrants(data.tracking)
      }
    } catch (error) {
      console.error('Error fetching tracked grants:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTracking = async () => {
    if (!editingGrant) return

    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: editingGrant.grantId,
          status: editStatus,
          notes: editNotes,
          applicationDeadline: editDeadline || null,
        }),
      })

      if (response.ok) {
        fetchTrackedGrants()
        setEditingGrant(null)
      }
    } catch (error) {
      console.error('Error updating tracking:', error)
    }
  }

  const removeTracking = async (grantId: number) => {
    try {
      const response = await fetch(`/api/tracking?grantId=${grantId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setTrackedGrants(trackedGrants.filter(t => t.grantId !== grantId))
      }
    } catch (error) {
      console.error('Error removing tracking:', error)
    }
  }

  const filteredGrants = trackedGrants.filter(tracked => {
    const matchesSearch = 
      tracked.grant.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tracked.grant.organoConvocante.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tracked.notes && tracked.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = selectedStatus === 'all' || tracked.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Seguimiento de Convocatorias</h1>
          <p className="text-gray-600 mt-1">
            Gestiona el estado de tus solicitudes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = trackedGrants.filter(g => g.status === status).length
          return (
            <div key={status} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <config.icon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">{config.label}</h3>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar en seguimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grants List */}
      {filteredGrants.length === 0 ? (
        <Alert>
          <AlertDescription>
            {trackedGrants.length === 0 
              ? 'No tienes convocatorias en seguimiento.'
              : 'No se encontraron convocatorias que coincidan con tu búsqueda.'
            }
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {filteredGrants.map((tracked) => {
            const StatusIcon = statusConfig[tracked.status].icon
            return (
              <div
                key={tracked.id}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {tracked.grant.titulo}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {tracked.grant.organoConvocante}
                        </span>
                        <span className="flex items-center">
                          <Euro className="h-4 w-4 mr-1" />
                          {formatCurrency(tracked.grant.presupuestoTotal)}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      className={`${statusConfig[tracked.status].color} flex items-center gap-1`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig[tracked.status].label}
                    </Badge>
                  </div>

                  {tracked.applicationDeadline && (
                    <div className="bg-yellow-50 rounded p-3 flex items-center text-sm">
                      <Bell className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-yellow-800">
                        Fecha límite personal: {formatDate(tracked.applicationDeadline)}
                      </span>
                    </div>
                  )}

                  {tracked.notes && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-600">{tracked.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGrant(tracked)
                        setEditStatus(tracked.status)
                        setEditNotes(tracked.notes || '')
                        setEditDeadline(tracked.applicationDeadline || '')
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Editar seguimiento
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/convocatoria/${tracked.grantId}`)}
                    >
                      Ver detalles
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => removeTracking(tracked.grantId)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingGrant} onOpenChange={() => setEditingGrant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar seguimiento</DialogTitle>
            <DialogDescription>
              Actualiza el estado y la información de seguimiento de esta convocatoria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="deadline">Fecha límite personal</Label>
              <Input
                id="deadline"
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Añade notas sobre el progreso de tu solicitud..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGrant(null)}>
              Cancelar
            </Button>
            <Button onClick={updateTracking}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}