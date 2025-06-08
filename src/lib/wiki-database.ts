import { Pool } from 'pg';
import { Database } from './database';

export interface WikiCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WikiPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  content_type?: string;
  category_id?: number | null;
  author_id: string; // UUID
  status?: string;
  visibility?: string;
  featured?: boolean;
  sort_order?: number;
  view_count?: number;
  like_count?: number;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  version?: number;
  parent_page_id?: number | null;
  published_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  search_vector?: any;
  category?: WikiCategory;
  tags?: WikiTag[];
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WikiTag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface WikiPageRevision {
  id: number;
  page_id: number;
  title: string;
  content: string;
  content_type: string;
  author_id: string; // UUID
  version: number;
  change_summary: string | null;
  created_at: Date;
}

export interface WikiComment {
  id: number;
  page_id: number;
  author_id: string; // UUID
  content: string;
  parent_id: number | null;
  status: string;
  upvotes: number;
  downvotes: number;
  created_at: Date;
  updated_at: Date;
  edited_at: Date | null;
}

export interface WikiSearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category_name: string;
  rank: number;
  headline: string;
}

export class WikiDatabase {
  private pool: Pool;
  private db: Database;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
    });
    this.db = Database.getInstance();
  }

  // Categories
  async getCategories(includeInactive = false): Promise<WikiCategory[]> {
    const query = `
      SELECT * FROM wiki_categories
      ${!includeInactive ? 'WHERE is_active = true' : ''}
      ORDER BY parent_id NULLS FIRST, sort_order, name
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCategoryBySlug(slug: string): Promise<WikiCategory | null> {
    const query = 'SELECT * FROM wiki_categories WHERE slug = $1 AND is_active = true';
    const result = await this.pool.query(query, [slug]);
    return result.rows[0] || null;
  }

  // Pages
  async getPages(options: {
    categoryId?: number;
    status?: string;
    visibility?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  } = {}): Promise<{ pages: WikiPage[]; total: number }> {
    const {
      categoryId,
      status = 'published',
      visibility = 'public',
      limit = 20,
      offset = 0,
      orderBy = 'updated_at DESC'
    } = options;

    let whereConditions = ['status = $1', 'visibility = $2'];
    let params: any[] = [status, visibility];
    let paramIndex = 3;

    if (categoryId) {
      whereConditions.push(`category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM wiki_pages ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get pages with category and author info
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name,
        u.email as author_email
      FROM wiki_pages p
      LEFT JOIN wiki_categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    
    const pages = result.rows.map(row => ({
      ...row,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug
      } : null,
      author: {
        id: row.author_id,
        name: row.author_name || 'Unknown',
        email: row.author_email || ''
      }
    }));

    return { pages, total };
  }

  async getPageBySlug(slug: string): Promise<WikiPage | null> {
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name,
        u.email as author_email
      FROM wiki_pages p
      LEFT JOIN wiki_categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.slug = $1 AND p.status = 'published'
    `;
    const result = await this.pool.query(query, [slug]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const page: WikiPage = {
      ...row,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug
      } : null,
      author: {
        id: row.author_id,
        name: row.author_name || 'Unknown',
        email: row.author_email || ''
      }
    };

    // Get tags
    const tagsQuery = `
      SELECT t.* FROM wiki_tags t
      JOIN wiki_page_tags pt ON t.id = pt.tag_id
      WHERE pt.page_id = $1
      ORDER BY t.name
    `;
    const tagsResult = await this.pool.query(tagsQuery, [page.id]);
    page.tags = tagsResult.rows;

    // Increment view count
    await this.pool.query(
      'UPDATE wiki_pages SET view_count = view_count + 1 WHERE id = $1',
      [page.id]
    );

    return page;
  }

  async createPage(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    content_type?: string;
    category_id?: number;
    author_id: string; // UUID
    status?: string;
    visibility?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    tags?: number[];
  }): Promise<WikiPage> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert page
      const insertQuery = `
        INSERT INTO wiki_pages (
          title, slug, content, excerpt, content_type,
          category_id, author_id, status, visibility,
          meta_title, meta_description, meta_keywords,
          published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        data.title,
        data.slug,
        data.content,
        data.excerpt || null,
        data.content_type || 'markdown',
        data.category_id || null,
        data.author_id,
        data.status || 'draft',
        data.visibility || 'public',
        data.meta_title || null,
        data.meta_description || null,
        data.meta_keywords || null,
        data.status === 'published' ? new Date() : null
      ];

      const result = await client.query(insertQuery, values);
      const page = result.rows[0];

      // Create initial revision
      await client.query(
        `INSERT INTO wiki_page_revisions (
          page_id, title, content, content_type, author_id, version, change_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          page.id,
          data.title,
          data.content,
          data.content_type || 'markdown',
          data.author_id,
          1,
          'Initial version'
        ]
      );

      // Add tags if provided
      if (data.tags && data.tags.length > 0) {
        const tagValues = data.tags.map((tagId, index) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        await client.query(
          `INSERT INTO wiki_page_tags (page_id, tag_id) VALUES ${tagValues}`,
          [page.id, ...data.tags]
        );
      }

      await client.query('COMMIT');
      return page;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePage(id: number, data: {
    title?: string;
    content?: string;
    excerpt?: string;
    category_id?: number;
    status?: string;
    visibility?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    tags?: number[];
    author_id: string; // UUID
    revision_comment?: string;
  }): Promise<WikiPage> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current page data
      const currentPage = await client.query(
        'SELECT * FROM wiki_pages WHERE id = $1',
        [id]
      );
      
      if (currentPage.rows.length === 0) {
        throw new Error('Page not found');
      }

      const oldPage = currentPage.rows[0];

      // Update page
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }
      if (data.content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        values.push(data.content);
      }
      if (data.excerpt !== undefined) {
        updateFields.push(`excerpt = $${paramIndex++}`);
        values.push(data.excerpt);
      }
      if (data.category_id !== undefined) {
        updateFields.push(`category_id = $${paramIndex++}`);
        values.push(data.category_id);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
        if (data.status === 'published' && oldPage.status !== 'published') {
          updateFields.push(`published_at = $${paramIndex++}`);
          values.push(new Date());
        }
      }
      if (data.visibility !== undefined) {
        updateFields.push(`visibility = $${paramIndex++}`);
        values.push(data.visibility);
      }
      if (data.meta_title !== undefined) {
        updateFields.push(`meta_title = $${paramIndex++}`);
        values.push(data.meta_title);
      }
      if (data.meta_description !== undefined) {
        updateFields.push(`meta_description = $${paramIndex++}`);
        values.push(data.meta_description);
      }
      if (data.meta_keywords !== undefined) {
        updateFields.push(`meta_keywords = $${paramIndex++}`);
        values.push(data.meta_keywords);
      }

      updateFields.push(`last_edited_by = $${paramIndex++}`);
      values.push(data.author_id);
      updateFields.push(`last_edited_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(id);

      const updateQuery = `
        UPDATE wiki_pages 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const updatedPage = result.rows[0];

      // Create revision if content or title changed
      if (data.content !== undefined || data.title !== undefined) {
        // Get the next version number
        const versionResult = await client.query(
          'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM wiki_page_revisions WHERE page_id = $1',
          [id]
        );
        const nextVersion = versionResult.rows[0].next_version;
        
        await client.query(
          `INSERT INTO wiki_page_revisions (
            page_id, title, content, content_type, author_id, version, change_summary
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            data.title || oldPage.title,
            data.content || oldPage.content,
            oldPage.content_type,
            data.author_id,
            nextVersion,
            data.revision_comment || 'Updated page'
          ]
        );
      }

      // Update tags if provided
      if (data.tags !== undefined) {
        // Remove existing tags
        await client.query('DELETE FROM wiki_page_tags WHERE page_id = $1', [id]);
        
        // Add new tags
        if (data.tags.length > 0) {
          const tagValues = data.tags.map((tagId, index) => 
            `($1, $${index + 2})`
          ).join(', ');
          
          await client.query(
            `INSERT INTO wiki_page_tags (page_id, tag_id) VALUES ${tagValues}`,
            [id, ...data.tags]
          );
        }
      }

      await client.query('COMMIT');
      return updatedPage;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePage(id: number): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM wiki_pages WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  // Search
  async searchPages(query: string, options: {
    categoryId?: number;
    tagIds?: number[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ results: WikiSearchResult[]; total: number }> {
    const { categoryId, tagIds, limit = 20, offset = 0 } = options;

    let whereConditions = [
      "p.status = 'published'",
      "p.visibility = 'public'",
      "p.search_vector @@ websearch_to_tsquery('spanish', $1)"
    ];
    let params: any[] = [query];
    let paramIndex = 2;

    if (categoryId) {
      whereConditions.push(`p.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (tagIds && tagIds.length > 0) {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM wiki_page_tags pt 
          WHERE pt.page_id = p.id AND pt.tag_id = ANY($${paramIndex})
        )
      `);
      params.push(tagIds);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM wiki_pages p
      WHERE ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get search results with ranking
    const searchQuery = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        c.name as category_name,
        ts_rank(p.search_vector, websearch_to_tsquery('spanish', $1)) as rank,
        ts_headline(
          'spanish',
          p.content,
          websearch_to_tsquery('spanish', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25'
        ) as headline
      FROM wiki_pages p
      LEFT JOIN wiki_categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY rank DESC, p.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.pool.query(searchQuery, params);
    
    return {
      results: result.rows,
      total
    };
  }

  // Tags
  async getTags(): Promise<WikiTag[]> {
    const query = 'SELECT * FROM wiki_tags ORDER BY usage_count DESC, name';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getTagBySlug(slug: string): Promise<WikiTag | null> {
    const query = 'SELECT * FROM wiki_tags WHERE slug = $1';
    const result = await this.pool.query(query, [slug]);
    return result.rows[0] || null;
  }

  // Comments
  async getPageComments(pageId: number): Promise<WikiComment[]> {
    const query = `
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM wiki_comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.page_id = $1 AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `;
    const result = await this.pool.query(query, [pageId]);
    return result.rows;
  }

  async createComment(data: {
    page_id: number;
    author_id: string; // UUID
    content: string;
    parent_id?: number;
  }): Promise<WikiComment> {
    const query = `
      INSERT INTO wiki_comments (page_id, author_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      data.page_id,
      data.author_id,
      data.content,
      data.parent_id || null
    ];
    const result = await this.pool.query(query, values);
    
    // Update comment count
    await this.pool.query(
      'UPDATE wiki_pages SET comment_count = comment_count + 1 WHERE id = $1',
      [data.page_id]
    );
    
    return result.rows[0];
  }

  // Revisions
  async getPageRevisions(pageId: number, limit = 50): Promise<WikiPageRevision[]> {
    const query = `
      SELECT 
        r.*,
        u.name as author_name,
        u.email as author_email
      FROM wiki_page_revisions r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.page_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [pageId, limit]);
    return result.rows;
  }

  async getRevision(revisionId: number): Promise<WikiPageRevision | null> {
    const query = `
      SELECT 
        r.*,
        u.name as author_name,
        u.email as author_email
      FROM wiki_page_revisions r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.id = $1
    `;
    const result = await this.pool.query(query, [revisionId]);
    return result.rows[0] || null;
  }

  // Analytics
  async recordPageView(pageId: number, userId?: string, ipAddress?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO wiki_page_views (page_id, user_id, ip_address)
       VALUES ($1, $2, $3)`,
      [pageId, userId || null, ipAddress || null]
    );
  }

  async getPopularPages(limit = 10): Promise<WikiPage[]> {
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM wiki_pages p
      LEFT JOIN wiki_categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.visibility = 'public'
      ORDER BY p.view_count DESC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getRecentPages(limit = 10): Promise<WikiPage[]> {
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM wiki_pages p
      LEFT JOIN wiki_categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.visibility = 'public'
      ORDER BY p.published_at DESC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }
}

// Export singleton instance
export const wikiDb = new WikiDatabase();