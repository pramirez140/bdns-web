# BDNS Web Development Guide

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites

- Node.js 18+ (use nvm for version management)
- Docker & Docker Compose
- Git
- VS Code (recommended) or your preferred IDE
- PostgreSQL client tools (optional but helpful)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/pramirez140/bdns-web.git
cd bdns-web

# Install Node.js dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run database setup
npm run db:setup

# Start development server
npm run dev
```

### VS Code Setup

#### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.npm-intellisense",
    "mikestead.dotenv",
    "eamodio.gitlens",
    "yzhang.markdown-all-in-one"
  ]
}
```

#### Workspace Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Development Environment Variables

```bash
# .env.local (development)
NODE_ENV=development

# Database (local PostgreSQL)
DATABASE_URL=postgresql://bdns_user:dev_password@localhost:5432/bdns_dev

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# BDNS API (use mock for development)
USE_MOCK_API=true
BDNS_API_BASE=https://www.infosubvenciones.es/bdnstrans

# Development features
ENABLE_DEBUG_LOGGING=true
ENABLE_QUERY_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true

# Hot reload
WATCHPACK_POLLING=true
```

## Project Structure

```
bdns-web/
├── src/
│   ├── app/                    # Next.js 14 app directory
│   │   ├── (routes)/          # Route groups
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── filters/           # Filter components
│   │   ├── search/            # Search components
│   │   ├── sync/              # Sync components
│   │   └── ui/                # UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   │   ├── api/              # API clients
│   │   ├── db/               # Database utilities
│   │   └── utils/            # General utilities
│   └── types/                 # TypeScript types
├── public/                    # Static assets
├── scripts/                   # Build and utility scripts
├── migrations/               # Database migrations
├── tests/                    # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
└── docs/                     # Documentation

```

### Key Directories Explained

#### `/src/app`
Next.js 14 app directory with file-based routing:
- Route groups for organization
- Nested layouts
- Server and Client Components
- API routes with route handlers

#### `/src/components`
Organized by feature and complexity:
- Feature-specific components (search, filters, sync)
- Shared UI components
- Compound components
- HOCs and render props

#### `/src/lib`
Business logic and utilities:
- Database queries
- API integrations
- Helper functions
- Constants and configuration

## Development Workflow

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: add new search filter"

# 3. Push to remote
git push origin feature/your-feature-name

# 4. Create pull request
gh pr create --title "Add new search filter" --body "Description..."
```

### Commit Conventions

Follow Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Maintenance tasks

Examples:
```bash
feat(search): add organization filter autocomplete
fix(sync): handle API timeout errors gracefully
docs(api): update search endpoint documentation
perf(db): add index for convocatorias search
```

### Development Commands

```bash
# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Start production server locally
npm run start

# Database commands
npm run db:migrate         # Run migrations
npm run db:seed           # Seed development data
npm run db:reset          # Reset database
npm run db:sync           # Sync with BDNS API

# Generate TypeScript types from database
npm run generate:types
```

## Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface SearchParams {
  query: string;
  page: number;
  filters: SearchFilters;
}

// ❌ Bad: Avoid any
let data: any;

// ✅ Good: Use type guards
function isConvocatoria(obj: unknown): obj is Convocatoria {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'codigo_bdns' in obj &&
    'titulo' in obj
  );
}

// ✅ Good: Use enums for constants
enum SyncStatus {
  Idle = 'idle',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed'
}

// ✅ Good: Proper error handling
async function fetchData(): Promise<Result<Data, Error>> {
  try {
    const data = await api.get('/data');
    return { ok: true, value: data };
  } catch (error) {
    return { ok: false, error };
  }
}
```

### React Best Practices

```tsx
// ✅ Good: Use function components with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ✅ Good: Custom hooks for logic
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ✅ Good: Memoization for expensive operations
const SearchResults = memo(({ results }: { results: Convocatoria[] }) => {
  const sortedResults = useMemo(
    () => results.sort((a, b) => b.score - a.score),
    [results]
  );

  return (
    <div>
      {sortedResults.map(result => (
        <ResultCard key={result.id} data={result} />
      ))}
    </div>
  );
});
```

### CSS/Tailwind Guidelines

```tsx
// ✅ Good: Use Tailwind utilities
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">

// ✅ Good: Extract complex styles to components
const cardStyles = cva(
  "rounded-lg border p-4 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white border-gray-200",
        selected: "bg-blue-50 border-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ✅ Good: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ❌ Bad: Avoid inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

## Testing

### Unit Testing

```typescript
// __tests__/lib/utils.test.ts
import { formatCurrency, parseSearchQuery } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats numbers as EUR currency', () => {
    expect(formatCurrency(1000)).toBe('1.000,00 €');
    expect(formatCurrency(1234567.89)).toBe('1.234.567,89 €');
  });

  it('handles null/undefined', () => {
    expect(formatCurrency(null)).toBe('0,00 €');
    expect(formatCurrency(undefined)).toBe('0,00 €');
  });
});

describe('parseSearchQuery', () => {
  it('extracts search terms and filters', () => {
    const result = parseSearchQuery('education org:Ministry amount:>10000');
    expect(result).toEqual({
      terms: ['education'],
      filters: {
        organization: 'Ministry',
        minAmount: 10000
      }
    });
  });
});
```

### Component Testing

```tsx
// __tests__/components/SearchForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchForm } from '@/components/search/SearchForm';

describe('SearchForm', () => {
  it('calls onSearch with input value', async () => {
    const handleSearch = jest.fn();
    render(<SearchForm onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText('Buscar subvenciones...');
    fireEvent.change(input, { target: { value: 'education' } });

    await waitFor(() => {
      expect(handleSearch).toHaveBeenCalledWith('education');
    }, { timeout: 400 }); // Debounce delay
  });

  it('clears input when clear button clicked', () => {
    render(<SearchForm onSearch={jest.fn()} initialValue="test" />);
    
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);
    
    const input = screen.getByPlaceholderText('Buscar subvenciones...');
    expect(input).toHaveValue('');
  });
});
```

### Integration Testing

```typescript
// __tests__/api/search.test.ts
import { GET } from '@/app/api/search/route';
import { pool } from '@/lib/database';

describe('Search API', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE convocatorias RESTART IDENTITY CASCADE');
    await pool.query(`
      INSERT INTO convocatorias (codigo_bdns, titulo, desc_organo)
      VALUES 
        ('TEST001', 'Education Grant', 'Ministry of Education'),
        ('TEST002', 'Research Grant', 'Ministry of Science')
    `);
  });

  it('returns search results', async () => {
    const request = new Request('http://localhost/api/search?query=education');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.convocatorias).toHaveLength(1);
    expect(data.data.convocatorias[0].titulo).toBe('Education Grant');
  });
});
```

### E2E Testing

```typescript
// tests/e2e/search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search functionality', () => {
  test('performs search and displays results', async ({ page }) => {
    await page.goto('/');
    
    // Enter search query
    await page.fill('[placeholder="Buscar subvenciones..."]', 'educación');
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]');
    
    // Check results are displayed
    const results = await page.$$('[data-testid="grant-card"]');
    expect(results.length).toBeGreaterThan(0);
    
    // Click on first result
    await results[0].click();
    
    // Check detail page
    await expect(page).toHaveURL(/\/convocatorias\/\d+/);
    await expect(page.locator('h1')).toContainText('educación');
  });
});
```

## Debugging

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceRoot}/node_modules/.bin/jest",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Utilities

```typescript
// lib/debug.ts
export const debug = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  
  time: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label);
    }
  },
  
  timeEnd: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label);
    }
  },
  
  trace: () => {
    if (process.env.NODE_ENV === 'development') {
      console.trace();
    }
  }
};

// Usage
debug.time('database-query');
const results = await searchConvocatorias(params);
debug.timeEnd('database-query');
```

### Database Query Logging

```typescript
// lib/database.ts
import { Pool } from 'pg';
import { debug } from './debug';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log queries in development
if (process.env.ENABLE_QUERY_LOGGING === 'true') {
  const originalQuery = pool.query.bind(pool);
  
  pool.query = (async (...args: any[]) => {
    const start = Date.now();
    debug.log('SQL:', args[0]);
    
    try {
      const result = await originalQuery(...args);
      debug.log(`Query completed in ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      debug.log(`Query failed after ${Date.now() - start}ms:`, error);
      throw error;
    }
  }) as any;
}
```

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for code splitting
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);

// Route-based code splitting (automatic in Next.js)
// Each page is automatically code-split
```

### Image Optimization

```tsx
import Image from 'next/image';

// ✅ Good: Use Next.js Image component
<Image
  src="/logo.png"
  alt="BDNS Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
  placeholder="blur"
  blurDataURL={logoBlurDataURL}
/>

// Generate blur placeholders
// scripts/generate-placeholders.js
const { getPlaiceholder } = require('plaiceholder');

async function generatePlaceholder(src) {
  const { base64 } = await getPlaiceholder(src);
  return base64;
}
```

### Database Query Optimization

```sql
-- Add appropriate indexes
CREATE INDEX idx_convocatorias_fecha_organo 
ON convocatorias(fecha_registro DESC, desc_organo);

-- Use materialized views for complex queries
CREATE MATERIALIZED VIEW mv_organization_stats AS
SELECT 
  codigo_organo,
  desc_organo,
  COUNT(*) as total_grants,
  SUM(importe_total) as total_amount,
  MAX(fecha_registro) as last_grant_date
FROM convocatorias
GROUP BY codigo_organo, desc_organo;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_stats;
```

### React Performance

```tsx
// ✅ Good: Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ Good: Memoize callbacks
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// ✅ Good: Lazy load components
const LazyComponent = lazy(() => import('./LazyComponent'));

// ✅ Good: Virtualize long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <GrantCard grant={items[index]} />
    </div>
  )}
</FixedSizeList>
```

## Common Tasks

### Adding a New API Endpoint

```typescript
// 1. Create route handler
// app/api/grants/stats/route.ts
import { NextResponse } from 'next/server';
import { getGrantStats } from '@/lib/db/grants';

export async function GET() {
  try {
    const stats = await getGrantStats();
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// 2. Add TypeScript types
// types/api.ts
export interface GrantStats {
  total: number;
  open: number;
  totalAmount: number;
  byOrganization: Record<string, number>;
}

// 3. Create client hook
// hooks/useGrantStats.ts
export function useGrantStats() {
  return useSWR<GrantStats>('/api/grants/stats', fetcher);
}
```

### Adding a New Database Migration

```sql
-- migrations/004_add_user_favorites.sql
BEGIN;

CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  convocatoria_id INTEGER NOT NULL REFERENCES convocatorias(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, convocatoria_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);

INSERT INTO migrations (filename) VALUES ('004_add_user_favorites.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
```

### Adding a New Component

```tsx
// 1. Create component file
// components/ui/Tooltip.tsx
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            className={cn(
              'z-50 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white',
              'animate-in fade-in-0 zoom-in-95'
            )}
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// 2. Add to component exports
// components/ui/index.ts
export { Tooltip } from './Tooltip';

// 3. Use in application
import { Tooltip } from '@/components/ui';

<Tooltip content="Click to view details">
  <button>View Grant</button>
</Tooltip>
```

## Troubleshooting

### Common Development Issues

#### Hot Reload Not Working

```bash
# Clear Next.js cache
rm -rf .next

# If using WSL2
# Add to .env.local
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true

# Restart dev server
npm run dev
```

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache/typescript

# Regenerate types
npm run generate:types

# Check TypeScript version
npx tsc --version
```

#### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps

# Check connection string
echo $DATABASE_URL

# Test connection
docker exec -it bdns-postgres psql -U bdns_user -d bdns_db -c "SELECT 1"

# Reset database
npm run db:reset
```

#### Build Failures

```bash
# Clear all caches
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building with verbose logging
NEXT_TELEMETRY_DEBUG=1 npm run build
```

### Debug Tips

1. **Use React DevTools**: Install browser extension
2. **Enable React Query DevTools**: For API debugging
3. **Use Chrome DevTools**: Network tab for API calls
4. **PostgreSQL Explain**: For slow queries
5. **Bundle Analyzer**: For build size optimization

```bash
# Analyze bundle size
ANALYZE=true npm run build
```

This development guide provides comprehensive information for developers working on the BDNS Web project. Follow these guidelines for consistent, high-quality code.