import { ConvocatoriaData, ConcesionData, SearchResult } from '@/types/bdns';

// Mock data for testing while we figure out the real API
export const mockConvocatorias: ConvocatoriaData[] = [
  {
    identificador: 'CONV-2024-001',
    titulo: 'Ayudas para el desarrollo de proyectos de I+D+i en el ámbito de la inteligencia artificial',
    organoConvocante: 'Ministerio de Ciencia e Innovación',
    fechaPublicacion: new Date('2024-01-15'),
    fechaApertura: new Date('2024-02-01'),
    fechaCierre: new Date('2024-04-30'),
    importeTotal: 10000000,
    importeMaximoBeneficiario: 500000,
    objetivos: 'Fomentar la investigación y desarrollo en inteligencia artificial aplicada a sectores estratégicos como salud, energía y transporte.',
    beneficiarios: 'Empresas, universidades y centros de investigación',
    requisitos: [
      'Estar constituido como persona jurídica',
      'Tener sede social en España',
      'Proyecto con duración mínima de 18 meses',
      'Presupuesto mínimo de 100.000 euros'
    ],
    documentacionRequerida: [
      'Formulario de solicitud',
      'Memoria técnica del proyecto', 
      'Presupuesto detallado',
      'Plan de trabajo',
      'Curriculum vitae del equipo investigador'
    ],
    criteriosSeleccion: [
      'Calidad científico-técnica',
      'Viabilidad del proyecto',
      'Impacto socioeconómico esperado',
      'Capacidad del equipo investigador'
    ],
    enlaceOficial: 'https://www.ciencia.gob.es/convocatorias/ia-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1234',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1234'
  },
  {
    identificador: 'CONV-2024-002',
    titulo: 'Subvenciones para fomento del empleo juvenil en zonas rurales',
    organoConvocante: 'Ministerio de Trabajo y Economía Social',
    fechaPublicacion: new Date('2024-01-10'),
    fechaApertura: new Date('2024-01-20'),
    fechaCierre: new Date('2024-03-15'),
    importeTotal: 5000000,
    importeMaximoBeneficiario: 100000,
    objetivos: 'Promover la contratación de jóvenes menores de 30 años en municipios de menos de 20.000 habitantes.',
    beneficiarios: 'Pequeñas y medianas empresas ubicadas en zonas rurales',
    requisitos: [
      'Empresa con menos de 250 trabajadores',
      'Ubicada en municipio de menos de 20.000 habitantes',
      'Compromiso de mantenimiento del empleo por 2 años',
      'Contratación indefinida de jóvenes menores de 30 años'
    ],
    documentacionRequerida: [
      'Solicitud normalizada',
      'Plan de contratación',
      'Justificación de la ubicación rural',
      'Compromiso de mantenimiento del empleo'
    ],
    criteriosSeleccion: [
      'Número de jóvenes a contratar',
      'Grado de ruralidad del municipio',
      'Sostenibilidad del proyecto',
      'Impacto en el desarrollo local'
    ],
    enlaceOficial: 'https://www.trabajo.gob.es/convocatorias/empleo-rural-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-5678',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-5678'
  },
  {
    identificador: 'CONV-2024-003',
    titulo: 'Ayudas para la transformación digital de pymes del sector turístico',
    organoConvocante: 'Ministerio de Industria, Comercio y Turismo',
    fechaPublicacion: new Date('2024-02-01'),
    fechaApertura: new Date('2024-02-15'),
    fechaCierre: new Date('2024-05-31'),
    importeTotal: 8000000,
    importeMaximoBeneficiario: 50000,
    objetivos: 'Facilitar la digitalización de pequeñas y medianas empresas del sector turístico para mejorar su competitividad.',
    beneficiarios: 'Pymes del sector turístico',
    requisitos: [
      'Clasificación como pyme según normativa europea',
      'Actividad principal en sector turístico',
      'Proyecto de transformación digital',
      'Inversión mínima de 10.000 euros'
    ],
    documentacionRequerida: [
      'Formulario de solicitud',
      'Plan de digitalización',
      'Presupuesto de la inversión',
      'Declaración responsable',
      'Certificados de estar al corriente de obligaciones fiscales'
    ],
    criteriosSeleccion: [
      'Grado de innovación del proyecto',
      'Impacto en la competitividad',
      'Sostenibilidad económica',
      'Creación o mantenimiento de empleo'
    ],
    enlaceOficial: 'https://www.mincotur.gob.es/convocatorias/turismo-digital-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-9012',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-9012'
  },
  {
    identificador: 'CONV-2024-004',
    titulo: 'Subvenciones para proyectos de economía circular en el sector agroalimentario',
    organoConvocante: 'Ministerio de Agricultura, Pesca y Alimentación',
    fechaPublicacion: new Date('2024-01-20'),
    fechaApertura: new Date('2024-02-10'),
    fechaCierre: new Date('2024-04-15'),
    importeTotal: 6000000,
    importeMaximoBeneficiario: 200000,
    objetivos: 'Promover la implementación de modelos de economía circular en empresas del sector agroalimentario.',
    beneficiarios: 'Empresas del sector agroalimentario y cooperativas agrarias',
    requisitos: [
      'Actividad en sector agroalimentario',
      'Proyecto de economía circular',
      'Reducción de residuos del 20% mínimo',
      'Sede social en España'
    ],
    documentacionRequerida: [
      'Solicitud firmada',
      'Proyecto técnico',
      'Estudio de viabilidad económica',
      'Plan de seguimiento ambiental',
      'Memoria de sostenibilidad'
    ],
    criteriosSeleccion: [
      'Impacto ambiental positivo',
      'Viabilidad técnica y económica',
      'Carácter innovador',
      'Efecto multiplicador en el sector'
    ],
    enlaceOficial: 'https://www.mapa.gob.es/convocatorias/economia-circular-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-3456',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-3456'
  },
  {
    identificador: 'CONV-2024-005',
    titulo: 'Ayudas para el fomento de la cultura y las artes escénicas en ámbito local',
    organoConvocante: 'Ministerio de Cultura y Deporte',
    fechaPublicacion: new Date('2024-02-05'),
    fechaApertura: new Date('2024-02-20'),
    fechaCierre: new Date('2024-06-30'),
    importeTotal: 3000000,
    importeMaximoBeneficiario: 75000,
    objetivos: 'Apoyar la creación, producción y difusión de proyectos culturales y de artes escénicas a nivel local.',
    beneficiarios: 'Entidades locales, asociaciones culturales y compañías de artes escénicas',
    requisitos: [
      'Entidad sin ánimo de lucro o administración local',
      'Proyecto cultural con impacto local',
      'Duración del proyecto entre 6 meses y 2 años',
      'Cofinanciación mínima del 20%'
    ],
    documentacionRequerida: [
      'Formulario normalizado',
      'Proyecto artístico-cultural',
      'Presupuesto detallado',
      'Memoria de actividades previas',
      'Avales o cartas de apoyo'
    ],
    criteriosSeleccion: [
      'Calidad artística del proyecto',
      'Impacto cultural y social',
      'Viabilidad de ejecución',
      'Difusión y accesibilidad'
    ],
    enlaceOficial: 'https://www.cultura.gob.es/convocatorias/artes-escenicas-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-7890',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-7890'
  },
  {
    identificador: 'CONV-2024-006',
    titulo: 'Ayudas para la modernización y mejora de la eficiencia energética en pymes industriales',
    organoConvocante: 'Instituto para la Diversificación y Ahorro de la Energía (IDAE)',
    fechaPublicacion: new Date('2024-01-08'),
    fechaApertura: new Date('2024-01-25'),
    fechaCierre: new Date('2024-05-15'),
    importeTotal: 20000000,
    importeMaximoBeneficiario: 1000000,
    objetivos: 'Impulsar la modernización del sector industrial mediante la mejora de la eficiencia energética y la incorporación de tecnologías limpias.',
    beneficiarios: 'Pequeñas y medianas empresas del sector industrial',
    requisitos: [
      'Clasificación como pyme según reglamento UE',
      'Actividad industrial principal',
      'Auditoría energética previa',
      'Reducción mínima del 20% del consumo energético'
    ],
    documentacionRequerida: [
      'Solicitud normalizada',
      'Auditoría energética',
      'Proyecto técnico detallado',
      'Presupuestos de proveedores',
      'Plan de financiación'
    ],
    criteriosSeleccion: [
      'Ahorro energético conseguido',
      'Viabilidad técnica y económica',
      'Impacto ambiental',
      'Efecto demostrador'
    ],
    enlaceOficial: 'https://www.idae.es/convocatorias/eficiencia-industrial-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-2468',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-2468'
  },
  {
    identificador: 'CONV-2024-007',
    titulo: 'Subvenciones para el fomento de la innovación en el sector agroalimentario',
    organoConvocante: 'Centro para el Desarrollo Tecnológico Industrial (CDTI)',
    fechaPublicacion: new Date('2024-02-12'),
    fechaApertura: new Date('2024-03-01'),
    fechaCierre: new Date('2024-06-15'),
    importeTotal: 15000000,
    importeMaximoBeneficiario: 750000,
    objetivos: 'Promover la I+D+i en el sector agroalimentario para mejorar la competitividad y sostenibilidad.',
    beneficiarios: 'Empresas del sector agroalimentario y centros tecnológicos',
    requisitos: [
      'Proyecto de I+D+i',
      'Duración entre 12 y 36 meses',
      'Presupuesto mínimo de 200.000 euros',
      'Colaboración con centros de investigación'
    ],
    documentacionRequerida: [
      'Propuesta técnica',
      'Plan de explotación',
      'Curriculum del equipo',
      'Acuerdos de colaboración',
      'Estudio de viabilidad'
    ],
    criteriosSeleccion: [
      'Excelencia científico-técnica',
      'Potencial de mercado',
      'Capacidad del consorcio',
      'Impacto en el sector'
    ],
    enlaceOficial: 'https://www.cdti.es/convocatorias/agroalimentario-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-3691',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-3691'
  },
  {
    identificador: 'CONV-2024-008',
    titulo: 'Ayudas para la creación de empresas por jóvenes emprendedores',
    organoConvocante: 'Instituto de la Juventud (INJUVE)',
    fechaPublicacion: new Date('2024-01-30'),
    fechaApertura: new Date('2024-02-15'),
    fechaCierre: new Date('2024-07-31'),
    importeTotal: 4000000,
    importeMaximoBeneficiario: 25000,
    objetivos: 'Facilitar el acceso al emprendimiento de jóvenes entre 18 y 35 años mediante ayudas financieras.',
    beneficiarios: 'Jóvenes emprendedores entre 18 y 35 años',
    requisitos: [
      'Edad entre 18 y 35 años',
      'Proyecto empresarial viable',
      'Constitución de empresa posterior a enero 2024',
      'Creación de al menos 1 puesto de trabajo'
    ],
    documentacionRequerida: [
      'Plan de negocio',
      'Estudio de viabilidad económica',
      'DNI y titulación académica',
      'Acta de constitución empresarial',
      'Declaración responsable'
    ],
    criteriosSeleccion: [
      'Viabilidad del proyecto',
      'Carácter innovador',
      'Creación de empleo',
      'Impacto social'
    ],
    enlaceOficial: 'https://www.injuve.es/convocatorias/emprendimiento-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1357',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1357'
  },
  {
    identificador: 'CONV-2024-009',
    titulo: 'Subvenciones para proyectos de cooperación internacional al desarrollo',
    organoConvocante: 'Agencia Española de Cooperación Internacional para el Desarrollo (AECID)',
    fechaPublicacion: new Date('2024-02-20'),
    fechaApertura: new Date('2024-03-10'),
    fechaCierre: new Date('2024-05-20'),
    importeTotal: 12000000,
    importeMaximoBeneficiario: 300000,
    objetivos: 'Apoyar proyectos de cooperación al desarrollo que contribuyan a la reducción de la pobreza y el desarrollo sostenible.',
    beneficiarios: 'ONGs, universidades y entidades de cooperación',
    requisitos: [
      'Experiencia acreditada en cooperación',
      'Proyecto en países prioritarios',
      'Contraparte local identificada',
      'Duración entre 12 y 24 meses'
    ],
    documentacionRequerida: [
      'Formulario de solicitud',
      'Marco lógico del proyecto',
      'Presupuesto detallado',
      'Acuerdo con contraparte local',
      'Informe de viabilidad'
    ],
    criteriosSeleccion: [
      'Relevancia para el desarrollo',
      'Eficacia y eficiencia',
      'Sostenibilidad',
      'Enfoque de género'
    ],
    enlaceOficial: 'https://www.aecid.es/convocatorias/cooperacion-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-4825',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-4825'
  },
  {
    identificador: 'CONV-2024-010',
    titulo: 'Ayudas para la formación especializada en tecnologías digitales',
    organoConvocante: 'Servicio Público de Empleo Estatal (SEPE)',
    fechaPublicacion: new Date('2024-01-12'),
    fechaApertura: new Date('2024-02-01'),
    fechaCierre: new Date('2024-04-30'),
    importeTotal: 25000000,
    importeMaximoBeneficiario: 150000,
    objetivos: 'Mejorar la empleabilidad mediante formación especializada en competencias digitales avanzadas.',
    beneficiarios: 'Centros de formación acreditados y trabajadores en activo',
    requisitos: [
      'Centro de formación homologado',
      'Programas de al menos 200 horas',
      'Certificación oficial reconocida',
      'Inserción laboral del 70% mínimo'
    ],
    documentacionRequerida: [
      'Programa formativo detallado',
      'Curriculum del profesorado',
      'Recursos técnicos disponibles',
      'Plan de prácticas empresariales',
      'Sistema de seguimiento'
    ],
    criteriosSeleccion: [
      'Calidad del programa',
      'Empleabilidad esperada',
      'Recursos disponibles',
      'Experiencia del centro'
    ],
    enlaceOficial: 'https://www.sepe.es/convocatorias/formacion-digital-2024',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-5172',
    enlaceBOE: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-5172'
  }
];

export const mockConcesiones: ConcesionData[] = [
  {
    id: 'CONC-2023-001',
    convocatoriaId: 'CONV-2023-015',
    beneficiario: 'Universidad Politécnica de Madrid',
    importeConcedido: 450000,
    fechaConcesion: new Date('2023-11-15'),
    estado: 'CONCEDIDA',
    observaciones: 'Proyecto de investigación en energías renovables'
  },
  {
    id: 'CONC-2023-002',
    convocatoriaId: 'CONV-2023-028',
    beneficiario: 'Cooperativa Agrícola San Isidro',
    importeConcedido: 85000,
    fechaConcesion: new Date('2023-12-01'),
    estado: 'JUSTIFICADA',
    observaciones: 'Modernización de instalaciones agrícolas'
  },
  {
    id: 'CONC-2023-003',
    convocatoriaId: 'CONV-2023-033',
    beneficiario: 'TechStartup Innovation SL',
    importeConcedido: 120000,
    fechaConcesion: new Date('2023-10-20'),
    estado: 'CONCEDIDA',
    observaciones: 'Desarrollo de aplicación móvil para el sector sanitario'
  }
];

export function createMockSearchResult<T>(
  data: T[],
  page: number = 1,
  pageSize: number = 20,
  filters: any = {}
): SearchResult<T> {
  // Simple filtering simulation
  let filteredData = [...data];
  
  // Apply basic text filtering if query exists
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filteredData = filteredData.filter((item: any) => {
      // Search in key fields more specifically
      const searchFields = [
        item.titulo,
        item.organoConvocante,
        item.objetivos,
        item.beneficiarios,
        ...(item.requisitos || []),
        ...(item.criteriosSeleccion || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchFields.includes(query) || 
             query.split(' ').some((term: string) => searchFields.includes(term));
    });
  }

  // Apply organismo filter
  if (filters.organoConvocante) {
    filteredData = filteredData.filter((item: any) => 
      item.organoConvocante?.toLowerCase().includes(filters.organoConvocante.toLowerCase())
    );
  }

  // Apply date filter
  if (filters.fechaDesde) {
    const fechaDesde = new Date(filters.fechaDesde);
    filteredData = filteredData.filter((item: any) => 
      item.fechaPublicacion ? new Date(item.fechaPublicacion) >= fechaDesde : true
    );
  }

  if (filters.fechaHasta) {
    const fechaHasta = new Date(filters.fechaHasta);
    filteredData = filteredData.filter((item: any) => 
      item.fechaPublicacion ? new Date(item.fechaPublicacion) <= fechaHasta : true
    );
  }

  // Apply import filter
  if (filters.importeMinimo) {
    filteredData = filteredData.filter((item: any) => 
      item.importeTotal ? item.importeTotal >= filters.importeMinimo : true
    );
  }

  if (filters.importeMaximo) {
    filteredData = filteredData.filter((item: any) => 
      item.importeTotal ? item.importeTotal <= filters.importeMaximo : true
    );
  }

  // Simple sorting
  if (filters.sortBy) {
    filteredData.sort((a: any, b: any) => {
      const aVal = a[filters.sortBy];
      const bVal = b[filters.sortBy];
      
      if (filters.sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }

  const total = filteredData.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = filteredData.slice(start, end);
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: paginatedData,
    total,
    page,
    pageSize,
    totalPages
  };
}