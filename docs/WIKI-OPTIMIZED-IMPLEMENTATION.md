# 📚 BDNS Web Platform Wiki - Optimized Implementation Plan (2025)

## 🎯 Executive Summary

Based on comprehensive research of modern documentation platforms, this plan implements a **hybrid Wiki.js + Docusaurus architecture** specifically optimized for BDNS Web's requirements as a Spanish government grants database platform. This approach leverages the best of both worlds: Wiki.js for comprehensive knowledge management and Docusaurus for developer documentation.

## 🏆 Recommended Architecture: Hybrid Approach

### Core Platform Selection

**Primary Platform: Wiki.js** 
- ✅ **Native PostgreSQL integration** (matches existing BDNS infrastructure)
- ✅ **Enterprise authentication** (LDAP, SAML, OAuth2) 
- ✅ **Spanish/English multilingual support** with RTL
- ✅ **Zero licensing costs** with self-hosting
- ✅ **Government-grade security** and RBAC

**Secondary Platform: Docusaurus**
- ✅ **React-based architecture** (seamless Next.js integration)
- ✅ **Meta-maintained** (proven at enterprise scale)
- ✅ **Algolia search integration** 
- ✅ **Perfect for API documentation**
- ✅ **Built-in i18n support**

### Architecture Overview

```
BDNS Wiki Hybrid Architecture
├── 🏠 Wiki.js (Primary Knowledge Base)
│   ├── User Guides & Tutorials
│   ├── Administrative Documentation  
│   ├── Troubleshooting Knowledge Base
│   ├── Community Contributions
│   └── Multilingual Content Management
├── 📖 Docusaurus (Developer Docs)
│   ├── API Reference Documentation
│   ├── Component Library Docs
│   ├── Technical Integration Guides
│   └── Code Examples & SDKs
├── 🔍 Unified Search Layer
│   ├── Elasticsearch (Advanced Search)
│   ├── Typesense (Instant Search)
│   └── Cross-Platform Search API
└── 🔗 Integration Bridge
    ├── Single Sign-On (NextAuth.js)
    ├── Unified Navigation
    ├── Cross-References
    └── Shared Analytics
```

## 🛠️ Technical Implementation Strategy

### Phase 1: Wiki.js Foundation (4-6 weeks)

#### Infrastructure Setup
```yaml
# Docker Compose Configuration
version: '3.8'
services:
  wikijs:
    image: requarks/wiki:2
    environment:
      DB_TYPE: postgres
      DB_HOST: bdns-web_postgres_1
      DB_PORT: 5432
      DB_USER: ${DATABASE_USER}
      DB_PASS: ${DATABASE_PASSWORD}
      DB_NAME: wikijs_db
    ports:
      - "3003:3000"
    volumes:
      - wiki-content:/wiki/data/content
      - wiki-uploads:/wiki/data/uploads
    depends_on:
      - postgres

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
```

#### Database Integration
```sql
-- Create dedicated Wiki.js database
CREATE DATABASE wikijs_db;
CREATE USER wikijs_user WITH PASSWORD 'secure_wiki_password';
GRANT ALL PRIVILEGES ON DATABASE wikijs_db TO wikijs_user;

-- Create shared content bridge tables
CREATE TABLE wiki_bdns_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wiki_page_id VARCHAR(255) NOT NULL,
    bdns_grant_id INTEGER REFERENCES convocatorias(id),
    bdns_organization_id INTEGER REFERENCES organizations(id),
    reference_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Authentication Integration
```typescript
// Wiki.js SSO Configuration
interface WikiAuthConfig {
  strategy: 'oauth2';
  clientId: process.env.NEXTAUTH_CLIENT_ID;
  clientSecret: process.env.NEXTAUTH_CLIENT_SECRET;
  authorizationURL: 'http://localhost:3001/api/auth/signin';
  tokenURL: 'http://localhost:3001/api/auth/token';
  userInfoURL: 'http://localhost:3001/api/auth/userinfo';
  scope: ['openid', 'profile', 'email'];
}
```

### Phase 2: Docusaurus Integration (3-4 weeks)

#### Setup and Configuration
```bash
# Create Docusaurus instance
npx create-docusaurus@latest bdns-docs classic --typescript
cd bdns-docs

# Install additional packages
npm install --save @docusaurus/theme-search-algolia
npm install --save @docusaurus/plugin-content-docs
npm install --save @docusaurus/plugin-content-pages
```

#### Configuration
```typescript
// docusaurus.config.ts
const config: Config = {
  title: 'BDNS Web Developer Documentation',
  tagline: 'Technical documentation for Spanish grants database',
  url: 'https://docs.bdns-web.es',
  baseUrl: '/docs/',
  
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'ca', 'eu', 'gl'],
  },
  
  themeConfig: {
    navbar: {
      title: 'BDNS Docs',
      logo: {
        alt: 'BDNS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'http://localhost:3003', // Link to Wiki.js
          label: 'Knowledge Base',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    
    algolia: {
      appId: 'BDNS_SEARCH_APP_ID',
      apiKey: 'search_api_key',
      indexName: 'bdns_docs',
    },
  },
};
```

### Phase 3: Advanced Search Implementation (4-5 weeks)

#### Elasticsearch + Typesense Hybrid
```typescript
// Unified Search Service
class BDNSWikiSearchService {
  private elasticsearch: Client;
  private typesense: Client;
  
  constructor() {
    this.elasticsearch = new Client({
      node: 'http://localhost:9200'
    });
    
    this.typesense = new Typesense.Client({
      nodes: [{
        host: 'localhost',
        port: 8108,
        protocol: 'http'
      }]
    });
  }
  
  async search(query: string, scope: 'wiki' | 'docs' | 'all' = 'all'): Promise<SearchResult[]> {
    const results = await Promise.allSettled([
      this.searchWikiJS(query, scope),
      this.searchDocusaurus(query, scope),
      this.searchBDNSContent(query, scope)
    ]);
    
    return this.mergeAndRankResults(results);
  }
  
  private async searchWikiJS(query: string, scope: string): Promise<SearchResult[]> {
    // Search Wiki.js content via Elasticsearch
    const response = await this.elasticsearch.search({
      index: 'wikijs_content',
      body: {
        query: {
          multi_match: {
            query,
            fields: ['title^3', 'content', 'tags^2'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        },
        highlight: {
          fields: {
            content: { fragment_size: 200 }
          }
        }
      }
    });
    
    return this.formatElasticsearchResults(response, 'wiki');
  }
  
  private async searchDocusaurus(query: string, scope: string): Promise<SearchResult[]> {
    // Search Docusaurus content via Algolia/Typesense
    return await this.typesense.collections('docusaurus_content').documents().search({
      q: query,
      query_by: 'title,content,headings',
      highlight_full_fields: 'content',
      snippet_threshold: 10
    });
  }
}
```

### Phase 4: Integration Layer (3-4 weeks)

#### Unified Navigation Component
```typescript
// src/components/wiki/UnifiedNavigation.tsx
interface WikiNavigationProps {
  currentPlatform: 'main' | 'wiki' | 'docs';
  user: User | null;
}

export const UnifiedWikiNavigation: React.FC<WikiNavigationProps> = ({ 
  currentPlatform, 
  user 
}) => {
  return (
    <nav className="wiki-unified-nav">
      <div className="nav-platforms">
        <Link 
          href="/"
          className={currentPlatform === 'main' ? 'active' : ''}
        >
          🏠 BDNS Web
        </Link>
        <Link 
          href="/wiki"
          className={currentPlatform === 'wiki' ? 'active' : ''}
        >
          📚 Knowledge Base
        </Link>
        <Link 
          href="/docs"
          className={currentPlatform === 'docs' ? 'active' : ''}
        >
          👨‍💻 Developer Docs
        </Link>
      </div>
      
      <UnifiedSearchBar />
      
      <div className="nav-user">
        {user && (
          <UserMenu 
            user={user}
            showWikiContributions={true}
          />
        )}
      </div>
    </nav>
  );
};
```

#### Cross-Platform Search API
```typescript
// src/app/api/wiki/unified-search/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const scope = searchParams.get('scope') as 'wiki' | 'docs' | 'all' || 'all';
  const lang = searchParams.get('lang') || 'es';
  
  const searchService = new BDNSWikiSearchService();
  const results = await searchService.search(query, scope);
  
  // Add BDNS-specific context
  const enrichedResults = await Promise.all(
    results.map(async (result) => ({
      ...result,
      relatedGrants: await findRelatedGrants(result.content),
      relatedOrganizations: await findRelatedOrganizations(result.content),
      suggestedActions: generateActionSuggestions(result.type, result.content)
    }))
  );
  
  return NextResponse.json({
    success: true,
    data: {
      results: enrichedResults,
      total: results.length,
      searchTime: performance.now(),
      suggestions: await generateSearchSuggestions(query, lang)
    }
  });
}
```

## 🌐 Multilingual Implementation Strategy

### Content Structure
```
📁 Content Organization
├── 🇪🇸 Spanish (Primary)
│   ├── Guías de Usuario
│   ├── Documentación Técnica
│   ├── Resolución de Problemas
│   └── Base de Conocimientos
├── 🇺🇸 English (Secondary)
│   ├── User Guides
│   ├── Technical Documentation
│   ├── Troubleshooting
│   └── Knowledge Base
├── 🇨🇦 Catalan (Regional)
├── 🇪🇺 Basque (Regional)
└── 🇬🇱 Galician (Regional)
```

### Translation Workflow
```typescript
// Translation Management System
interface TranslationWorkflow {
  sourceLanguage: 'es';
  targetLanguages: ['en', 'ca', 'eu', 'gl'];
  automatedTranslation: {
    engine: 'DeepL Pro' | 'Google Translate';
    confidence: number;
    humanReview: boolean;
  };
  workflow: {
    draft: 'auto-translate',
    review: 'human-editor',
    approval: 'content-manager',
    publish: 'automated'
  };
}
```

## 🔐 Security and Compliance Implementation

### Government-Grade Security
```typescript
// Security Configuration
const securityConfig = {
  authentication: {
    providers: ['LDAP', 'SAML', 'OAuth2', 'Azure AD'],
    mfa: {
      required: true,
      methods: ['totp', 'email', 'sms']
    }
  },
  
  authorization: {
    rbac: {
      roles: ['reader', 'contributor', 'moderator', 'admin'],
      permissions: ['read', 'write', 'delete', 'moderate', 'admin']
    },
    pageLevel: true,
    sectionLevel: true
  },
  
  dataProtection: {
    encryption: {
      atRest: 'AES-256',
      inTransit: 'TLS 1.3'
    },
    backup: {
      encrypted: true,
      retention: '7 years',
      location: 'EU-compliant'
    }
  },
  
  compliance: {
    gdpr: true,
    nis2: true,
    incibe: true,
    sara: true
  }
};
```

### Audit Logging
```sql
-- Comprehensive Audit Trail
CREATE TABLE wiki_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retention policy (7 years for government compliance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM wiki_audit_log 
    WHERE timestamp < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;
```

## 📊 Performance Optimization Strategy

### Caching Architecture
```typescript
// Multi-Layer Caching Strategy
interface CachingStrategy {
  layers: {
    cdn: {
      provider: 'Cloudflare' | 'AWS CloudFront';
      ttl: '1 hour';
      purgeStrategy: 'tag-based';
    };
    
    applicationCache: {
      provider: 'Redis';
      strategy: 'LRU';
      maxMemory: '2GB';
    };
    
    databaseCache: {
      queryCache: true;
      resultCache: '15 minutes';
      indexOptimization: true;
    };
  };
  
  performance: {
    targetLoadTime: '< 2 seconds';
    searchResponseTime: '< 100ms';
    cacheHitRatio: '> 85%';
  };
}
```

### Search Performance
```typescript
// Optimized Search Indices
const searchOptimization = {
  elasticsearch: {
    indexSettings: {
      number_of_shards: 3,
      number_of_replicas: 1,
      refresh_interval: '5s'
    },
    analyzers: {
      spanish: 'spanish',
      english: 'english',
      multilingual: 'icu_analyzer'
    }
  },
  
  typesense: {
    schema: {
      name: 'wiki_content',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'tags', type: 'string[]' },
        { name: 'language', type: 'string', facet: true },
        { name: 'updated_at', type: 'int64', sort: true }
      ]
    }
  }
};
```

## 🚀 Implementation Timeline

### Phase 1: Foundation Setup (Weeks 1-6)
- **Week 1-2**: Infrastructure setup (Docker, databases, networking)
- **Week 3-4**: Wiki.js installation and basic configuration
- **Week 5-6**: Authentication integration and user management

### Phase 2: Content Platform (Weeks 7-10)
- **Week 7-8**: Docusaurus setup and API documentation structure
- **Week 9-10**: Content migration from existing documentation

### Phase 3: Advanced Features (Weeks 11-15)
- **Week 11-12**: Search implementation (Elasticsearch + Typesense)
- **Week 13-14**: Multilingual setup and translation workflows
- **Week 15**: Integration layer and unified navigation

### Phase 4: Optimization & Launch (Weeks 16-18)
- **Week 16**: Performance optimization and caching
- **Week 17**: Security hardening and compliance validation
- **Week 18**: User testing, training, and go-live

## 💰 Cost Analysis

### Infrastructure Costs (Monthly)
```yaml
Infrastructure:
  Database (PostgreSQL): €150-300
  Search (Elasticsearch): €200-400
  CDN (Cloudflare): €50-150
  Compute (3 containers): €300-600
  Storage (100GB): €50-100
  Backup & Security: €100-200
  
Total Monthly: €850-1,750

Annual Cost: €10,200-21,000
```

### Development Investment
```yaml
Development:
  Setup & Configuration: 40-60 hours
  Custom Development: 80-120 hours
  Content Migration: 60-100 hours
  Testing & Optimization: 40-60 hours
  
Total: 220-340 hours
Estimated Cost: €33,000-51,000 (one-time)
```

### ROI Calculation
```yaml
Benefits:
  Developer Productivity: +35% (€50,000/year saved)
  Support Ticket Reduction: -40% (€25,000/year saved)
  Onboarding Efficiency: +50% (€15,000/year saved)
  
Total Annual Savings: €90,000
Break-even: 4-7 months
```

## 🎯 Success Metrics & KPIs

### User Adoption
- **Content Creation**: 50+ pages/month by month 6
- **Active Users**: 200+ monthly active users
- **Search Usage**: 1,000+ searches/day
- **Contribution Rate**: 25% of users contributing content

### Technical Performance
- **Page Load**: < 2 seconds (95th percentile)
- **Search Speed**: < 100ms average response
- **Uptime**: 99.9% availability
- **Cache Hit**: > 85% cache hit ratio

### Content Quality
- **Coverage**: 100% feature documentation
- **Freshness**: < 30 days average content age
- **Accuracy**: > 95% user satisfaction rating
- **Multilingual**: 100% Spanish, 80% English coverage

## 🔄 Migration Strategy

### Content Audit and Preparation
```bash
# Content Migration Script
#!/bin/bash

# 1. Audit existing documentation
echo "Auditing existing documentation..."
find docs/ -name "*.md" -exec wc -l {} + > content_audit.txt

# 2. Extract metadata
echo "Extracting metadata..."
python3 scripts/extract_metadata.py docs/ > content_metadata.json

# 3. Convert format if needed
echo "Converting formats..."
pandoc -f markdown -t wikijs docs/*.md

# 4. Validate links and references
echo "Validating links..."
markdown-link-check docs/**/*.md
```

### Phased Rollout Plan
1. **Pilot Phase** (Week 1-2): Core team + power users (10 users)
2. **Beta Phase** (Week 3-4): Extended team (50 users)
3. **Gradual Rollout** (Week 5-8): Department by department (200+ users)
4. **Full Deployment** (Week 9+): All users with legacy system deprecation

## 📚 Content Governance Framework

### Editorial Guidelines
```yaml
Content Standards:
  Writing Style: "Clear, concise, action-oriented"
  Technical Level: "Beginner to advanced with clear progression"
  Language: "Spanish primary, English secondary"
  Tone: "Professional, helpful, government-appropriate"
  
Structure:
  Headers: "H1 for page title, H2-H6 for sections"
  Links: "Descriptive anchor text, internal preference"
  Images: "Alt text required, max 2MB, WebP preferred"
  Code: "Syntax highlighting, copy button, comments"
  
Quality Control:
  Review Process: "Author → Reviewer → Approver"
  Update Frequency: "Critical: immediate, Standard: monthly"
  Accuracy Check: "Technical validation required"
  User Feedback: "Comments and ratings enabled"
```

## 🌟 Advanced Features Roadmap

### AI-Powered Enhancements (Future)
- **Content Generation**: AI-assisted documentation creation
- **Smart Translation**: Context-aware multilingual content
- **Intelligent Search**: Semantic search with query understanding
- **Personalization**: User-specific content recommendations

### Community Features
- **Expert Networks**: Connect users with subject matter experts
- **Collaborative Editing**: Real-time collaborative editing
- **Knowledge Graphs**: Visual relationship mapping
- **Gamification**: Contribution badges and leaderboards

---

## 📋 Next Steps for Implementation

1. **Infrastructure Preparation** (Week 1)
   - Set up development and staging environments
   - Configure Docker containers and networking
   - Establish CI/CD pipelines

2. **Platform Installation** (Week 2-3)
   - Deploy Wiki.js with PostgreSQL integration
   - Install and configure Docusaurus
   - Set up basic authentication bridge

3. **Content Strategy** (Week 4)
   - Complete content audit and categorization
   - Design information architecture
   - Create content templates and style guides

4. **Search Implementation** (Week 5-6)
   - Deploy Elasticsearch cluster
   - Configure Typesense for instant search
   - Build unified search API

5. **Testing and Optimization** (Week 7-8)
   - Performance testing and optimization
   - Security penetration testing
   - User acceptance testing

---

*📅 Document created: June 8, 2025*  
*👨‍💻 Optimized by: Claude Code AI Assistant*  
*🏆 Strategy: Hybrid Wiki.js + Docusaurus Implementation*  
*🎯 Timeline: 18 weeks to full deployment*  
*💰 Investment: €10-21k annually, 4-7 month ROI*