const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
});

const wikiPages = [
  {
    title: 'Guía de Inicio - BDNS Web',
    slug: 'guia-inicio',
    content: `# Guía de Inicio - BDNS Web

## ¿Qué es BDNS Web?

BDNS Web es una plataforma de búsqueda avanzada que proporciona acceso rápido y eficiente a la Base de Datos Nacional de Subvenciones (BDNS) de España. Nuestro sistema crea una réplica local de los datos oficiales para ofrecer búsquedas ultrarrápidas y funciones avanzadas.

## Características Principales

### 🔍 Búsqueda Avanzada
- **Búsqueda por texto completo** en todos los campos
- **Filtros múltiples**: organismo, fecha, importe, estado
- **Ordenamiento flexible** de resultados
- **Búsqueda en español** con soporte para sinónimos

### ⭐ Sistema de Favoritos
- Guarda convocatorias de tu interés
- Organiza tus favoritos con etiquetas
- Acceso rápido desde tu perfil

### 🔔 Seguimiento en Tiempo Real
- Recibe notificaciones de nuevas convocatorias
- Alertas personalizadas por criterios
- Historial de cambios en convocatorias

### 📊 Gestión de Datos
- Sincronización automática con BDNS oficial
- Actualizaciones diarias de nuevas convocatorias
- Estadísticas en tiempo real

## Cómo Empezar

### 1. Crear una Cuenta
Para aprovechar todas las funciones, crea una cuenta gratuita:
1. Haz clic en "Registrarse" en la barra superior
2. Completa el formulario con tu información
3. Verifica tu correo electrónico
4. ¡Listo! Ya puedes usar todas las funciones

### 2. Realizar tu Primera Búsqueda
1. Ve a la página principal
2. Escribe términos de búsqueda en el campo principal
3. Aplica filtros según tus necesidades
4. Explora los resultados

### 3. Guardar Favoritos
1. En cualquier convocatoria, haz clic en el icono ⭐
2. Añade notas personales si lo deseas
3. Accede a tus favoritos desde el menú principal

## Preguntas Frecuentes

### ¿Con qué frecuencia se actualizan los datos?
Los datos se sincronizan automáticamente cada 24 horas con la BDNS oficial. También puedes ver el estado de la última sincronización en la página de "Gestión de Datos".

### ¿Puedo exportar los resultados?
Sí, puedes exportar los resultados de búsqueda en formato CSV o Excel desde la página de resultados.

### ¿Es gratuito el servicio?
Sí, BDNS Web es completamente gratuito para uso personal y profesional.

## Soporte

Si necesitas ayuda adicional:
- Consulta nuestra [documentación completa](/wiki/documentacion-completa)
- Revisa las [preguntas frecuentes](/wiki/faq)
- Contacta con soporte: soporte@bdnsweb.es`,
    excerpt: 'Aprende a usar BDNS Web para buscar subvenciones de manera eficiente',
    category_id: 1, // Guía de Usuario
    author_id: 'a839c4ca-e6c3-44e0-b1aa-6147422e9041', // system user
    status: 'published',
    visibility: 'public',
    tags: [1, 5] // guia-inicio, busqueda
  },
  {
    title: 'Documentación API - Integración con BDNS',
    slug: 'api-documentation',
    content: `# Documentación API - BDNS Web

## Introducción

La API de BDNS Web proporciona acceso programático a todos los datos de subvenciones disponibles en nuestra plataforma. Esta documentación cubre todos los endpoints disponibles y cómo utilizarlos.

## Autenticación

Todos los endpoints de la API requieren autenticación mediante token JWT:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.bdnsweb.es/v1/convocatorias
\`\`\`

### Obtener Token

\`\`\`bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "tu@email.com",
  "password": "tu_contraseña"
}
\`\`\`

## Endpoints Principales

### 1. Búsqueda de Convocatorias

\`\`\`bash
GET /api/search
\`\`\`

**Parámetros:**
- \`q\` (string): Términos de búsqueda
- \`organismo\` (string): Filtrar por organismo
- \`fechaDesde\` (date): Fecha inicio del rango
- \`fechaHasta\` (date): Fecha fin del rango
- \`importeMin\` (number): Importe mínimo
- \`importeMax\` (number): Importe máximo
- \`limit\` (number): Número de resultados por página
- \`offset\` (number): Desplazamiento para paginación

**Ejemplo de respuesta:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "codigo": "BDNS-123456",
      "titulo": "Subvención para innovación tecnológica",
      "organismo": "Ministerio de Ciencia",
      "importe": 50000,
      "fecha_publicacion": "2024-01-15"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
\`\`\`

### 2. Detalle de Convocatoria

\`\`\`bash
GET /api/convocatoria/{id}
\`\`\`

### 3. Exportar Resultados

\`\`\`bash
POST /api/export
Content-Type: application/json

{
  "format": "csv",
  "filters": {
    "q": "innovación",
    "organismo": "Ministerio"
  }
}
\`\`\`

## Límites de Uso

- **Requests por minuto**: 60
- **Requests por hora**: 1000
- **Tamaño máximo de respuesta**: 10MB

## Códigos de Error

- \`400\`: Petición incorrecta
- \`401\`: No autorizado
- \`403\`: Prohibido
- \`404\`: No encontrado
- \`429\`: Demasiadas peticiones
- \`500\`: Error del servidor

## SDKs y Librerías

### JavaScript/TypeScript
\`\`\`bash
npm install @bdnsweb/sdk
\`\`\`

### Python
\`\`\`bash
pip install bdnsweb-sdk
\`\`\`

## Ejemplos de Integración

### Node.js
\`\`\`javascript
const BDNSClient = require('@bdnsweb/sdk');

const client = new BDNSClient({
  apiKey: 'YOUR_API_KEY'
});

const results = await client.search({
  q: 'innovación',
  limit: 50
});
\`\`\`

### Python
\`\`\`python
from bdnsweb import BDNSClient

client = BDNSClient(api_key='YOUR_API_KEY')
results = client.search(q='innovación', limit=50)
\`\`\``,
    excerpt: 'Documentación completa para integrar tu aplicación con la API de BDNS Web',
    category_id: 2, // API y Desarrollo
    author_id: 'a839c4ca-e6c3-44e0-b1aa-6147422e9041', // system user
    status: 'published',
    visibility: 'public',
    tags: [2, 3] // api, integracion
  },
  {
    title: 'Preguntas Frecuentes (FAQ)',
    slug: 'faq',
    content: `# Preguntas Frecuentes

## General

### ¿Qué es BDNS?
La Base de Datos Nacional de Subvenciones (BDNS) es el sistema nacional de publicidad de subvenciones gestionado por el Ministerio de Hacienda de España.

### ¿Cómo se relaciona BDNS Web con la BDNS oficial?
BDNS Web es una plataforma independiente que sincroniza datos públicos de la BDNS oficial para proporcionar funcionalidades adicionales de búsqueda y seguimiento.

### ¿Los datos son oficiales?
Sí, todos los datos provienen de la BDNS oficial. Sin embargo, siempre recomendamos verificar la información directamente en las fuentes oficiales antes de presentar una solicitud.

## Cuenta y Acceso

### ¿Necesito una cuenta para buscar?
No, la búsqueda básica está disponible sin registro. Sin embargo, funciones como favoritos y seguimiento requieren una cuenta gratuita.

### ¿Cómo recupero mi contraseña?
1. Ve a la página de inicio de sesión
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Introduce tu email
4. Sigue las instrucciones enviadas a tu correo

### ¿Puedo tener múltiples cuentas?
Cada email solo puede estar asociado a una cuenta. Para organizaciones, recomendamos usar cuentas de equipo.

## Búsquedas y Filtros

### ¿Qué campos se incluyen en la búsqueda?
La búsqueda incluye:
- Título de la convocatoria
- Descripción
- Organismo convocante
- Beneficiarios
- Objeto de la subvención

### ¿Puedo buscar por CNAE?
Sí, puedes buscar por código CNAE en el campo de búsqueda principal o usar el filtro específico.

### ¿Cómo funcionan los filtros de fecha?
Los filtros de fecha se aplican a la fecha de publicación de la convocatoria. Puedes establecer rangos usando "Desde" y "Hasta".

## Favoritos y Seguimiento

### ¿Cuántos favoritos puedo guardar?
No hay límite en el número de favoritos que puedes guardar.

### ¿Recibiré notificaciones de cambios en mis favoritos?
Sí, si activas las notificaciones en tu perfil, recibirás alertas cuando haya cambios en las convocatorias guardadas.

### ¿Puedo exportar mis favoritos?
Sí, desde la página de favoritos puedes exportar la lista en formato CSV o Excel.

## Datos y Sincronización

### ¿Con qué frecuencia se actualizan los datos?
- **Sincronización automática**: Cada 24 horas
- **Nuevas convocatorias**: Se detectan en tiempo real
- **Actualizaciones**: Se procesan cada 6 horas

### ¿Qué pasa si encuentro un error en los datos?
Puedes reportar errores usando el botón "Reportar" en cada convocatoria. Verificaremos y corregiremos si es necesario.

### ¿Hasta qué fecha hay datos históricos?
Nuestra base de datos contiene convocatorias desde 2008 hasta la actualidad.

## Técnico

### ¿La plataforma tiene API?
Sí, ofrecemos una API REST completa. Consulta la [documentación de API](/wiki/api-documentation).

### ¿Es el código fuente abierto?
Actualmente no, pero estamos considerando liberar ciertas partes del sistema.

### ¿Qué tecnologías usan?
- Frontend: Next.js 14, React, TypeScript
- Backend: Node.js, PostgreSQL
- Búsqueda: PostgreSQL Full-Text Search

## Soporte

### ¿Cómo contacto con soporte?
- Email: soporte@bdnsweb.es
- Formulario: [Contacto](/contacto)
- Respuesta típica: 24-48 horas

### ¿Ofrecen formación?
Sí, ofrecemos webinars gratuitos mensuales y formación personalizada para organizaciones.

### ¿Hay documentación en otros idiomas?
Actualmente solo en español, pero estamos trabajando en versiones en catalán, euskera y gallego.`,
    excerpt: 'Respuestas a las preguntas más comunes sobre BDNS Web',
    category_id: 6, // Soporte y Ayuda
    author_id: 'a839c4ca-e6c3-44e0-b1aa-6147422e9041', // system user
    status: 'published',
    visibility: 'public',
    tags: [7, 8] // faq, ayuda
  },
  {
    title: 'Guía de Búsqueda Avanzada',
    slug: 'busqueda-avanzada',
    content: `# Guía de Búsqueda Avanzada

## Operadores de Búsqueda

### Búsqueda Exacta
Usa comillas para buscar frases exactas:
- \`"economía circular"\` - Encuentra exactamente esa frase
- \`"Ministerio de Industria"\` - Busca el nombre completo

### Operadores Booleanos
- **AND**: \`innovación AND tecnología\` - Ambos términos deben aparecer
- **OR**: \`pyme OR autónomo\` - Cualquiera de los términos
- **NOT**: \`subvención NOT reembolsable\` - Excluye términos

### Comodines
- \`innova*\` - Encuentra innovación, innovador, innovar, etc.
- \`digit?l\` - Encuentra digital o digitel

## Filtros Avanzados

### Por Organismo
1. **Búsqueda jerárquica**: Selecciona ministerios para incluir todos sus organismos dependientes
2. **Múltiple selección**: Mantén Ctrl para seleccionar varios organismos
3. **Búsqueda rápida**: Escribe en el campo para filtrar la lista

### Por Importe
- **Rangos predefinidos**: Usa los botones rápidos
- **Rango personalizado**: Introduce valores mínimo y máximo
- **Sin límite**: Deja vacío para no aplicar restricción

### Por Fecha
- **Últimos 30 días**: Convocatorias recientes
- **Año actual**: Solo convocatorias de 2024
- **Rango personalizado**: Selecciona fechas específicas

### Por Tipo de Beneficiario
- Personas físicas
- PYMES
- Grandes empresas
- Entidades sin ánimo de lucro
- Administraciones públicas

## Ejemplos de Búsquedas

### Para Startups
\`\`\`
"startup" OR "empresa innovadora" AND tecnología
Filtros: 
- Importe: 10.000€ - 100.000€
- Beneficiario: PYMES
\`\`\`

### Para Investigación
\`\`\`
I+D+i OR investigación NOT "reembolsable"
Filtros:
- Organismo: Ministerio de Ciencia
- Importe: > 50.000€
\`\`\`

### Para Sostenibilidad
\`\`\`
"economía circular" OR "eficiencia energética" OR sostenib*
Filtros:
- Fecha: Últimos 6 meses
- Tipo: Subvención directa
\`\`\`

## Guardar Búsquedas

### Crear Alertas
1. Realiza una búsqueda con tus criterios
2. Haz clic en "Guardar búsqueda"
3. Activa notificaciones para recibir alertas

### Búsquedas Favoritas
- Accede rápidamente a búsquedas frecuentes
- Comparte búsquedas con tu equipo
- Exporta resultados automáticamente

## Tips y Trucos

### 1. Usa el Historial
El sistema guarda tu historial de búsqueda para acceso rápido.

### 2. Combina Filtros
Los mejores resultados se obtienen combinando texto y filtros.

### 3. Revisa Sinónimos
El sistema incluye sinónimos automáticamente (ej: "I+D" incluye "investigación y desarrollo").

### 4. Ordena Resultados
- **Por relevancia**: Mejor coincidencia primero
- **Por fecha**: Más recientes primero
- **Por importe**: Mayor cantidad primero

### 5. Vista Previa
Pasa el cursor sobre los resultados para ver un resumen sin abrir.

## Exportación de Resultados

### Formatos Disponibles
- **CSV**: Para análisis en Excel
- **PDF**: Para informes
- **JSON**: Para integración técnica

### Campos Exportables
- Información básica
- Datos completos
- Personalizado (selecciona campos)

## Solución de Problemas

### No encuentro resultados
1. Revisa la ortografía
2. Usa términos más generales
3. Reduce el número de filtros
4. Prueba sinónimos

### Demasiados resultados
1. Añade más términos específicos
2. Aplica filtros adicionales
3. Usa búsqueda exacta con comillas
4. Limita el rango de fechas`,
    excerpt: 'Aprende a realizar búsquedas complejas y obtener mejores resultados',
    category_id: 3, // Guías y Tutoriales
    author_id: 'a839c4ca-e6c3-44e0-b1aa-6147422e9041', // system user
    status: 'published',
    visibility: 'public',
    tags: [5, 6] // busqueda, tutorial
  }
];

async function populateWikiContent() {
  console.log('🚀 Iniciando población de contenido wiki...');
  
  try {
    for (const page of wikiPages) {
      // Check if page already exists
      const existingPage = await pool.query(
        'SELECT id FROM wiki_pages WHERE slug = $1',
        [page.slug]
      );
      
      if (existingPage.rows.length > 0) {
        console.log(`⏭️  Página '${page.title}' ya existe, saltando...`);
        continue;
      }
      
      // Insert page
      const pageResult = await pool.query(
        `INSERT INTO wiki_pages (
          title, slug, content, excerpt, category_id, author_id, 
          status, visibility, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id`,
        [
          page.title,
          page.slug,
          page.content,
          page.excerpt,
          page.category_id,
          page.author_id,
          page.status,
          page.visibility
        ]
      );
      
      const pageId = pageResult.rows[0].id;
      
      // Add tags
      if (page.tags && page.tags.length > 0) {
        for (const tagId of page.tags) {
          await pool.query(
            'INSERT INTO wiki_page_tags (page_id, tag_id) VALUES ($1, $2)',
            [pageId, tagId]
          );
        }
      }
      
      // Create initial revision
      await pool.query(
        `INSERT INTO wiki_page_revisions (
          page_id, title, content, content_type, author_id, version, change_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          pageId,
          page.title,
          page.content,
          'markdown',
          page.author_id,
          1,
          'Versión inicial'
        ]
      );
      
      console.log(`✅ Página '${page.title}' creada exitosamente`);
    }
    
    console.log('\n📊 Estadísticas finales:');
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_pages,
        COUNT(DISTINCT category_id) as categories_used,
        COUNT(DISTINCT author_id) as authors
      FROM wiki_pages
    `);
    
    console.log(`   Total páginas: ${stats.rows[0].total_pages}`);
    console.log(`   Categorías usadas: ${stats.rows[0].categories_used}`);
    console.log(`   Autores: ${stats.rows[0].authors}`);
    
  } catch (error) {
    console.error('❌ Error poblando contenido wiki:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
populateWikiContent();