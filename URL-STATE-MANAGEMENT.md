# URL State Management Implementation

## Overview

Comprehensive URL state management has been implemented across the entire BDNS Web application to ensure users can bookmark, refresh, and share URLs while maintaining their current state.

## URL Parameters Supported

### Search Parameters
- `q` or `query` - Search query text
- `page` - Current page number (pagination)
- `pageSize` - Results per page
- `sortBy` - Sort field (fechaPublicacion, importeTotal, titulo)
- `sortOrder` - Sort direction (asc, desc)

### Filter Parameters
- `organo` or `organoConvocante` - Organization filter
- `minAmount` or `importeMinimo` - Minimum amount filter
- `maxAmount` or `importeMaximo` - Maximum amount filter
- `from` or `fechaDesde` - Start date filter (YYYY-MM-DD)
- `to` or `fechaHasta` - End date filter (YYYY-MM-DD)
- `status` or `estado` - Grant status filter

### UI State Parameters
- `tab` - Current active tab (search, sync)

## Example URLs

### Search with Query
```
/?q=educacion&tab=search
```

### Search with Filters and Sorting
```
/?q=investigacion&organo=Ministerio&minAmount=10000&sortBy=titulo&sortOrder=asc&page=2
```

### Sync Management Tab
```
/?tab=sync
```

### Complex Search State
```
/?q=energia&organo=Ministerio%20de%20Ciencia&minAmount=50000&maxAmount=500000&from=2024-01-01&to=2024-12-31&sortBy=importeTotal&sortOrder=desc&page=3
```

## Implementation Details

### Custom Hooks

#### `useUrlState()`
- Core hook for URL parameter management
- Parses URL parameters into typed state
- Updates URL while preserving navigation history
- Provides helper functions for state management

#### `useTabState()`
- Specialized hook for tab management
- Ensures tab state persists across refreshes
- Uses URL replace for seamless tab switching

#### `useSearchState()`
- Specialized hook for search and filter management
- Handles complex search state synchronization
- Automatically resets page to 1 for new searches
- Converts between URL parameters and typed interfaces

### Component Integration

#### HomePage (`/src/app/page.tsx`)
- Fully integrated with URL state management
- Restores search state on page load
- Updates URL for all user interactions
- Preserves state across tab switches

#### FilterPanel (`/src/components/filters/FilterPanel.tsx`)
- Real-time filter updates to URL
- No "Apply" button needed - filters update immediately
- Clear filters functionality
- Visual indicators for active filters

#### SearchResults (`/src/components/search/SearchResults.tsx`)
- Pagination updates URL state
- Sorting updates URL state
- Preserves current search context

#### Grant Detail Page (`/src/app/convocatorias/[id]/page.tsx`)
- Back navigation preserves search state
- Returns user to exact search context
- Maintains pagination and filters

### Navigation Integration

#### Header Navigation (`/src/app/layout.tsx`)
- Updated to use tab-aware URLs
- Direct links to search and sync tabs
- Consistent navigation experience

## Features

### State Persistence
- ✅ Search queries persist across page refreshes
- ✅ Filters and sorting persist across navigation
- ✅ Pagination state maintained
- ✅ Tab selection preserved
- ✅ Return navigation from grant details preserves context

### URL Sharing
- ✅ Users can bookmark specific search results
- ✅ URLs can be shared with exact search state
- ✅ Deep linking to specific pages and filters
- ✅ SEO-friendly parameter naming

### User Experience
- ✅ Back button works correctly
- ✅ Browser refresh maintains state
- ✅ No lost search context when navigating
- ✅ Immediate filter updates without form submission
- ✅ Clean URLs with abbreviated parameter names

### Performance
- ✅ Efficient URL updates using router.replace for UI state
- ✅ Router.push for search state to maintain history
- ✅ Minimal re-renders with proper state management
- ✅ Debounced updates for real-time filtering

## URL Parameter Mapping

| User-Friendly | Internal Interface | Description |
|---------------|-------------------|-------------|
| `q` | `query` | Search query text |
| `page` | `page` | Current page number |
| `sortBy` | `sortBy` | Sort field |
| `sortOrder` | `sortOrder` | Sort direction |
| `organo` | `organoConvocante` | Organization filter |
| `minAmount` | `importeMinimo` | Minimum amount |
| `maxAmount` | `importeMaximo` | Maximum amount |
| `from` | `fechaDesde` | Start date |
| `to` | `fechaHasta` | End date |
| `status` | `estadoConvocatoria` | Status filter |
| `tab` | UI state | Active tab |

## Benefits

1. **User Experience**: Users never lose their search context
2. **Bookmarking**: Complex searches can be bookmarked and shared
3. **SEO**: Search states are indexable by search engines
4. **Analytics**: User behavior can be tracked through URL patterns
5. **Development**: Easier debugging with visible state in URL
6. **Testing**: End-to-end tests can use direct URL navigation

## Browser Support

- ✅ Modern browsers with URLSearchParams support
- ✅ Next.js 14 App Router compatibility
- ✅ TypeScript type safety
- ✅ React 18 concurrent features support