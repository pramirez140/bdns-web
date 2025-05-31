# BDNS Web Components Guide

## Table of Contents

- [Component Architecture](#component-architecture)
- [Core Components](#core-components)
- [Search Components](#search-components)
- [Filter Components](#filter-components)
- [Display Components](#display-components)
- [Sync Components](#sync-components)
- [UI Components](#ui-components)
- [Custom Hooks](#custom-hooks)
- [State Management](#state-management)
- [Component Patterns](#component-patterns)

## Component Architecture

### Design Principles

1. **Composition over Inheritance**: Small, composable components
2. **Single Responsibility**: Each component has one clear purpose
3. **TypeScript First**: Full type safety across all components
4. **Accessibility Built-in**: ARIA labels and keyboard support
5. **Performance Optimized**: Memoization and lazy loading

### Directory Structure

```
src/
├── components/
│   ├── filters/          # Filter-related components
│   ├── search/           # Search interface components
│   ├── sync/             # Sync management components
│   ├── expedientes/      # Grant management components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
└── types/                # TypeScript type definitions
```

## Core Components

### Layout Components

#### `RootLayout` (`app/layout.tsx`)

The root layout component that wraps the entire application.

**Props:**
```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}
```

**Features:**
- Global navigation header
- Footer with links
- Theme provider
- Error boundary
- Analytics integration

**Usage:**
```tsx
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

#### `HomePage` (`app/page.tsx`)

The main landing page with tab navigation.

**Features:**
- Tab-based navigation (Search/Sync)
- URL state management
- Responsive layout
- SEO optimization

**State Management:**
```tsx
const [activeTab, setActiveTab] = useTabState();
const [searchParams, setSearchParams] = useSearchState();
```

## Search Components

### `SearchForm` (`components/search/SearchForm.tsx`)

The main search input component with advanced features.

**Props:**
```typescript
interface SearchFormProps {
  onSearch: (query: string) => void;
  initialValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}
```

**Features:**
- Debounced input (300ms)
- Clear button
- Search suggestions
- Keyboard shortcuts
- Loading states

**Example:**
```tsx
<SearchForm
  onSearch={handleSearch}
  initialValue={searchParams.query}
  placeholder="Buscar subvenciones..."
  autoFocus
/>
```

### `SearchResults` (`components/search/SearchResults.tsx`)

Displays search results with pagination and sorting.

**Props:**
```typescript
interface SearchResultsProps {
  results: Convocatoria[];
  total: number;
  loading: boolean;
  error?: Error;
  pagination: {
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  sorting: {
    field: SortField;
    order: SortOrder;
    onSort: (field: SortField, order: SortOrder) => void;
  };
}
```

**Features:**
- Grid/List view toggle
- Responsive cards
- Skeleton loading
- Error states
- Empty states
- Bulk selection

**Sorting Options:**
- Fecha de publicación (fecha_registro)
- Importe total (importe_total)
- Título (titulo)
- Fecha límite (fecha_fin_solicitud)

## Filter Components

### `FilterPanel` (`components/filters/FilterPanel.tsx`)

Comprehensive filter panel with all filter options.

**Props:**
```typescript
interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  organizations: Organization[];
  loading?: boolean;
  className?: string;
}
```

**Sub-components:**
- `OrganizationFilter`
- `AmountRangeFilter`
- `DateRangeFilter`
- `StatusFilter`
- `TypologyFilter`
- `AdvancedFilters`

**Features:**
- Collapsible sections
- Filter count badges
- Clear all/individual filters
- Mobile-optimized drawer
- Real-time updates

### Filter Sub-components

#### `OrganizationFilter`

Auto-complete organization selector with fuzzy search.

**Features:**
- Typeahead search
- Shows grant count per org
- Handles name variations
- Multi-select support

#### `AmountRangeFilter`

Dual slider for amount range selection.

**Features:**
- Min/Max inputs
- Slider visualization
- Currency formatting
- Preset ranges

#### `DateRangeFilter`

Calendar-based date range picker.

**Features:**
- Visual calendar
- Preset ranges (Last 30 days, This year, etc.)
- Keyboard navigation
- Mobile-friendly

## Display Components

### `ConvocatoriaCard` (`components/ui/ConvocatoriaCard.tsx`)

Individual grant display card.

**Props:**
```typescript
interface ConvocatoriaCardProps {
  convocatoria: Convocatoria;
  view: 'grid' | 'list';
  selected?: boolean;
  onSelect?: (id: string) => void;
  onView?: (id: string) => void;
}
```

**Features:**
- Status badges (Open/Closed)
- Financial highlights
- Organization display
- Quick actions
- Responsive design

### `ConvocatoriaDetail` (`app/convocatorias/[id]/page.tsx`)

Full grant detail page component.

**Sections:**
- Header with key info
- Description tabs
- Beneficiary information
- Financial details
- Application process
- Related grants
- Share options

**Features:**
- Breadcrumb navigation
- Print-friendly view
- Download as PDF
- Social sharing

## Sync Components

### `SyncManager` (`components/sync/SyncManager.tsx`)

Main sync management interface.

**Features:**
- Current database statistics
- Sync type selection
- Progress monitoring
- History display
- Error handling

**Props:**
```typescript
interface SyncManagerProps {
  onSyncStart?: (type: SyncType) => void;
  onSyncComplete?: (stats: SyncStats) => void;
}
```

### `SyncBanner` (`components/sync/SyncBanner.tsx`)

Notification banner for active syncs.

**Features:**
- Progress bar
- ETA calculation
- Dismiss option
- Minimal/Expanded view
- Background sync indicator

## UI Components

### Button Component (`components/ui/button.tsx`)

Versatile button component with variants.

**Variants:**
- `default`: Primary action
- `secondary`: Secondary action
- `outline`: Bordered style
- `ghost`: Minimal style
- `link`: Text link style
- `destructive`: Danger actions

**Sizes:**
- `sm`: Small buttons
- `md`: Default size
- `lg`: Large buttons
- `icon`: Icon-only buttons

**Example:**
```tsx
<Button 
  variant="outline" 
  size="lg" 
  onClick={handleClick}
  disabled={loading}
>
  <Download className="mr-2 h-4 w-4" />
  Export Results
</Button>
```

### Badge Component (`components/ui/badge.tsx`)

Status and label badges.

**Variants:**
- `default`: Standard badge
- `success`: Green/positive
- `warning`: Yellow/caution
- `error`: Red/negative
- `info`: Blue/informational

**Example:**
```tsx
<Badge variant="success">Abierta</Badge>
<Badge variant="warning">Próxima apertura</Badge>
```

### Card Component (`components/ui/card.tsx`)

Container component for content.

**Sub-components:**
- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Subtitle text
- `CardContent`: Main content
- `CardFooter`: Actions section

### Progress Component (`components/ui/progress.tsx`)

Progress indicators for sync and loading.

**Props:**
```typescript
interface ProgressProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
}
```

## Custom Hooks

### `useUrlState` (`hooks/useUrlState.ts`)

Manages URL parameters and state synchronization.

**Usage:**
```tsx
const { params, setParams, updateParam } = useUrlState();

// Read parameters
const searchQuery = params.get('q');

// Update single parameter
updateParam('page', '2');

// Update multiple parameters
setParams({
  q: 'education',
  organo: 'Ministry',
  page: '1'
});
```

### `useSearchPersistence` (`hooks/useSearchPersistence.ts`)

Handles search state persistence and caching.

**Features:**
- Session storage backup
- URL state sync
- Cache management
- Scroll position restoration

**Usage:**
```tsx
const { 
  searchState, 
  updateSearchState, 
  clearSearchState 
} = useSearchPersistence();
```

### `useDebounce`

Debounces values for performance.

**Usage:**
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

### `useInfiniteScroll`

Implements infinite scrolling for results.

**Usage:**
```tsx
const { 
  items, 
  loading, 
  hasMore, 
  loadMore 
} = useInfiniteScroll({
  fetchMore: fetchNextPage,
  threshold: 100
});
```

## State Management

### Local State Patterns

Components use local state for UI-specific concerns:

```tsx
// UI state
const [isOpen, setIsOpen] = useState(false);
const [view, setView] = useState<'grid' | 'list'>('grid');

// Form state
const [formData, setFormData] = useState(initialValues);

// Loading states
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);
```

### Global State Patterns

URL state serves as global state for search parameters:

```tsx
// All search state in URL
const searchParams = new URLSearchParams(window.location.search);
const filters = Object.fromEntries(searchParams.entries());

// Update global state
router.push(`/?${searchParams.toString()}`);
```

### Data Fetching Patterns

```tsx
// Server Components (preferred)
async function SearchResults() {
  const data = await fetchConvocatorias(params);
  return <ResultsList data={data} />;
}

// Client Components (when needed)
function ClientSearch() {
  const { data, error, loading } = useSWR(
    `/api/search?${params}`,
    fetcher
  );
}
```

## Component Patterns

### Composition Pattern

Build complex UIs from simple components:

```tsx
<FilterPanel>
  <FilterSection title="Organization">
    <OrganizationFilter {...props} />
  </FilterSection>
  <FilterSection title="Amount">
    <AmountRangeFilter {...props} />
  </FilterSection>
</FilterPanel>
```

### Render Props Pattern

For flexible component behavior:

```tsx
<DataTable
  data={convocatorias}
  renderRow={(item) => (
    <ConvocatoriaRow 
      key={item.id} 
      convocatoria={item} 
    />
  )}
/>
```

### Compound Components

Related components that work together:

```tsx
<Tabs defaultValue="search">
  <TabsList>
    <TabsTrigger value="search">Search</TabsTrigger>
    <TabsTrigger value="sync">Sync</TabsTrigger>
  </TabsList>
  <TabsContent value="search">
    <SearchInterface />
  </TabsContent>
  <TabsContent value="sync">
    <SyncManager />
  </TabsContent>
</Tabs>
```

### Container/Presenter Pattern

Separate logic from presentation:

```tsx
// Container
function ConvocatoriaListContainer() {
  const { data, loading, error } = useConvocatorias();
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  return <ConvocatoriaList items={data} />;
}

// Presenter
function ConvocatoriaList({ items }: { items: Convocatoria[] }) {
  return (
    <div className="grid gap-4">
      {items.map(item => (
        <ConvocatoriaCard key={item.id} data={item} />
      ))}
    </div>
  );
}
```

## Best Practices

### Performance

1. **Memoization**: Use `React.memo` for expensive components
2. **Lazy Loading**: Dynamic imports for large components
3. **Virtualization**: For long lists
4. **Image Optimization**: Next.js Image component
5. **Code Splitting**: Separate bundles for routes

### Accessibility

1. **Semantic HTML**: Use proper elements
2. **ARIA Labels**: Add where needed
3. **Keyboard Navigation**: Full keyboard support
4. **Focus Management**: Logical focus flow
5. **Screen Reader Testing**: Regular testing

### Testing

1. **Unit Tests**: For utilities and hooks
2. **Component Tests**: For UI components
3. **Integration Tests**: For features
4. **E2E Tests**: For critical paths
5. **Visual Regression**: For UI consistency

### Documentation

1. **Props Documentation**: TypeScript interfaces
2. **Usage Examples**: In component files
3. **Storybook**: For component library
4. **README Files**: For complex components
5. **Code Comments**: For complex logic

This guide provides a comprehensive overview of all components in the BDNS Web application. Each component is designed to be reusable, accessible, and performant.