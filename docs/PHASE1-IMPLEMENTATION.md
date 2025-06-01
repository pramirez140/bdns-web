# Phase 1 Technical Implementation Guide

## Overview

This document provides detailed technical implementation steps for Phase 1 (Months 1-3) of the BDNS Web improvement plan, focusing on user authentication, enhanced grant tracking, basic analytics, and the new priority: Centro de Documentación Web.

## 📚 NUEVA PRIORIDAD: Centro de Documentación Web

### Implementar sección `/docs` en la aplicación web

**Objetivo**: Crear un centro de documentación integrado en la aplicación que permita a usuarios y desarrolladores acceder fácilmente a toda la información técnica.

#### Funcionalidades Requeridas:

1. **Documentación de API Interactiva**
   - Integración con Swagger/OpenAPI 3.0
   - Explorador de API en tiempo real
   - Ejemplos de código automáticos
   - Pruebas de endpoints desde la UI

2. **Guías de Usuario Paso a Paso**
   - Tutorial de inicio para nuevos usuarios
   - Guías de búsqueda avanzada
   - Gestión de favoritos y notificaciones
   - Configuración de cuenta y 2FA

3. **Documentación Técnica**
   - Arquitectura del sistema
   - Guías de integración
   - Referencia de base de datos
   - Ejemplos de casos de uso

4. **Sistema de Navegación**
   - Búsqueda dentro de la documentación
   - Categorización por nivel (Principiante/Intermedio/Avanzado)
   - Índice interactivo
   - Breadcrumbs y navegación lateral

#### Estructura Propuesta:

```
/docs
├── /api                    # Documentación API interactiva
│   ├── overview           # Introducción a la API
│   ├── authentication    # Autenticación y autorización
│   ├── endpoints         # Referencia completa de endpoints
│   └── examples          # Ejemplos de integración
├── /guides               # Guías de usuario
│   ├── getting-started   # Tutorial inicial
│   ├── search           # Búsqueda avanzada
│   ├── account          # Gestión de cuenta
│   └── notifications    # Sistema de notificaciones
├── /technical           # Documentación técnica
│   ├── architecture     # Arquitectura del sistema
│   ├── database         # Estructura de BD
│   ├── deployment       # Guías de despliegue
│   └── integration      # Integraciones
└── /faq                # Preguntas frecuentes
```

#### Tecnologías Sugeridas:

- **Swagger UI**: Para documentación de API
- **MDX**: Para contenido enriquecido con componentes React
- **Nextra** o **Docusaurus**: Framework de documentación
- **Algolia DocSearch**: Búsqueda avanzada en docs

#### Beneficios:

- ✅ **Mejor adopción**: Usuarios entienden mejor el sistema
- ✅ **Soporte reducido**: Menos consultas por documentación
- ✅ **Desarrollo más rápido**: Desarrolladores encuentran info fácilmente
- ✅ **API más usable**: Explorador interactivo facilita integración

## 1. User Authentication System

### 1.1 Technology Stack

**Core Dependencies**:
```json
{
  "next-auth": "^5.0.0",
  "bcryptjs": "^2.4.3",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0",
  "jsonwebtoken": "^9.0.0",
  "nodemailer": "^6.9.0",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.0"
}
```

### 1.2 Database Schema Updates

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'consultancy', 'company', 'nonprofit'
  tax_id VARCHAR(50),
  logo_url VARCHAR(500),
  website VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Organization relationships
CREATE TABLE user_organizations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, organization_id)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  scopes TEXT[], -- ['read:grants', 'write:favorites', etc.]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

### 1.3 NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organizations: true }
        });

        if (!user || !await bcrypt.compare(credentials.password, user.passwordHash)) {
          throw new Error('Invalid credentials');
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizations: user.organizations
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizations = user.organizations;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizations = token.organizations;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user'
  }
};
```

### 1.4 Authentication API Routes

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import { generateToken } from '@/lib/tokens';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, organizationName } = await request.json();

    // Validation
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and organization in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'client'
        }
      });

      // Create organization if provided
      if (organizationName) {
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
            type: 'company'
          }
        });

        // Link user to organization
        await tx.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: 'owner'
          }
        });
      }

      // Create verification token
      const verificationToken = generateToken();
      await tx.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      return user;
    });

    return NextResponse.json({
      message: 'User created successfully. Please check your email to verify your account.',
      userId: result.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### 1.5 Two-Factor Authentication

```typescript
// src/app/api/auth/2fa/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `BDNS Web (${session.user.email})`,
      issuer: 'BDNS Web'
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false
      }
    });

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

// Verify and enable 2FA
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { token } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: 'No 2FA secret found' },
        { status: 400 }
      );
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled: true }
    });

    return NextResponse.json({ message: '2FA enabled successfully' });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
```

## 2. Enhanced Grant Tracking & Favorites

### 2.1 Database Schema

```sql
-- User favorites
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  convocatoria_id INTEGER REFERENCES convocatorias(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES favorite_folders(id) ON DELETE SET NULL,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, convocatoria_id)
);

-- Favorite folders
CREATE TABLE favorite_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7), -- Hex color
  icon VARCHAR(50),
  parent_id UUID REFERENCES favorite_folders(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant tracking
CREATE TABLE grant_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  convocatoria_id INTEGER REFERENCES convocatorias(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- 'interested', 'preparing', 'submitted', 'approved', 'rejected'
  reminder_date TIMESTAMP,
  application_date TIMESTAMP,
  decision_date TIMESTAMP,
  amount_requested DECIMAL(15,2),
  amount_approved DECIMAL(15,2),
  custom_fields JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, convocatoria_id)
);

-- Grant documents
CREATE TABLE grant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID REFERENCES grant_tracking(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'application', 'supporting', 'result'
  file_url VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'deadline', 'status_change', 'new_grant'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly'
  deadline_reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1],
  new_grants_matching BOOLEAN DEFAULT TRUE,
  status_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_folder_id ON user_favorites(folder_id);
CREATE INDEX idx_grant_tracking_user_id ON grant_tracking(user_id);
CREATE INDEX idx_grant_tracking_status ON grant_tracking(status);
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, read);
```

### 2.2 Favorites API

```typescript
// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Get user's favorites
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId');

    const favorites = await prisma.userFavorite.findMany({
      where: {
        userId: session.user.id,
        ...(folderId && { folderId })
      },
      include: {
        convocatoria: {
          select: {
            id: true,
            codigo_bdns: true,
            titulo: true,
            desc_organo: true,
            fecha_fin_solicitud: true,
            importe_total: true
          }
        },
        folder: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get folders
    const folders = await prisma.favoriteFolder.findMany({
      where: { userId: session.user.id },
      orderBy: { orderIndex: 'asc' }
    });

    return NextResponse.json({
      favorites,
      folders
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { error: 'Failed to get favorites' },
      { status: 500 }
    );
  }
}

// Add to favorites
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { convocatoriaId, folderId, notes, tags } = await request.json();

    const favorite = await prisma.userFavorite.create({
      data: {
        userId: session.user.id,
        convocatoriaId,
        folderId,
        notes,
        tags
      },
      include: {
        convocatoria: true,
        folder: true
      }
    });

    // Create notification
    await createNotification(session.user.id, {
      type: 'favorite_added',
      title: 'Grant added to favorites',
      message: `You've added "${favorite.convocatoria.titulo}" to your favorites`
    });

    return NextResponse.json(favorite);

  } catch (error) {
    console.error('Add favorite error:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

// Remove from favorites
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { convocatoriaId } = await request.json();

    await prisma.userFavorite.delete({
      where: {
        userId_convocatoriaId: {
          userId: session.user.id,
          convocatoriaId
        }
      }
    });

    return NextResponse.json({ message: 'Removed from favorites' });

  } catch (error) {
    console.error('Remove favorite error:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
```

### 2.3 Grant Tracking Components

```typescript
// src/components/grants/GrantTracker.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface GrantTrackerProps {
  convocatoriaId: number;
  initialTracking?: GrantTracking;
}

const TRACKING_STATUSES = [
  { value: 'interested', label: 'Interested', color: 'blue' },
  { value: 'preparing', label: 'Preparing', color: 'yellow' },
  { value: 'submitted', label: 'Submitted', color: 'purple' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

export function GrantTracker({ convocatoriaId, initialTracking }: GrantTrackerProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [tracking, setTracking] = useState(initialTracking || {
    status: 'interested',
    reminderDate: null,
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const updateTracking = async () => {
    if (!session?.user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to track grants',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/grants/tracking', {
        method: initialTracking ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          convocatoriaId,
          ...tracking
        })
      });

      if (!response.ok) throw new Error('Failed to update tracking');

      const data = await response.json();
      setTracking(data);
      
      toast({
        title: 'Tracking updated',
        description: 'Grant tracking status has been updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tracking status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Grant Tracking</h3>
        <Badge 
          variant={TRACKING_STATUSES.find(s => s.value === tracking.status)?.color}
        >
          {TRACKING_STATUSES.find(s => s.value === tracking.status)?.label}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select 
            value={tracking.status} 
            onValueChange={(value) => setTracking({ ...tracking, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKING_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Set Reminder</label>
          <Calendar
            mode="single"
            selected={tracking.reminderDate}
            onSelect={(date) => setTracking({ ...tracking, reminderDate: date })}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={tracking.notes}
            onChange={(e) => setTracking({ ...tracking, notes: e.target.value })}
            placeholder="Add notes about this grant..."
            rows={4}
          />
        </div>

        <Button 
          onClick={updateTracking} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Updating...' : 'Update Tracking'}
        </Button>
      </div>
    </Card>
  );
}
```

## 3. Notification System

### 3.1 Email Service

```typescript
// src/lib/email/service.ts
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { WelcomeEmail } from './templates/welcome';
import { DeadlineReminderEmail } from './templates/deadline-reminder';
import { NewGrantsEmail } from './templates/new-grants';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmail(to: string, subject: string, html: string) {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html
  };

  return transporter.sendMail(mailOptions);
}

export async function sendWelcomeEmail(user: User) {
  const html = render(WelcomeEmail({ user }));
  return sendEmail(user.email, 'Welcome to BDNS Web', html);
}

export async function sendDeadlineReminder(user: User, grant: Grant, daysUntil: number) {
  const html = render(DeadlineReminderEmail({ user, grant, daysUntil }));
  return sendEmail(
    user.email, 
    `Reminder: ${grant.titulo} deadline in ${daysUntil} days`,
    html
  );
}

export async function sendNewGrantsNotification(user: User, grants: Grant[]) {
  const html = render(NewGrantsEmail({ user, grants }));
  return sendEmail(
    user.email,
    `${grants.length} new grants matching your interests`,
    html
  );
}
```

### 3.2 Notification Worker

```typescript
// src/workers/notifications.ts
import { CronJob } from 'cron';
import { prisma } from '@/lib/prisma';
import { sendDeadlineReminder, sendNewGrantsNotification } from '@/lib/email/service';

// Check for deadline reminders every hour
export const deadlineReminderJob = new CronJob('0 * * * *', async () => {
  console.log('Checking deadline reminders...');
  
  try {
    // Get all tracking with reminders
    const trackings = await prisma.grantTracking.findMany({
      where: {
        reminderDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      },
      include: {
        user: true,
        convocatoria: true
      }
    });

    // Send reminders
    for (const tracking of trackings) {
      const daysUntil = Math.ceil(
        (tracking.convocatoria.fecha_fin_solicitud.getTime() - Date.now()) / 
        (1000 * 60 * 60 * 24)
      );

      await sendDeadlineReminder(tracking.user, tracking.convocatoria, daysUntil);
      
      // Mark as sent
      await prisma.grantTracking.update({
        where: { id: tracking.id },
        data: { reminderDate: null }
      });
    }

    console.log(`Sent ${trackings.length} deadline reminders`);
  } catch (error) {
    console.error('Deadline reminder job error:', error);
  }
});

// Check for new matching grants daily
export const newGrantsJob = new CronJob('0 9 * * *', async () => {
  console.log('Checking for new matching grants...');
  
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get users with notification preferences
    const users = await prisma.user.findMany({
      where: {
        notificationPreferences: {
          newGrantsMatching: true,
          emailEnabled: true
        }
      },
      include: {
        savedSearches: true,
        notificationPreferences: true
      }
    });

    for (const user of users) {
      // Find new grants matching user's saved searches
      const matchingGrants = [];
      
      for (const search of user.savedSearches) {
        const grants = await prisma.convocatoria.findMany({
          where: {
            created_at: { gte: yesterday },
            ...buildSearchQuery(search.filters)
          },
          take: 10
        });
        
        matchingGrants.push(...grants);
      }

      if (matchingGrants.length > 0) {
        await sendNewGrantsNotification(user, matchingGrants);
      }
    }

    console.log(`Processed ${users.length} users for new grants`);
  } catch (error) {
    console.error('New grants job error:', error);
  }
});

// Start jobs
deadlineReminderJob.start();
newGrantsJob.start();
```

## 4. Basic Analytics Dashboard

### 4.1 Analytics API

```typescript
// src/app/api/analytics/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    
    // Get user activity metrics
    const [
      totalFavorites,
      totalTracking,
      grantsByStatus,
      recentActivity,
      sectorDistribution
    ] = await Promise.all([
      // Total favorites
      prisma.userFavorite.count({ where: { userId } }),
      
      // Total grants being tracked
      prisma.grantTracking.count({ where: { userId } }),
      
      // Grants by status
      prisma.grantTracking.groupBy({
        by: ['status'],
        where: { userId },
        _count: true
      }),
      
      // Recent activity
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          'favorite' as type
        FROM user_favorites
        WHERE user_id = ${userId}
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        
        UNION ALL
        
        SELECT 
          DATE(updated_at) as date,
          COUNT(*) as count,
          'tracking' as type
        FROM grant_tracking
        WHERE user_id = ${userId}
        AND updated_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(updated_at)
        
        ORDER BY date DESC
      `,
      
      // Sector distribution of tracked grants
      prisma.$queryRaw`
        SELECT 
          c.finalidad as sector,
          COUNT(DISTINCT gt.id) as count,
          SUM(c.importe_total) as total_amount
        FROM grant_tracking gt
        JOIN convocatorias c ON gt.convocatoria_id = c.id
        WHERE gt.user_id = ${userId}
        GROUP BY c.finalidad
        ORDER BY count DESC
        LIMIT 10
      `
    ]);

    // Success rate (if we have decision data)
    const successRate = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::float / 
        NULLIF(COUNT(CASE WHEN status IN ('approved', 'rejected') THEN 1 END), 0) * 100 as rate
      FROM grant_tracking
      WHERE user_id = ${userId}
    `;

    return NextResponse.json({
      overview: {
        totalFavorites,
        totalTracking,
        successRate: successRate[0]?.rate || 0
      },
      grantsByStatus,
      recentActivity,
      sectorDistribution
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
```

### 4.2 Analytics Dashboard Component

```tsx
// src/components/analytics/AnalyticsDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Loader2 } from 'lucide-react';

export function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/overview');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalFavorites}</div>
            <p className="text-xs text-muted-foreground">
              Grants saved for later
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalTracking}</div>
            <p className="text-xs text-muted-foreground">
              Active grant applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.successRate.toFixed(1)}%</div>
            <Progress value={data.overview.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your grant activity over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Grants by Status</CardTitle>
              <CardDescription>Distribution of your tracked grants</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.grantsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="_count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectors">
          <Card>
            <CardHeader>
              <CardTitle>Sector Distribution</CardTitle>
              <CardDescription>Your grant interests by sector</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.sectorDistribution}
                    dataKey="count"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 5. Migration Scripts

```typescript
// scripts/migrate-phase1.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase 1 migration...');

  try {
    // Run migrations
    await prisma.$executeRaw`
      -- Create all Phase 1 tables
      ${PHASE1_SCHEMA_SQL}
    `;

    console.log('✓ Created database tables');

    // Create default notification preferences for existing users
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      await prisma.notificationPreferences.create({
        data: {
          userId: user.id,
          emailEnabled: true,
          emailFrequency: 'immediate'
        }
      });
    }

    console.log('✓ Created default notification preferences');

    // Create indexes
    await prisma.$executeRaw`
      ${PHASE1_INDEXES_SQL}
    `;

    console.log('✓ Created database indexes');

    console.log('Phase 1 migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

## Testing Strategy

### Unit Tests
- Authentication flows
- API endpoints
- Email services
- Database queries

### Integration Tests
- User registration and login
- Grant tracking workflow
- Notification system
- Analytics calculations

### E2E Tests
- Complete user journey
- Grant discovery to tracking
- Email notifications
- Dashboard interactions

## Deployment Checklist

1. **Environment Setup**
   - [ ] Configure SMTP settings
   - [ ] Set up OAuth providers
   - [ ] Generate JWT secrets
   - [ ] Configure database

2. **Database Migration**
   - [ ] Run schema migrations
   - [ ] Create indexes
   - [ ] Seed test data

3. **Security**
   - [ ] Enable HTTPS
   - [ ] Configure CORS
   - [ ] Set up rate limiting
   - [ ] Enable security headers

4. **Monitoring**
   - [ ] Set up error tracking
   - [ ] Configure performance monitoring
   - [ ] Enable database query logging
   - [ ] Set up uptime monitoring

5. **Testing**
   - [ ] Run unit tests
   - [ ] Run integration tests
   - [ ] Perform security audit
   - [ ] Load testing

This completes the Phase 1 technical implementation guide. The foundation is now set for user authentication, grant tracking, and basic analytics.