# BDNS Web Features Guide

## Table of Contents

- [Search Features](#search-features)
- [Filter System](#filter-system)
- [Organization Management](#organization-management)
- [Grant Details](#grant-details)
- [URL State Management](#url-state-management)
- [Data Synchronization](#data-synchronization)
- [Export Functionality](#export-functionality)
- [Performance Features](#performance-features)
- [Accessibility](#accessibility)
- [Mobile Experience](#mobile-experience)

## Search Features

### Full-Text Search

The search system uses PostgreSQL's full-text search capabilities optimized for Spanish language:

#### Features
- **Spanish Stemming**: Automatically handles word variations (e.g., "educación", "educativo", "educar")
- **Fuzzy Matching**: Finds results even with typos using trigram similarity
- **Weighted Results**: Prioritizes title matches over description matches
- **Real-time Search**: Instant results as you type
- **Search Persistence**: Search terms are preserved in URL

#### How to Use
1. Type your search query in the main search box
2. Results appear instantly below
3. Use quotes for exact phrase matching: `"investigación científica"`
4. Combine multiple terms for AND search: `educación tecnología`

#### Advanced Search Tips
- Use `-` to exclude terms: `educación -privada`
- Search by grant code: `BDNS:823456`
- Organization prefix: `org:Ministerio`

### Search Result Features

- **Highlighted Matches**: Search terms are highlighted in results
- **Relevance Scoring**: Most relevant results appear first
- **Quick Preview**: Key information visible without clicking
- **Status Indicators**: Visual badges for open/closed grants
- **Financial Summary**: Grant amounts clearly displayed

## Filter System

### Available Filters

#### 1. Organization Filter (`organoConvocante`)
- **Auto-complete**: Start typing to see suggestions
- **Historical Variations**: Automatically includes name changes
- **Multi-select**: Choose multiple organizations
- **Hierarchical**: Filter by ministry or specific departments

#### 2. Amount Range Filter
- **Minimum Amount**: Set lower bound for grant amounts
- **Maximum Amount**: Set upper bound for grant amounts
- **Quick Presets**: Common ranges (€10k-50k, €50k-200k, etc.)
- **Currency Formatting**: Automatic thousand separators

#### 3. Date Range Filter
- **Start Date**: Grants published after this date
- **End Date**: Grants published before this date
- **Calendar Widget**: Visual date picker
- **Quick Ranges**: Last 30 days, This year, etc.

#### 4. Status Filter
- **Open Grants**: Currently accepting applications
- **Closed Grants**: Application period ended
- **Upcoming**: Application period not yet started
- **Expired**: Past execution period

#### 5. Advanced Filters (New)

##### Typology Filter (`tipologia`)
- Subvención (Grant)
- Premio (Award)
- Beca (Scholarship)
- Ayuda (Aid)
- Contrato (Contract)

##### Distribution Method (`formaCanalizacion`)
- Convocatoria (Call for proposals)
- Concesión directa (Direct award)
- Nominativa (Nominative)

##### Concession Procedure (`procedimientoConcesion`)
- Concurrencia competitiva (Competitive)
- Concurrencia no competitiva (Non-competitive)
- Concesión directa (Direct concession)

##### Entity Type (`tipoEntidad`)
- Estado (State)
- Comunidad Autónoma (Autonomous Community)
- Entidad Local (Local Entity)
- Universidad (University)
- Otros (Others)

##### Scope (`ambito`)
- Nacional (National)
- Autonómico (Regional)
- Provincial (Provincial)
- Local (Local)
- Internacional (International)

### Filter Behavior

- **Real-time Updates**: Results update instantly as filters change
- **Filter Persistence**: All filters are saved in URL
- **Clear Individual**: Remove specific filters with × button
- **Clear All**: Reset all filters at once
- **Filter Count**: Shows number of active filters
- **Results Count**: Updates to show filtered results

## Organization Management

### Organization List Features

- **Complete Directory**: All 4,481+ organizations that issue grants
- **Statistics**: Total grants and amounts per organization
- **Activity Status**: Shows if organization is currently active
- **Search**: Find organizations by name or code
- **Sorting**: By name, grant count, or total amount

### Organization Variations

Organizations change names over time due to government restructuring. The system tracks these variations:

#### Example: Ministry of Science
```
Current: "Ministerio de Ciencia e Innovación" (2020-present)
Previous: "Ministerio de Ciencia, Innovación y Universidades" (2018-2020)
Previous: "Ministerio de Economía y Competitividad" (2011-2018)
```

#### Features
- **Automatic Grouping**: All variations grouped under same code
- **Historical Timeline**: See when name changes occurred
- **Grant Attribution**: All grants properly attributed regardless of name
- **Search Compatibility**: Find grants using any historical name

## Grant Details

### Comprehensive Information

Each grant detail page includes:

#### Basic Information
- **Title**: Full grant title
- **Organization**: Issuing body with link to all their grants
- **BDNS Code**: Unique identifier
- **Dates**: Application period, execution period
- **Amount**: Total budget and individual grant ranges

#### Detailed Sections

##### Description
- **Brief Description**: Quick overview
- **Full Description**: Complete details
- **Objectives**: What the grant aims to achieve
- **Expected Results**: Intended outcomes

##### Beneficiaries
- **Eligible Types**: Who can apply
- **Requirements**: Specific eligibility criteria
- **Restrictions**: Who cannot apply
- **Geographic Scope**: Where applicants must be located

##### Financial Information
- **Total Budget**: Overall available funding
- **Grant Ranges**: Minimum and maximum amounts
- **Funding Sources**: Where the money comes from
- **Payment Schedule**: How funds are distributed
- **Co-financing**: Required matching funds

##### Application Process
- **How to Apply**: Step-by-step instructions
- **Required Documents**: Complete checklist
- **Submission Platform**: Where to submit
- **Contact Information**: Who to contact for help

##### Evaluation Criteria
- **Scoring System**: How applications are evaluated
- **Weight of Criteria**: Importance of each factor
- **Selection Process**: How winners are chosen
- **Timeline**: When decisions are made

### Related Features

- **Similar Grants**: Recommendations based on current grant
- **Organization Grants**: Other grants from same organization
- **Share Options**: Social media and email sharing
- **Download**: PDF version of grant details
- **Subscribe**: Get updates about this grant

## URL State Management

### What's Preserved in URLs

All application state is stored in the URL, making searches bookmarkable and shareable:

```
https://bdns.example.com/?q=investigación&organo=Ministerio&minAmount=50000&from=2024-01-01&page=2&sortBy=fecha&tab=search
```

### URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `q` | Search query | `q=educación` |
| `page` | Current page | `page=3` |
| `organo` | Organization filter | `organo=Ministerio` |
| `minAmount` | Minimum amount | `minAmount=10000` |
| `maxAmount` | Maximum amount | `maxAmount=500000` |
| `from` | Start date | `from=2024-01-01` |
| `to` | End date | `to=2024-12-31` |
| `status` | Grant status | `status=open` |
| `sortBy` | Sort field | `sortBy=importe` |
| `sortOrder` | Sort direction | `sortOrder=desc` |
| `tab` | Active tab | `tab=search` |

### Benefits

- **Bookmarkable Searches**: Save complex searches for later
- **Shareable Results**: Send specific search results to colleagues
- **Back Button Works**: Navigate naturally through search history
- **Refresh Safe**: Page refreshes maintain all state
- **Deep Linking**: Link directly to specific filtered results

## Data Synchronization

### Automatic Daily Sync

- **Schedule**: Every day at midnight (00:00)
- **Type**: Incremental sync of recent changes
- **Duration**: Typically 2-10 minutes
- **Impact**: No downtime, searches continue working

### Manual Sync Options

#### From Web Interface
1. Click on "Sync" tab
2. View current statistics
3. Click "Start Sync" button
4. Choose sync type
5. Monitor progress in real-time

#### Sync Types

| Type | Description | Use Case | Duration |
|------|-------------|----------|----------|
| **Incremental** | Last 30 days | Daily updates | 2-10 min |
| **Full** | Current year | Monthly refresh | 2-4 hours |
| **Complete** | All history | Initial setup | 700+ hours |

### Sync Monitoring

- **Progress Bar**: Visual indication of completion
- **Statistics**: Records processed, added, updated
- **Time Estimate**: Expected completion time
- **Speed Indicator**: Records per minute
- **Error Handling**: Automatic retry for failures

## Export Functionality

### Available Export Formats

#### CSV Export
- **All Fields**: Complete grant data
- **Custom Selection**: Choose specific fields
- **Filtered Results**: Export only current search results
- **Encoding**: UTF-8 with Spanish characters

#### Excel Export
- **Formatted Data**: Proper column types
- **Multiple Sheets**: Grants, statistics, metadata
- **Charts**: Summary visualizations
- **Filters**: Excel auto-filters enabled

#### PDF Reports
- **Summary Report**: Overview of search results
- **Detailed Report**: Full grant information
- **Statistics Report**: Analytics and insights
- **Custom Branding**: Organization logos

### Export Options

- **Current Page**: Export visible results only
- **All Results**: Export entire filtered dataset
- **Selected Items**: Export checked grants only
- **Scheduled Exports**: Set up recurring exports

## Performance Features

### Search Optimization

- **Indexed Searches**: Sub-100ms response times
- **Lazy Loading**: Results load as you scroll
- **Query Caching**: Recent searches are cached
- **Debounced Input**: Reduces unnecessary queries

### Database Optimization

- **Full-Text Indexes**: Spanish language optimized
- **Trigram Indexes**: For fuzzy matching
- **Partial Indexes**: For common queries
- **Query Plans**: Optimized for common patterns

### Frontend Performance

- **Server-Side Rendering**: Fast initial page loads
- **Code Splitting**: Load only needed JavaScript
- **Image Optimization**: Lazy loading and WebP format
- **CDN Integration**: Static assets served globally

## Accessibility

### WCAG 2.1 Compliance

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: AAA compliance
- **Focus Indicators**: Clear visual focus
- **Skip Links**: Jump to main content

### Accessibility Features

- **High Contrast Mode**: Toggle for better visibility
- **Font Size Controls**: Adjust text size
- **Reduced Motion**: Respect user preferences
- **Alt Text**: All images have descriptions
- **Form Labels**: Clear, associated labels

## Mobile Experience

### Responsive Design

- **Touch Optimized**: Large tap targets
- **Swipe Gestures**: Natural navigation
- **Adaptive Layout**: Content reflows properly
- **Performance**: Optimized for mobile networks

### Mobile-Specific Features

- **Simplified Filters**: Collapsible filter panel
- **Infinite Scroll**: Better than pagination on mobile
- **Share Sheet**: Native sharing options
- **Offline Support**: Recently viewed grants cached
- **App-like Experience**: Add to home screen support

### Progressive Web App

- **Installable**: Add to home screen
- **Offline Mode**: View cached content
- **Push Notifications**: Grant updates
- **Background Sync**: Update data when online

## Advanced Features

### Search Analytics

- **Popular Searches**: See trending queries
- **Search Insights**: Understand user needs
- **No Results**: Helpful suggestions
- **Search History**: Personal search history

### Saved Searches

- **Save Searches**: Store complex queries
- **Email Alerts**: Get notified of new matches
- **RSS Feeds**: Subscribe to search results
- **Search Sharing**: Share saved searches

### API Integration

- **RESTful API**: Full programmatic access
- **API Keys**: Secure authentication
- **Rate Limiting**: Fair usage policies
- **Webhooks**: Real-time notifications

### Multi-language Support

- **Spanish**: Primary language
- **English**: Full translation available
- **Catalan**: Regional language support
- **Basque**: Regional language support
- **Galician**: Regional language support

## Tips and Tricks

### Power User Features

1. **Keyboard Shortcuts**
   - `/` - Focus search box
   - `⌘K` - Quick search
   - `Esc` - Clear search
   - `⌘/` - Show shortcuts

2. **Advanced Operators**
   - `AND` - All terms required
   - `OR` - Any term matches
   - `NOT` - Exclude terms
   - `"..."` - Exact phrase

3. **Quick Filters**
   - Click organization names in results
   - Click dates to filter by month
   - Click amounts to set range

4. **Batch Operations**
   - Select multiple grants
   - Export selected
   - Compare selected
   - Share selected

This comprehensive guide covers all major features of the BDNS Web application. Each feature is designed to make finding and managing Spanish government grants as efficient as possible.