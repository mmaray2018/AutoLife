import {
  LanguageCode,
  MaintenanceCategory,
  MaintenanceStatus,
  PowertrainType,
  VehicleType,
} from '../types/autolife';

export interface Translations {
  brand: string;
  tagline: string;
  nav: {
    health: string;
    garage: string;
    ev: string;
    mechanic: string;
    network: string;
    settings: string;
    admin: string;
  };
  actions: {
    logCheck: string;
    addVehicle: string;
    save: string;
    cancel: string;
    close: string;
    exportCsv: string;
    askMechanic: string;
    send: string;
    schedule: string;
    updateOdometer: string;
    calculateRoute: string;
    logCharge: string;
  };
  status: Record<MaintenanceStatus, string>;
  vehicleTypes: Record<VehicleType, string>;
  powertrain: Record<PowertrainType, string>;
  categories: Record<MaintenanceCategory, string>;
  health: {
    title: string;
    subtitle: string;
    onTrackCount: string;
    attentionCount: string;
    overdueCount: string;
    nextDue: string;
    searchPlaceholder: string;
    allFilter: string;
    lastCheck: string;
    dueEvery: string;
    daysAgo: string;
    today: string;
    notRecorded: string;
    guidesTitle: string;
    guidesSubtitle: string;
    manualReminder: string;
    modalTitle: string;
    odometerLabel: string;
    costLabel: string;
    workshopLabel: string;
    notesLabel: string;
  };
  garage: {
    title: string;
    subtitle: string;
    modePersonal: string;
    modeFleet: string;
    allVehicles: string;
    specsTitle: string;
    docsTitle: string;
    ledgerTitle: string;
    docLicense: string;
    docInsurance: string;
    expiresOn: string;
    plansTitle: string;
    plansSubtitle: string;
  };
  ev: {
    title: string;
    subtitle: string;
    technicalNote: string;
    batterySoh: string;
    estimatedRange: string;
    efficiency: string;
    plannerTitle: string;
    tripDistance: string;
    startSoc: string;
    chargerSpeed: string;
    stopsNeeded: string;
    estimatedChargeTime: string;
    arrivalSoc: string;
    sessionsTitle: string;
    nonEvNotice: string;
  };
  mechanic: {
    title: string;
    subtitle: string;
    activeVehicleContext: string;
    placeholder: string;
    promptsLabel: string;
    samplePrompts: string[];
    possibleCauses: string;
    safeChecks: string;
    whenWorkshop: string;
    thinking: string;
  };
  network: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    allCategories: string;
    workshop: string;
    ev_charger: string;
    tires: string;
    fuel: string;
    dealership: string;
    openNow: string;
    closed: string;
    checklistTitle: string;
    checklistDesc: string;
  };
  settings: {
    title: string;
    subtitle: string;
    languageLabel: string;
    unitsLabel: string;
    metricDesc: string;
    imperialDesc: string;
    currencyLabel: string;
    themeLabel: string;
    light: string;
    dark: string;
    remindersTitle: string;
    oilInterval: string;
    tireInterval: string;
    coolantInterval: string;
    docAlertDays: string;
  };
  items: Record<string, { title: string; desc: string; safety?: string }>;
  guides: Record<string, { title: string; subtitle: string; steps: string[]; warning: string }>;
}

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  pt: {
    brand: 'AutoLife World',
    tagline: 'Seu veículo não vai lembrar de cuidar dele. Nós lembramos por você.',
    nav: {
      health: 'Saúde & Manutenção',
      garage: 'Veículos & Frotas',
      ev: 'Mundo Elétrico',
      mechanic: 'Mecânico IA',
      network: 'Rede Global',
      settings: 'Conta & Preferências',
      admin: 'Painel Admin',
    },
    actions: {
      logCheck: 'Registrar Verificação',
      addVehicle: 'Novo Veículo',
      save: 'Salvar',
      cancel: 'Cancelar',
      close: 'Fechar',
      exportCsv: 'Exportar CSV',
      askMechanic: 'Consultar Mecânico',
      send: 'Enviar',
      schedule: 'Preparar Atendimento',
      updateOdometer: 'Atualizar Odômetro',
      calculateRoute: 'Simular Viagem',
      logCharge: 'Registrar Recarga',
    },
    status: {
      [MaintenanceStatus.PENDING]: 'Sem registro',
      [MaintenanceStatus.ON_TRACK]: 'Em dia',
      [MaintenanceStatus.ATTENTION]: 'Atenção',
      [MaintenanceStatus.OVERDUE]: 'Atrasado',
    },
    vehicleTypes: {
      car: 'Carro',
      motorcycle: 'Moto',
    },
    powertrain: {
      [PowertrainType.GASOLINE]: 'Gasolina / Flex',
      [PowertrainType.DIESEL]: 'Diesel',
      [PowertrainType.HYBRID]: 'Híbrido',
      [PowertrainType.ELECTRIC]: '100% Elétrico',
    },
    categories: {
      [MaintenanceCategory.OIL]: 'Óleo do Motor',
      [MaintenanceCategory.COOLANT]: 'Arrefecimento',
      [MaintenanceCategory.TIRES]: 'Pneus',
      [MaintenanceCategory.BATTERY]: 'Bateria',
      [MaintenanceCategory.BRAKES]: 'Freios',
      [MaintenanceCategory.DOCUMENTATION]: 'Documentação',
      [MaintenanceCategory.REVISION]: 'Revisão',
      [MaintenanceCategory.TIMING_BELT]: 'Correia / Transmissão',
      [MaintenanceCategory.CHAIN_DRIVE]: 'Relação & Corrente',
      [MaintenanceCategory.SUSPENSION]: 'Suspensão & Bengalas',
      [MaintenanceCategory.FUEL]: 'Abastecimento',
      [MaintenanceCategory.EXPENSE]: 'Gasto / Outro',
    },
    health: {
      title: 'Saúde do Veículo & Lembretes Inteligentes',
      subtitle: 'Acompanhe carros e motos: o que está em dia, o que exige atenção e evite despesas evitáveis.',
      onTrackCount: 'Itens em dia',
      attentionCount: 'Precisam atenção',
      overdueCount: 'Itens atrasados',
      nextDue: 'Próximo lembrete',
      searchPlaceholder: 'Filtrar por item ou componente...',
      allFilter: 'Todos',
      lastCheck: 'Última verificação',
      dueEvery: 'Ciclo',
      daysAgo: 'dias atrás',
      today: 'Hoje',
      notRecorded: 'Não informado',
      guidesTitle: 'Aprenda a cuidar do seu carro ou moto',
      guidesSubtitle: 'Orientações visuais passo a passo para inspeções seguras em casa ou na empresa.',
      manualReminder: 'Siga sempre as especificações oficiais do manual do fabricante do seu veículo.',
      modalTitle: 'Registrar Verificação / Serviço',
      odometerLabel: 'Quilometragem atual',
      costLabel: 'Custo estimado',
      workshopLabel: 'Local / Oficina',
      notesLabel: 'Observações',
    },
    garage: {
      title: 'Garagem, Frotas & Histórico',
      subtitle: 'Gerencie veículos particulares ou pequenas frotas de qualquer fabricante.',
      modePersonal: 'Motorista Particular',
      modeFleet: 'Gestão de Frotas',
      allVehicles: 'Frota Completa',
      specsTitle: 'Ficha Técnica & Odômetro',
      docsTitle: 'Vencimento de Documentação',
      ledgerTitle: 'Histórico de Manutenções & Despesas',
      docLicense: 'Licenciamento Anual',
      docInsurance: 'Seguro Automotivo',
      expiresOn: 'Vence em',
      plansTitle: 'Ecossistema Comercial AutoLife',
      plansSubtitle: 'Modelo escalável para motoristas particulares, oficinas parceiras e frotas.',
    },
    ev: {
      title: 'Mundo Elétrico & Planejamento de Recarga',
      subtitle: 'Autonomia estimada, paradas de recarga em viagem e controle de energia.',
      technicalNote:
        'Nota técnica: dados aprofundados de saúde da bateria (SoH) e diagnóstico eletrônico em tempo real dependem de integração oficial com a fabricante ou leitor OBD2 compatível.',
      batterySoh: 'Saúde da Bateria (Estimada)',
      estimatedRange: 'Autonomia Estimada',
      efficiency: 'Consumo Médio',
      plannerTitle: 'Planejador de Viagem Elétrica',
      tripDistance: 'Distância da viagem',
      startSoc: 'Carga inicial (%)',
      chargerSpeed: 'Potência do carregador',
      stopsNeeded: 'Paradas recomendadas',
      estimatedChargeTime: 'Tempo total de recarga',
      arrivalSoc: 'Carga prevista na chegada',
      sessionsTitle: 'Histórico de Recargas',
      nonEvNotice:
        'O veículo selecionado é a combustão. Selecione o SUV Elétrico ou Híbrido para dados de bateria ao vivo, ou simule uma viagem abaixo.',
    },
    mechanic: {
      title: 'Mecânico com Inteligência Artificial',
      subtitle: 'Descreva barulhos, luzes no painel ou dúvidas e receba orientação preventiva imediata.',
      activeVehicleContext: 'Diagnosticando veículo ativo',
      placeholder: 'Ex: Meu carro está fazendo um barulho quando freio. O que pode ser?',
      promptsLabel: 'Perguntas frequentes',
      samplePrompts: [
        'Meu carro está fazendo um barulho quando freio. O que pode ser?',
        'Já faz 20 dias que não verifico o óleo do motor. Como conferir com segurança?',
        'Como saber se o líquido de arrefecimento está baixo sem correr risco?',
        'Minha autonomia elétrica caiu muito no frio ou na rodovia. É normal?',
      ],
      possibleCauses: 'Possíveis causas',
      safeChecks: 'O que você pode verificar com segurança',
      whenWorkshop: 'Quando procurar uma oficina',
      thinking: 'Analisando sintomas com o contexto do veículo...',
    },
    network: {
      title: 'Rede Automotiva Mundial',
      subtitle: 'Oficinas, carregadores elétricos, centros de pneus, postos e concessionárias.',
      searchPlaceholder: 'Buscar por cidade, país ou serviço...',
      allCategories: 'Todos',
      workshop: 'Oficinas',
      ev_charger: 'Carregadores EV',
      tires: 'Pneus',
      fuel: 'Postos',
      dealership: 'Concessionárias',
      openNow: 'Aberto agora',
      closed: 'Fechado',
      checklistTitle: 'Resumo de Atendimento para Levar ao Local',
      checklistDesc: 'Leve os dados exatos do seu veículo e os itens que precisam de atenção:',
    },
    settings: {
      title: 'Plataforma Internacional & Preferências',
      subtitle: 'Adapte idioma, unidades de medida, moeda e frequência dos lembretes inteligentes.',
      languageLabel: 'Idioma da Plataforma',
      unitsLabel: 'Sistema de Unidades',
      metricDesc: 'Quilômetros (km), Litros, PSI / kWh/100km',
      imperialDesc: 'Milhas (mi), Galões, PSI / mi/kWh',
      currencyLabel: 'Moeda Padrão',
      themeLabel: 'Aparência da Interface',
      light: 'Modo Claro',
      dark: 'Modo Escuro',
      remindersTitle: 'Frequência de Lembretes Inteligentes',
      oilInterval: 'Lembrete para checar óleo (dias)',
      tireInterval: 'Lembrete de calibragem de pneus (dias)',
      coolantInterval: 'Lembrete de inspeção de arrefecimento (dias)',
      docAlertDays: 'Aviso antecipado de documentação (dias)',
    },
    items: {
      oil: {
        title: 'Óleo do Motor',
        desc: 'Verificar nível na vareta e prazo da próxima troca conforme viscosidade do manual.',
      },
      coolant: {
        title: 'Água / Líquido de Arrefecimento',
        desc: 'Inspecionar nível entre MIN e MAX pelo reservatório transparente.',
        safety: 'NUNCA abra a tampa do reservatório com o motor quente. Verifique apenas visualmente com o motor frio.',
      },
      tires: {
        title: 'Calibragem e Sulco dos Pneus',
        desc: 'Calibrar com pneus frios na pressão indicada na porta ou manual (inclua o estepe).',
      },
      battery: {
        title: 'Bateria 12V / Sistema Auxiliar',
        desc: 'Checar partida, oxidação nos polos e carga em veículos elétricos ou a combustão.',
      },
      brakes: {
        title: 'Freios (Pastilhas, Discos e Fluido)',
        desc: 'Avaliar ruídos metálicos, vibração no pedal e nível do fluido de freio.',
      },
      documentation: {
        title: 'Documentação & Seguro',
        desc: 'Acompanhar vencimento do licenciamento anual, seguro e inspeção obrigatória.',
      },
      revision: {
        title: 'Revisão Periódica por Quilometragem',
        desc: 'Revisão programada de filtros, suspensão, velas e diagnóstico completo.',
      },
      timing_belt: {
        title: 'Correia Dentada / Transmissão',
        desc: 'Controle rigoroso do prazo de substituição para evitar danos graves ao motor.',
      },
      chain_drive: {
        title: 'Kit Relação (Corrente, Coroa & Pinhão)',
        desc: 'Limpar e lubrificar a cada 500 km ou após chuva; checar folga de 20 a 30 mm no meio da corrente.',
        safety: 'Nunca lubrifique a corrente com a moto engatada ou roda girando no motor. Desligue a ignição antes.',
      },
      suspension: {
        title: 'Suspensão, Bengalas & Rolamentos',
        desc: 'Verificar se há óleo vazando nos retentores dos garfos dianteiros e folga na caixa de direção.',
      },
      moto_oil: {
        title: 'Óleo do Motor & Embreagem (JASO MA/MA2)',
        desc: 'Medir com a moto reta na vertical (sem descanso lateral). Motos têm troca mais curta (1.500 a 3.000 km).',
        safety: 'Use exclusivamente óleo específico para motos (JASO MA/MA2) para não patinar a embreagem úmida.',
      },
      moto_tires: {
        title: 'Pneus Dianteiro & Traseiro da Moto',
        desc: 'Calibrar semanalmente a frio respeitando PSI diferente para frente e trás (e garupa/baú).',
      },
      moto_brakes: {
        title: 'Freios da Moto (Pastilhas, Lona & Fluido)',
        desc: 'Inspecionar pastilhas dianteiras/traseiras, regulagem do tambor e visor do fluido DOT4 no guidão.',
      },
    },
    guides: {
      oil: {
        title: 'Como verificar o óleo do motor com segurança',
        subtitle: 'Inspeção de 3 minutos em superfície plana',
        steps: [
          'Estacione em piso plano e aguarde 10 minutos após desligar o motor.',
          'Puxe a vareta (ou mantenha a moto reta na vertical para olhar o visor), limpe e confira.',
          'Confirme se o filme de óleo está entre as marcas MIN e MAX.',
        ],
        warning: 'Use apenas a viscosidade e norma (em motos, JASO MA/MA2) descrita no manual do fabricante.',
      },
      coolant: {
        title: 'Verificação visual do líquido de arrefecimento',
        subtitle: 'Diferença crucial: inspecionar nível não é abrir o reservatório',
        steps: [
          'Com o motor totalmente frio, localize o reservatório plástico translúcido.',
          'Observe pela lateral externa se o líquido colorido está entre MIN e MAX.',
          'Se estiver abaixo do mínimo com frequência, procure uma oficina para testar vazamentos.',
        ],
        warning: 'PERIGO DE QUEIMADURA: Nunca abra a tampa pressurizada com o motor quente.',
      },
      tires: {
        title: 'Calibragem correta dos pneus',
        subtitle: 'Economia de combustível/energia, estabilidade e menor desgaste',
        steps: [
          'Consulte a etiqueta na porta (carros) ou na balança traseira (motos) para saber a pressão em PSI.',
          'Calibre sempre com os pneus frios (antes de rodar mais de 3 km).',
          'Inspecione visualmente bolhas, cortes laterais e o indicador TWI nos sulcos.',
        ],
        warning: 'Em motos e carros, pneus murchos aumentam a distância de frenagem e provocam aquaplanagem.',
      },
      moto_chain: {
        title: 'Limpeza, lubrificação e folga da corrente (Moto)',
        subtitle: 'Dobre a vida útil do kit relação em 5 minutos',
        steps: [
          'Com a moto desligada no cavalete, gire a roda traseira manualmente e limpe a corrente com escova e produto neutro.',
          'Meça a folga vertical no centro da corrente: o padrão seguro costuma ficar entre 20 mm e 30 mm.',
          'Aplique lubrificante específico para corrente de moto na face interna e aguarde 15 min antes de rodar.',
        ],
        warning: 'NUNCA engate marcha com a moto no cavalete para limpar ou lubrificar a corrente — risco grave de acidente.',
      },
      moto_brakes: {
        title: 'Checagem de freios e pneus de motocicleta',
        subtitle: 'Inspeção visual rápida antes de rodar na cidade ou estrada',
        steps: [
          'Olhe pela pinça dianteira para verificar se as pastilhas ainda têm material acima dos sulcos de limite.',
          'Verifique a janelinha do reservatório de fluido no manete direito e a firmeza ao acionar.',
          'Calibre dianteiro e traseiro com as pressões independentes do manual (ajuste para garupa ou baú).',
        ],
        warning: 'Se sentir o manete borrachudo ou ouvir atrito metálico contínuo, pare e faça revisão imediata.',
      },
    },
  },
  en: {
    brand: 'AutoLife World',
    tagline: "Your car or motorcycle won't remind you to care for it. We remember for you.",
    nav: {
      health: 'Health & Maintenance',
      garage: 'Vehicles & Fleet',
      ev: 'Electric World',
      mechanic: 'AI Mechanic',
      network: 'Global Network',
      settings: 'Account & Preferences',
      admin: 'Admin Panel',
    },
    actions: {
      logCheck: 'Log Check',
      addVehicle: 'Add Vehicle',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      exportCsv: 'Export CSV',
      askMechanic: 'Ask Mechanic',
      send: 'Send',
      schedule: 'Prepare Visit',
      updateOdometer: 'Update Odometer',
      calculateRoute: 'Plan Trip',
      logCharge: 'Log Charge',
    },
    status: {
      [MaintenanceStatus.PENDING]: 'Not recorded',
      [MaintenanceStatus.ON_TRACK]: 'On Track',
      [MaintenanceStatus.ATTENTION]: 'Attention',
      [MaintenanceStatus.OVERDUE]: 'Overdue',
    },
    vehicleTypes: {
      car: 'Car',
      motorcycle: 'Motorcycle',
    },
    powertrain: {
      [PowertrainType.GASOLINE]: 'Gasoline',
      [PowertrainType.DIESEL]: 'Diesel',
      [PowertrainType.HYBRID]: 'Hybrid',
      [PowertrainType.ELECTRIC]: '100% Electric',
    },
    categories: {
      [MaintenanceCategory.OIL]: 'Engine Oil',
      [MaintenanceCategory.COOLANT]: 'Coolant',
      [MaintenanceCategory.TIRES]: 'Tires',
      [MaintenanceCategory.BATTERY]: 'Battery',
      [MaintenanceCategory.BRAKES]: 'Brakes',
      [MaintenanceCategory.DOCUMENTATION]: 'Documentation',
      [MaintenanceCategory.REVISION]: 'Scheduled Service',
      [MaintenanceCategory.TIMING_BELT]: 'Timing Belt / Drive',
      [MaintenanceCategory.CHAIN_DRIVE]: 'Chain & Sprockets',
      [MaintenanceCategory.SUSPENSION]: 'Suspension & Forks',
      [MaintenanceCategory.FUEL]: 'Refueling',
      [MaintenanceCategory.EXPENSE]: 'Expense / Other',
    },
    health: {
      title: 'Vehicle Health & Smart Reminders',
      subtitle: 'Track cars and motorcycles: see what is on track, what needs attention, and prevent costly repairs.',
      onTrackCount: 'On track',
      attentionCount: 'Need attention',
      overdueCount: 'Overdue',
      nextDue: 'Next reminder',
      searchPlaceholder: 'Filter by component or task...',
      allFilter: 'All',
      lastCheck: 'Last checked',
      dueEvery: 'Interval',
      daysAgo: 'days ago',
      today: 'Today',
      notRecorded: 'Not recorded',
      guidesTitle: 'Learn to Care for Your Car or Motorcycle',
      guidesSubtitle: 'Illustrated step-by-step safety guides for everyday inspections.',
      manualReminder: "Always follow your vehicle manufacturer's official owner manual specifications.",
      modalTitle: 'Log Inspection / Maintenance',
      odometerLabel: 'Current odometer',
      costLabel: 'Cost',
      workshopLabel: 'Location / Workshop',
      notesLabel: 'Notes',
    },
    garage: {
      title: 'Garage, Fleet & Service History',
      subtitle: 'Manage personal vehicles or small fleets across any manufacturer.',
      modePersonal: 'Private Driver',
      modeFleet: 'Fleet Management',
      allVehicles: 'Full Fleet',
      specsTitle: 'Vehicle Specifications & Odometer',
      docsTitle: 'Document Expirations',
      ledgerTitle: 'Maintenance & Expense Ledger',
      docLicense: 'Annual Registration',
      docInsurance: 'Auto Insurance',
      expiresOn: 'Expires on',
      plansTitle: 'AutoLife Commercial Ecosystem',
      plansSubtitle: 'Scalable tiers for drivers, partner workshops, and fleets.',
    },
    ev: {
      title: 'Electric World & Charging Planner',
      subtitle: 'Estimated range, highway charging stops, and energy cost tracking.',
      technicalNote:
        'Technical note: deep battery State of Health (SoH) and live electronic diagnostics depend on official OEM integration or compatible OBD2 hardware.',
      batterySoh: 'Battery Health (Estimated)',
      estimatedRange: 'Estimated Range',
      efficiency: 'Average Consumption',
      plannerTitle: 'EV Trip & Charging Stop Planner',
      tripDistance: 'Trip distance',
      startSoc: 'Starting charge (%)',
      chargerSpeed: 'Fast charger power',
      stopsNeeded: 'Recommended stops',
      estimatedChargeTime: 'Estimated charging time',
      arrivalSoc: 'Projected arrival SoC',
      sessionsTitle: 'Charging Session Log',
      nonEvNotice:
        'Your active vehicle is combustion-powered. Switch to the Electric SUV or Hybrid for live EV telemetry, or simulate a trip below.',
    },
    mechanic: {
      title: 'AI Automotive Mechanic',
      subtitle: 'Describe noises, warning lights, or symptoms for immediate preventive guidance.',
      activeVehicleContext: 'Diagnosing active vehicle',
      placeholder: 'Example: My car makes a squeaking noise when braking. What could it be?',
      promptsLabel: 'Common questions',
      samplePrompts: [
        'My car makes a noise when I brake. What could it be?',
        "It's been 20 days since I checked my engine oil. How do I check safely?",
        'How do I check coolant level without risking hot steam burns?',
        'My EV range dropped noticeably on the highway. Is that normal?',
      ],
      possibleCauses: 'Possible causes',
      safeChecks: 'Safe visual checks',
      whenWorkshop: 'When to visit a workshop',
      thinking: 'Analyzing symptoms with your vehicle profile...',
    },
    network: {
      title: 'Global Automotive Network',
      subtitle: 'Certified workshops, EV chargers, tire shops, fuel stations, and dealers.',
      searchPlaceholder: 'Search by city, country, or service...',
      allCategories: 'All',
      workshop: 'Workshops',
      ev_charger: 'EV Chargers',
      tires: 'Tires',
      fuel: 'Fuel Stations',
      dealership: 'Dealerships',
      openNow: 'Open now',
      closed: 'Closed',
      checklistTitle: 'Service Brief to Share at Arrival',
      checklistDesc: 'Bring your exact vehicle specs and priority inspection items:',
    },
    settings: {
      title: 'International Platform & Preferences',
      subtitle: 'Adapt language, measurement units, currency, and smart reminder intervals.',
      languageLabel: 'Platform Language',
      unitsLabel: 'Measurement Units',
      metricDesc: 'Kilometers (km), Liters, PSI / kWh/100km',
      imperialDesc: 'Miles (mi), Gallons, PSI / mi/kWh',
      currencyLabel: 'Default Currency',
      themeLabel: 'Interface Theme',
      light: 'Light Mode',
      dark: 'Dark Mode',
      remindersTitle: 'Smart Reminder Intervals',
      oilInterval: 'Engine oil check reminder (days)',
      tireInterval: 'Tire pressure reminder (days)',
      coolantInterval: 'Coolant inspection reminder (days)',
      docAlertDays: 'Document expiration lead notice (days)',
    },
    items: {
      oil: {
        title: 'Engine Oil',
        desc: 'Check dipstick level and adhere to manufacturer oil change interval.',
      },
      coolant: {
        title: 'Coolant / Antifreeze',
        desc: 'Inspect fluid level visually between MIN and MAX on the translucent tank.',
        safety: 'NEVER open the pressurized cap while the engine is hot. Check externally when cold.',
      },
      tires: {
        title: 'Tire Pressure & Tread',
        desc: 'Inflate cold tires to door-jamb PSI specification (including spare tire).',
      },
      battery: {
        title: '12V / Auxiliary Battery',
        desc: 'Inspect starting strength, terminal corrosion, and auxiliary charge.',
      },
      brakes: {
        title: 'Brakes (Pads, Rotors & Fluid)',
        desc: 'Monitor braking noise, pedal feel, and brake fluid reservoir level.',
      },
      documentation: {
        title: 'Registration & Insurance',
        desc: 'Track annual licensing, inspection deadlines, and insurance renewal.',
      },
      revision: {
        title: 'Mileage-Based Service',
        desc: 'Scheduled inspection of filters, suspension, spark plugs, and diagnostics.',
      },
      timing_belt: {
        title: 'Timing Belt / Drivetrain',
        desc: 'Track critical replacement mileage to prevent severe engine damage.',
      },
      chain_drive: {
        title: 'Drive Chain & Sprockets',
        desc: 'Clean and lube every 500 km or after rain; verify 20–30 mm slack at mid-span.',
        safety: 'NEVER clean or lube a motorcycle chain with the engine running or in gear.',
      },
      suspension: {
        title: 'Suspension, Forks & Bearings',
        desc: 'Check front fork seals for oil mist and steering head bearings for play.',
      },
      moto_oil: {
        title: 'Motorcycle Oil & Wet Clutch (JASO MA/MA2)',
        desc: 'Check oil sight glass or dipstick with bike upright on level ground (shorter 1,500–3,000 km cycles).',
        safety: 'Only use motorcycle-rated JASO MA/MA2 oil to prevent wet-clutch slippage.',
      },
      moto_tires: {
        title: 'Front & Rear Motorcycle Tires',
        desc: 'Check cold PSI weekly using independent front and rear pressures.',
      },
      moto_brakes: {
        title: 'Motorcycle Brakes (Pads, Shoes & Fluid)',
        desc: 'Inspect caliper pads, rear drum adjustment, and handlebar DOT4 sight glass.',
      },
    },
    guides: {
      oil: {
        title: 'How to safely check engine oil',
        subtitle: '3-minute inspection on level ground',
        steps: [
          'Park on flat ground and wait 10 minutes after turning off the engine.',
          'Pull out the dipstick (or hold motorcycle upright to inspect sight glass) and check.',
          'Confirm the oil film rests between the MIN and MAX marks.',
        ],
        warning: 'Only top up using the exact viscosity and spec (JASO MA/MA2 for bikes) in your owner manual.',
      },
      coolant: {
        title: 'Visual coolant level inspection',
        subtitle: 'Critical rule: checking the level is different from opening the cap',
        steps: [
          'Wait until the engine is completely cold before inspecting.',
          'Look through the side of the translucent tank for the MIN and MAX lines.',
          'If fluid is consistently below MIN, schedule a pressure leak test.',
        ],
        warning: 'SCALD HAZARD: Never remove the pressurized reservoir cap on a hot engine.',
      },
      tires: {
        title: 'Checking and setting tire pressure',
        subtitle: 'Better fuel/EV range, braking grip, and longer tire life',
        steps: [
          'Check the door sticker (cars) or swingarm sticker (motorcycles) for cold PSI.',
          'Measure pressure when tires are cold (driven under 3 km / 2 mi).',
          'Check tread grooves for uneven wear or embedded debris.',
        ],
        warning: 'Underinflated tires increase stopping distance and reduce handling stability.',
      },
      moto_chain: {
        title: 'Cleaning, lubing & adjusting motorcycle chain',
        subtitle: 'Double sprocket & chain life in 5 minutes',
        steps: [
          'With ignition OFF on a stand, rotate the rear wheel by hand and brush away grime.',
          'Measure vertical chain slack at midpoint: typical safe spec is 20–30 mm.',
          'Spray motorcycle chain lube on the inner rollers and let set for 15 minutes before riding.',
        ],
        warning: 'NEVER run the engine in gear while cleaning or lubing a chain—severe injury risk.',
      },
      moto_brakes: {
        title: 'Motorcycle brake pads & dual-tire check',
        subtitle: '60-second safety inspection before commuting or touring',
        steps: [
          'Look into the front caliper to confirm pad lining remains above wear grooves.',
          'Check the handlebar brake fluid sight window and test lever firmness.',
          'Set independent front and rear tire PSI (increase rear PSI for pillion or luggage).',
        ],
        warning: 'If the brake lever feels spongy or scrapes metal, stop riding and service immediately.',
      },
    },
  },
  es: {
    brand: 'AutoLife World',
    tagline: 'Tu coche o moto no te recordará cuidarlo. Nosotros lo recordamos por ti.',
    nav: {
      health: 'Salud y Mantenimiento',
      garage: 'Vehículos y Flotas',
      ev: 'Mundo Eléctrico',
      mechanic: 'Mecánico IA',
      network: 'Red Global',
      settings: 'Cuenta y Preferencias',
      admin: 'Panel Admin',
    },
    actions: {
      logCheck: 'Registrar Revisión',
      addVehicle: 'Nuevo Vehículo',
      save: 'Guardar',
      cancel: 'Cancelar',
      close: 'Cerrar',
      exportCsv: 'Exportar CSV',
      askMechanic: 'Consultar Mecánico',
      send: 'Enviar',
      schedule: 'Preparar Cita',
      updateOdometer: 'Actualizar Kilometraje',
      calculateRoute: 'Simular Viaje',
      logCharge: 'Registrar Carga',
    },
    status: {
      [MaintenanceStatus.PENDING]: 'Sin registro',
      [MaintenanceStatus.ON_TRACK]: 'Al día',
      [MaintenanceStatus.ATTENTION]: 'Atención',
      [MaintenanceStatus.OVERDUE]: 'Atrasado',
    },
    vehicleTypes: {
      car: 'Coche',
      motorcycle: 'Moto',
    },
    powertrain: {
      [PowertrainType.GASOLINE]: 'Gasolina',
      [PowertrainType.DIESEL]: 'Diésel',
      [PowertrainType.HYBRID]: 'Híbrido',
      [PowertrainType.ELECTRIC]: '100% Eléctrico',
    },
    categories: {
      [MaintenanceCategory.OIL]: 'Aceite de Motor',
      [MaintenanceCategory.COOLANT]: 'Refrigerante',
      [MaintenanceCategory.TIRES]: 'Neumáticos',
      [MaintenanceCategory.BATTERY]: 'Batería',
      [MaintenanceCategory.BRAKES]: 'Frenos',
      [MaintenanceCategory.DOCUMENTATION]: 'Documentación',
      [MaintenanceCategory.REVISION]: 'Revisión Periódica',
      [MaintenanceCategory.TIMING_BELT]: 'Correa / Transmisión',
      [MaintenanceCategory.CHAIN_DRIVE]: 'Kit de Arrastre / Cadena',
      [MaintenanceCategory.SUSPENSION]: 'Suspensión y Horquilla',
      [MaintenanceCategory.FUEL]: 'Combustible',
      [MaintenanceCategory.EXPENSE]: 'Gasto / Otro',
    },
    health: {
      title: 'Salud del Vehículo y Recordatorios',
      subtitle: 'Controla coches y motos: lo que está al día, lo que requiere atención y evita averías costosas.',
      onTrackCount: 'Al día',
      attentionCount: 'Atención',
      overdueCount: 'Atrasados',
      nextDue: 'Próximo aviso',
      searchPlaceholder: 'Buscar componente...',
      allFilter: 'Todos',
      lastCheck: 'Última revisión',
      dueEvery: 'Ciclo',
      daysAgo: 'días atrás',
      today: 'Hoy',
      notRecorded: 'No informado',
      guidesTitle: 'Aprende a cuidar tu coche o moto',
      guidesSubtitle: 'Guías visuales paso a paso para inspecciones seguras.',
      manualReminder: 'Sigue siempre las especificaciones del manual oficial del fabricante.',
      modalTitle: 'Registrar Revisión / Mantenimiento',
      odometerLabel: 'Kilometraje actual',
      costLabel: 'Costo',
      workshopLabel: 'Lugar / Taller',
      notesLabel: 'Notas',
    },
    garage: {
      title: 'Garaje, Flotas e Historial',
      subtitle: 'Gestiona vehículos particulares o pequeñas flotas de cualquier marca.',
      modePersonal: 'Conductor Particular',
      modeFleet: 'Gestión de Flotas',
      allVehicles: 'Flota Completa',
      specsTitle: 'Ficha Técnica y Odómetro',
      docsTitle: 'Vencimiento de Documentos',
      ledgerTitle: 'Historial de Mantenimiento y Gastos',
      docLicense: 'ITV / Permiso Anual',
      docInsurance: 'Seguro del Vehículo',
      expiresOn: 'Vence el',
      plansTitle: 'Ecosistema Comercial AutoLife',
      plansSubtitle: 'Modelo escalable para conductores, talleres y flotas.',
    },
    ev: {
      title: 'Mundo Eléctrico y Planificador de Carga',
      subtitle: 'Autonomía estimada, paradas en ruta y control de consumo energético.',
      technicalNote:
        'Nota técnica: el estado avanzado de salud de la batería (SoH) y la telemetría electrónica dependen de integración oficial del fabricante o lector OBD2 compatible.',
      batterySoh: 'Salud de Batería (Estimada)',
      estimatedRange: 'Autonomía Estimada',
      efficiency: 'Consumo Medio',
      plannerTitle: 'Planificador de Viaje Eléctrico',
      tripDistance: 'Distancia del viaje',
      startSoc: 'Carga inicial (%)',
      chargerSpeed: 'Potencia del cargador',
      stopsNeeded: 'Paradas recomendadas',
      estimatedChargeTime: 'Tiempo total de carga',
      arrivalSoc: 'Carga estimada al llegar',
      sessionsTitle: 'Historial de Recargas',
      nonEvNotice:
        'El vehículo activo es de combustión. Cambia al SUV Eléctrico para ver telemetría EV o simula un viaje abajo.',
    },
    mechanic: {
      title: 'Mecánico con Inteligencia Artificial',
      subtitle: 'Describe ruidos, testigos del tablero o dudas para recibir orientación preventiva.',
      activeVehicleContext: 'Diagnosticando vehículo activo',
      placeholder: 'Ej: Mi coche hace un ruido al frenar. ¿Qué puede ser?',
      promptsLabel: 'Consultas frecuentes',
      samplePrompts: [
        'Mi coche hace un ruido cuando freno. ¿Qué puede ser?',
        'Hace 20 días que no reviso el aceite. ¿Cómo hacerlo de forma segura?',
        '¿Cómo comprobar el nivel de refrigerante sin abrir el depósito?',
        'Mi autonomía eléctrica bajó en autopista. ¿Es normal?',
      ],
      possibleCauses: 'Causas posibles',
      safeChecks: 'Comprobaciones seguras',
      whenWorkshop: 'Cuándo acudir al taller',
      thinking: 'Analizando síntomas con el perfil de tu vehículo...',
    },
    network: {
      title: 'Red Automotriz Mundial',
      subtitle: 'Talleres, cargadores rápidos, neumáticos, estaciones y concesionarios.',
      searchPlaceholder: 'Buscar por ciudad, país o servicio...',
      allCategories: 'Todos',
      workshop: 'Talleres',
      ev_charger: 'Cargadores EV',
      tires: 'Neumáticos',
      fuel: 'Gasolineras',
      dealership: 'Concesionarios',
      openNow: 'Abierto ahora',
      closed: 'Cerrado',
      checklistTitle: 'Resumen para Mostrar en el Taller',
      checklistDesc: 'Presenta los datos exactos de tu vehículo y los puntos pendientes:',
    },
    settings: {
      title: 'Plataforma Internacional y Preferencias',
      subtitle: 'Configura idioma, sistema de unidades, moneda y recordatorios.',
      languageLabel: 'Idioma de la Plataforma',
      unitsLabel: 'Unidades de Medida',
      metricDesc: 'Kilómetros (km), Litros, PSI / kWh/100km',
      imperialDesc: 'Millas (mi), Galones, PSI / mi/kWh',
      currencyLabel: 'Moneda Predeterminada',
      themeLabel: 'Apariencia',
      light: 'Modo Claro',
      dark: 'Modo Oscuro',
      remindersTitle: 'Intervalos de Recordatorios',
      oilInterval: 'Aviso para revisar aceite (días)',
      tireInterval: 'Aviso de presión de neumáticos (días)',
      coolantInterval: 'Aviso de refrigerante (días)',
      docAlertDays: 'Aviso previo de documentación (días)',
    },
    items: {
      oil: { title: 'Aceite de Motor', desc: 'Verificar nivel con la varilla y cambio según manual.' },
      coolant: {
        title: 'Líquido Refrigerante',
        desc: 'Inspeccionar nivel entre MIN y MAX en el depósito transparente.',
        safety: 'NUNCA abras el tapón con el motor caliente. Comprueba solo en frío.',
      },
      tires: { title: 'Presión y Desgaste de Neumáticos', desc: 'Calibrar en frío según etiqueta de la puerta.' },
      battery: { title: 'Batería 12V / Auxiliar', desc: 'Comprobar arranque, bornes y carga auxiliar.' },
      brakes: { title: 'Frenos (Pastillas, Discos y Líquido)', desc: 'Vigilar ruidos metálicos y nivel de líquido.' },
      documentation: { title: 'Documentación y Seguro', desc: 'Control de ITV, impuesto y póliza.' },
      revision: { title: 'Revisión por Kilometraje', desc: 'Mantenimiento programado de filtros y diagnóstico.' },
      timing_belt: { title: 'Correa de Distribución', desc: 'Control estricto del intervalo de sustitución.' },
      chain_drive: {
        title: 'Kit de Arrastre y Cadena',
        desc: 'Limpiar y engrasar cada 500 km o tras lluvia; verificar holgura de 20–30 mm.',
        safety: 'NUNCA engrases la cadena con el motor en marcha o marcha engranada.',
      },
      suspension: {
        title: 'Horquilla, Retenes y Suspensión',
        desc: 'Comprobar fugas de aceite en las barras delanteras y juego en dirección.',
      },
      moto_oil: {
        title: 'Aceite de Moto y Embrague (JASO MA/MA2)',
        desc: 'Medir con la moto vertical en plano (ciclos más cortos de 1.500 a 3.000 km).',
        safety: 'Usa solo aceite norma JASO MA/MA2 para evitar que patine el embrague.',
      },
      moto_tires: { title: 'Neumáticos Delantero y Trasero (Moto)', desc: 'Calibrar en frío con presiones independientes.' },
      moto_brakes: { title: 'Frenos de Moto (Pastillas y Fluido)', desc: 'Revisar desgaste de pastillas y nivel DOT4 en el manillar.' },
    },
    guides: {
      oil: {
        title: 'Cómo revisar el aceite del motor',
        subtitle: 'Inspección rápida en superficie plana',
        steps: [
          'Estaciona en plano y espera 10 minutos tras apagar el motor.',
          'Extrae la varilla (o mantén la moto vertical para mirar el visor) y comprueba.',
          'Verifica que la marca quede entre MIN y MAX.',
        ],
        warning: 'Usa siempre la viscosidad y norma (JASO MA/MA2 en motos) del manual.',
      },
      coolant: {
        title: 'Inspección visual del refrigerante',
        subtitle: 'Regla clave: mirar el nivel no es abrir el depósito',
        steps: [
          'Con el motor completamente frío, localiza el depósito translúcido.',
          'Comprueba desde fuera que el líquido esté entre MIN y MAX.',
          'Si baja con frecuencia, acude al taller para revisar fugas.',
        ],
        warning: 'RIESGO DE QUEMADURAS: Nunca abras el tapón con el motor caliente.',
      },
      tires: {
        title: 'Calibración de neumáticos',
        subtitle: 'Mayor seguridad, frenado óptimo y menor consumo',
        steps: [
          'Consulta la presión en la puerta (coche) o en el basculante (moto).',
          'Mide siempre con neumáticos en frío.',
          'Revisa la profundidad del dibujo y posibles cortes.',
        ],
        warning: 'Una presión baja compromete la frenada y estabilidad en curvas.',
      },
      moto_chain: {
        title: 'Limpieza, engrase y tensión de cadena (Moto)',
        subtitle: 'Alarga el doble la vida del kit de arrastre en 5 minutos',
        steps: [
          'Con el motor apagado en caballete, gira la rueda a mano y limpia la cadena.',
          'Comprueba la holgura vertical en el centro: normalmente entre 20 y 30 mm.',
          'Aplica grasa específica para cadena por el interior y espera 15 min antes de rodar.',
        ],
        warning: 'NUNCA pongas una marcha con el motor encendido para engrasar la cadena.',
      },
      moto_brakes: {
        title: 'Revisión de frenos y neumáticos en moto',
        subtitle: 'Chequeo preventivo rápido antes de salir',
        steps: [
          'Observa las pastillas dentro de la pinza para asegurar espesor suficiente.',
          'Comprueba el visor de líquido DOT4 en el manillar y firmeza de la maneta.',
          'Ajusta presiones independientes delantera y trasera (aumenta si llevas pasajero).',
        ],
        warning: 'Si la maneta se siente esponjosa o roza metal, acude al taller de inmediato.',
      },
    },
  },
  de: {
    brand: 'AutoLife World',
    tagline: 'Ihr Auto oder Motorrad erinnert Sie nicht an die Wartung. Wir übernehmen das für Sie.',
    nav: {
      health: 'Zustand & Wartung',
      garage: 'Fahrzeuge & Flotte',
      ev: 'Elektromobilität',
      mechanic: 'KI-Mechaniker',
      network: 'Globales Netzwerk',
      settings: 'Konto & Einstellungen',
      admin: 'Admin-Bereich',
    },
    actions: {
      logCheck: 'Prüfung erfassen',
      addVehicle: 'Neues Fahrzeug',
      save: 'Speichern',
      cancel: 'Abbrechen',
      close: 'Schließen',
      exportCsv: 'CSV exportieren',
      askMechanic: 'Mechaniker fragen',
      send: 'Senden',
      schedule: 'Termin vorbereiten',
      updateOdometer: 'Kilometerstand',
      calculateRoute: 'Route planen',
      logCharge: 'Ladevorgang erfassen',
    },
    status: {
      [MaintenanceStatus.PENDING]: 'Nicht erfasst',
      [MaintenanceStatus.ON_TRACK]: 'Im Plan',
      [MaintenanceStatus.ATTENTION]: 'Prüfen',
      [MaintenanceStatus.OVERDUE]: 'Überfällig',
    },
    vehicleTypes: {
      car: 'Auto',
      motorcycle: 'Motorrad',
    },
    powertrain: {
      [PowertrainType.GASOLINE]: 'Benzin',
      [PowertrainType.DIESEL]: 'Diesel',
      [PowertrainType.HYBRID]: 'Hybrid',
      [PowertrainType.ELECTRIC]: '100% Elektrisch',
    },
    categories: {
      [MaintenanceCategory.OIL]: 'Motoröl',
      [MaintenanceCategory.COOLANT]: 'Kühlmittel',
      [MaintenanceCategory.TIRES]: 'Reifen',
      [MaintenanceCategory.BATTERY]: 'Batterie',
      [MaintenanceCategory.BRAKES]: 'Bremsen',
      [MaintenanceCategory.DOCUMENTATION]: 'Dokumente',
      [MaintenanceCategory.REVISION]: 'Inspektion',
      [MaintenanceCategory.TIMING_BELT]: 'Zahnriemen / Antrieb',
      [MaintenanceCategory.CHAIN_DRIVE]: 'Kettensatz & Antrieb',
      [MaintenanceCategory.SUSPENSION]: 'Gabel & Fahrwerk',
      [MaintenanceCategory.FUEL]: 'Tanken',
      [MaintenanceCategory.EXPENSE]: 'Ausgabe / Sonstiges',
    },
    health: {
      title: 'Fahrzeugzustand & Intelligente Erinnerungen',
      subtitle: 'Für Autos und Motorräder: Behalten Sie Wartungsfristen im Blick und vermeiden Sie Schäden.',
      onTrackCount: 'Im Plan',
      attentionCount: 'Prüfung fällig',
      overdueCount: 'Überfällig',
      nextDue: 'Nächste Erinnerung',
      searchPlaceholder: 'Komponente suchen...',
      allFilter: 'Alle',
      lastCheck: 'Letzte Prüfung',
      dueEvery: 'Intervall',
      daysAgo: 'Tage her',
      today: 'Heute',
      notRecorded: 'Nicht angegeben',
      guidesTitle: 'Wartung verständlich erklärt',
      guidesSubtitle: 'Sichere Schritt-für-Schritt-Anleitungen für Auto & Motorrad.',
      manualReminder: 'Beachten Sie stets die Vorgaben im offiziellen Fahrzeughandbuch.',
      modalTitle: 'Prüfung / Service erfassen',
      odometerLabel: 'Aktueller Kilometerstand',
      costLabel: 'Kosten',
      workshopLabel: 'Ort / Werkstatt',
      notesLabel: 'Notizen',
    },
    garage: {
      title: 'Garage, Flotten & Servicehistorie',
      subtitle: 'Verwalten Sie Privatfahrzeuge oder kleine Flotten markenübergreifend.',
      modePersonal: 'Privatfahrer',
      modeFleet: 'Flottenverwaltung',
      allVehicles: 'Gesamte Flotte',
      specsTitle: 'Fahrzeugdaten & Kilometerstand',
      docsTitle: 'Dokumente & Fristen',
      ledgerTitle: 'Wartungs- & Kostenverlauf',
      docLicense: 'TÜV / Zulassung',
      docInsurance: 'Kfz-Versicherung',
      expiresOn: 'Fällig am',
      plansTitle: 'AutoLife Ökosystem',
      plansSubtitle: 'Tarife für Privatfahrer, Werkstätten und Flotten.',
    },
    ev: {
      title: 'Elektromobilität & Ladeplaner',
      subtitle: 'Reichweitenschätzung, Ladestopps und Energiekosten im Überblick.',
      technicalNote:
        'Technischer Hinweis: Detaillierte Batterie-Gesundheitsdaten (SoH) und tiefe Diagnosen erfordern eine offizielle Hersteller-Anbindung oder einen kompatiblen OBD2-Adapter.',
      batterySoh: 'Batteriezustand (Geschätzt)',
      estimatedRange: 'Geschätzte Reichweite',
      efficiency: 'Durchschnittsverbrauch',
      plannerTitle: 'EV-Reise- & Ladeplaner',
      tripDistance: 'Reisedistanz',
      startSoc: 'Start-Ladestand (%)',
      chargerSpeed: 'Ladeleistung',
      stopsNeeded: 'Empfohlene Ladestopps',
      estimatedChargeTime: 'Geschätzte Ladezeit',
      arrivalSoc: 'Ankunfts-Ladestand',
      sessionsTitle: 'Ladehistorie',
      nonEvNotice:
        'Das aktive Fahrzeug ist ein Verbrenner. Wählen Sie das Elektro-SUV für Live-Daten oder simulieren Sie unten eine Reise.',
    },
    mechanic: {
      title: 'KI-Automechaniker',
      subtitle: 'Beschreiben Sie Geräusche oder Warnleuchten für eine schnelle Ersteinschätzung.',
      activeVehicleContext: 'Aktives Fahrzeug',
      placeholder: 'z.B.: Mein Auto macht beim Bremsen ein Geräusch. Was kann das sein?',
      promptsLabel: 'Häufige Fragen',
      samplePrompts: [
        'Mein Auto macht beim Bremsen ein Geräusch. Was kann das sein?',
        'Wie prüfe ich den Motorölstand richtig und sicher?',
        'Wie kontrolliere ich das Kühlmittel ohne Verbrühungsgefahr?',
        'Warum sinkt die Elektro-Reichweite auf der Autobahn?',
      ],
      possibleCauses: 'Mögliche Ursachen',
      safeChecks: 'Sichere Sichtprüfungen',
      whenWorkshop: 'Wann in die Werkstatt',
      thinking: 'Symptome werden mit Fahrzeugdaten analysiert...',
    },
    network: {
      title: 'Globales Servicenetzwerk',
      subtitle: 'Werkstätten, Schnelllader, Reifenservice, Tankstellen und Händler.',
      searchPlaceholder: 'Nach Stadt, Land oder Service suchen...',
      allCategories: 'Alle',
      workshop: 'Werkstätten',
      ev_charger: 'Ladestationen',
      tires: 'Reifenservice',
      fuel: 'Tankstellen',
      dealership: 'Autohäuser',
      openNow: 'Jetzt geöffnet',
      closed: 'Geschlossen',
      checklistTitle: 'Service-Zusammenfassung für die Werkstatt',
      checklistDesc: 'Zeigen Sie diese Fahrzeugdaten direkt bei der Annahme:',
    },
    settings: {
      title: 'Internationale Einstellungen',
      subtitle: 'Sprache, Einheiten, Währung und Erinnerungsintervalle anpassen.',
      languageLabel: 'Sprache',
      unitsLabel: 'Einheitensystem',
      metricDesc: 'Kilometer (km), Liter, PSI / kWh/100km',
      imperialDesc: 'Meilen (mi), Gallonen, PSI / mi/kWh',
      currencyLabel: 'Währung',
      themeLabel: 'Erscheinungsbild',
      light: 'Heller Modus',
      dark: 'Dunkler Modus',
      remindersTitle: 'Erinnerungsintervalle',
      oilInterval: 'Ölkontrolle (Tage)',
      tireInterval: 'Reifendruckprüfung (Tage)',
      coolantInterval: 'Kühlmittelprüfung (Tage)',
      docAlertDays: 'Vorlauf Dokumenten-Warnung (Tage)',
    },
    items: {
      oil: { title: 'Motoröl', desc: 'Ölstand am Peilstab und Wechselintervall prüfen.' },
      coolant: {
        title: 'Kühlmittel',
        desc: 'Füllstand zwischen MIN und MAX am Ausgleichsbehälter ablesen.',
        safety: 'NIEMALS bei heißem Motor öffnen. Nur äußerlich im kalten Zustand prüfen.',
      },
      tires: { title: 'Reifendruck & Profil', desc: 'Kaltdruck gemäß Türschild prüfen.' },
      battery: { title: '12V-Batterie', desc: 'Startverhalten und Pole überprüfen.' },
      brakes: { title: 'Bremsen', desc: 'Geräusche, Beläge und Bremsflüssigkeit prüfen.' },
      documentation: { title: 'Dokumente & Versicherung', desc: 'HU/TÜV und Versicherung im Blick.' },
      revision: { title: 'Regelmäßige Inspektion', desc: 'Kilometerabhängige Wartung laut Hersteller.' },
      timing_belt: { title: 'Zahnriemen / Antrieb', desc: 'Wechselintervall strikt einhalten.' },
      chain_drive: {
        title: 'Antriebskette & Ritzel',
        desc: 'Alle 500 km reinigen und fetten; Kettendurchhang von 20–30 mm prüfen.',
        safety: 'Kette NIEMALS bei laufendem Motor oder eingelegtem Gang reinigen.',
      },
      suspension: { title: 'Gabelsimmerringe & Fahrwerk', desc: 'Tauchrohre auf Ölfilm und Lenkkopflager auf Spiel prüfen.' },
      moto_oil: {
        title: 'Motorradöl (JASO MA/MA2)',
        desc: 'Aufrecht im Schauglas prüfen; kürzere Intervalle beachten.',
        safety: 'Nur JASO MA/MA2 Öl für Nasskupplungen verwenden.',
      },
      moto_tires: { title: 'Vorder- & Hinterreifen (Motorrad)', desc: 'Kaltdruck vorne und hinten getrennt prüfen.' },
      moto_brakes: { title: 'Motorradbremsen', desc: 'Belagstärke und Schauglas am Lenker kontrollieren.' },
    },
    guides: {
      oil: {
        title: 'Motoröl sicher prüfen',
        subtitle: '3-Minuten-Check auf ebenem Boden',
        steps: [
          'Eben parken und 10 Minuten nach Motorstopp warten.',
          'Peilstab ziehen (oder Motorrad senkrecht halten für Schauglas) und ablesen.',
          'Der Ölfilm muss zwischen MIN und MAX liegen.',
        ],
        warning: 'Nur Öl nach Herstellerfreigabe (JASO MA/MA2 bei Motorrädern) nachfüllen.',
      },
      coolant: {
        title: 'Kühlmittel-Sichtprüfung',
        subtitle: 'Wichtig: Füllstand prüfen heißt nicht Behälter öffnen',
        steps: [
          'Nur bei komplett kaltem Motor prüfen.',
          'Flüssigkeitsstand von außen zwischen MIN und MAX ablesen.',
          'Bei wiederholtem Verlust Werkstatt aufsuchen.',
        ],
        warning: 'VERBRÜHUNGSGEFAHR: Deckel niemals bei warmem Motor öffnen.',
      },
      tires: {
        title: 'Reifendruck richtig messen',
        subtitle: 'Mehr Reichweite, Sicherheit und Lebensdauer',
        steps: [
          'Sollwert in der Tür (Auto) oder an der Schwinge (Motorrad) ablesen.',
          'Immer bei kalten Reifen messen.',
          'Profiltiefe und Flanken auf Schäden prüfen.',
        ],
        warning: 'Zu niedriger Druck verlängert den Bremsweg.',
      },
      moto_chain: {
        title: 'Motorradkette pflegen & spannen',
        subtitle: 'Längere Lebensdauer für Kette & Kettenrad',
        steps: [
          'Bei ausgeschalteter Zündung auf dem Ständer Hinterrad drehen und Kette reinigen.',
          'Durchhang mittig messen (typisch 20–30 mm).',
          'Kettenfett innen auftragen und 15 Min einwirken lassen.',
        ],
        warning: 'NIEMALS bei laufendem Motor die Kette reinigen oder schmieren.',
      },
      moto_brakes: {
        title: 'Motorradbremsen & Reifencheck',
        subtitle: 'Kurze Sichtprüfung vor jeder Fahrt',
        steps: [
          'Belagstärke am Bremssattel prüfen.',
          'Bremsflüssigkeit im Schauglas am Lenker kontrollieren.',
          'Vorder- und Hinterrad getrennt auf Soll-PSI aufpumpen.',
        ],
        warning: 'Bei schwammigem Druckpunkt sofort eine Fachwerkstatt aufsuchen.',
      },
    },
  },
  fr: {
    brand: 'AutoLife World',
    tagline: 'Votre voiture ou moto ne vous rappellera pas de l’entretenir. Nous le faisons pour vous.',
    nav: {
      health: 'Santé & Entretien',
      garage: 'Véhicules & Flotte',
      ev: 'Monde Électrique',
      mechanic: 'Mécanicien IA',
      network: 'Réseau Mondial',
      settings: 'Compte & Préférences',
      admin: 'Panneau Admin',
    },
    actions: {
      logCheck: 'Enregistrer Contrôle',
      addVehicle: 'Nouveau Véhicule',
      save: 'Enregistrer',
      cancel: 'Annuler',
      close: 'Fermer',
      exportCsv: 'Exporter CSV',
      askMechanic: 'Consulter Mécanicien',
      send: 'Envoyer',
      schedule: 'Préparer Visite',
      updateOdometer: 'Mettre à jour km',
      calculateRoute: 'Simuler Trajet',
      logCharge: 'Enregistrer Recharge',
    },
    status: {
      [MaintenanceStatus.PENDING]: 'Non renseigné',
      [MaintenanceStatus.ON_TRACK]: 'À jour',
      [MaintenanceStatus.ATTENTION]: 'Attention',
      [MaintenanceStatus.OVERDUE]: 'En retard',
    },
    vehicleTypes: {
      car: 'Voiture',
      motorcycle: 'Moto',
    },
    powertrain: {
      [PowertrainType.GASOLINE]: 'Essence',
      [PowertrainType.DIESEL]: 'Diesel',
      [PowertrainType.HYBRID]: 'Hybride',
      [PowertrainType.ELECTRIC]: '100% Électrique',
    },
    categories: {
      [MaintenanceCategory.OIL]: 'Huile Moteur',
      [MaintenanceCategory.COOLANT]: 'Refroidissement',
      [MaintenanceCategory.TIRES]: 'Pneus',
      [MaintenanceCategory.BATTERY]: 'Batterie',
      [MaintenanceCategory.BRAKES]: 'Freins',
      [MaintenanceCategory.DOCUMENTATION]: 'Documents',
      [MaintenanceCategory.REVISION]: 'Révision',
      [MaintenanceCategory.TIMING_BELT]: 'Courroie / Transmission',
      [MaintenanceCategory.CHAIN_DRIVE]: 'Kit Chaîne & Pignons',
      [MaintenanceCategory.SUSPENSION]: 'Fourche & Suspension',
      [MaintenanceCategory.FUEL]: 'Carburant',
      [MaintenanceCategory.EXPENSE]: 'Dépense / Autre',
    },
    health: {
      title: 'Santé du Véhicule & Rappels Intelligents',
      subtitle: 'Suivez voitures et motos : ce qui est à jour, ce qui demande attention et évitez les pannes.',
      onTrackCount: 'À jour',
      attentionCount: 'Attention',
      overdueCount: 'En retard',
      nextDue: 'Prochain rappel',
      searchPlaceholder: 'Filtrer un composant...',
      allFilter: 'Tous',
      lastCheck: 'Dernier contrôle',
      dueEvery: 'Cycle',
      daysAgo: 'jours',
      today: "Aujourd'hui",
      notRecorded: 'Non renseigné',
      guidesTitle: 'Apprendre à entretenir votre voiture ou moto',
      guidesSubtitle: 'Guides visuels étape par étape pour des contrôles sans risque.',
      manualReminder: 'Respectez toujours les préconisations du manuel officiel constructeur.',
      modalTitle: 'Enregistrer un Contrôle / Entretien',
      odometerLabel: 'Kilométrage actuel',
      costLabel: 'Coût',
      workshopLabel: 'Lieu / Garage',
      notesLabel: 'Notes',
    },
    garage: {
      title: 'Garage, Flottes & Historique',
      subtitle: 'Gérez vos véhicules personnels ou petites flottes multimarques.',
      modePersonal: 'Conducteur Particulier',
      modeFleet: 'Gestion de Flotte',
      allVehicles: 'Flotte Complète',
      specsTitle: 'Fiche Technique & Compteur',
      docsTitle: 'Échéances Administratives',
      ledgerTitle: "Journal d'Entretien & Dépenses",
      docLicense: 'Contrôle Technique',
      docInsurance: 'Assurance Auto',
      expiresOn: 'Expire le',
      plansTitle: 'Écosystème Commercial AutoLife',
      plansSubtitle: 'Offres adaptées aux conducteurs, garages et gestionnaires de flotte.',
    },
    ev: {
      title: 'Monde Électrique & Planificateur',
      subtitle: 'Autonomie estimée, arrêts de recharge et suivi énergétique.',
      technicalNote:
        'Note technique : les données avancées de santé batterie (SoH) et de diagnostic électronique nécessitent une intégration constructeur ou un boîtier OBD2 compatible.',
      batterySoh: 'Santé Batterie (Estimée)',
      estimatedRange: 'Autonomie Estimée',
      efficiency: 'Consommation Moyenne',
      plannerTitle: 'Planificateur de Trajet Électrique',
      tripDistance: 'Distance du trajet',
      startSoc: 'Charge initiale (%)',
      chargerSpeed: 'Puissance borne',
      stopsNeeded: 'Arrêts recommandés',
      estimatedChargeTime: 'Temps de charge total',
      arrivalSoc: "Charge estimée à l'arrivée",
      sessionsTitle: 'Historique de Recharge',
      nonEvNotice:
        'Le véhicule actif est thermique. Sélectionnez le SUV Électrique pour les données batterie ou simulez un trajet ci-dessous.',
    },
    mechanic: {
      title: 'Mécanicien par Intelligence Artificielle',
      subtitle: 'Décrivez un bruit ou un voyant pour obtenir une analyse préventive claire.',
      activeVehicleContext: 'Diagnostic du véhicule actif',
      placeholder: 'Ex : Ma voiture fait un bruit au freinage. Que peut-il se passer ?',
      promptsLabel: 'Questions fréquentes',
      samplePrompts: [
        'Ma voiture fait un bruit quand je freine. Que peut-il se passer ?',
        "Cela fait 20 jours que je n'ai pas vérifié l'huile. Comment faire ?",
        'Comment contrôler le liquide de refroidissement sans danger ?',
        "Mon autonomie électrique baisse sur autoroute. Est-ce normal ?",
      ],
      possibleCauses: 'Causes possibles',
      safeChecks: 'Vérifications sans danger',
      whenWorkshop: 'Quand consulter un garage',
      thinking: 'Analyse des symptômes avec votre véhicule...',
    },
    network: {
      title: 'Réseau Automobile Mondial',
      subtitle: 'Garages, bornes rapides, centres de pneus, stations et concessions.',
      searchPlaceholder: 'Rechercher par ville, pays ou service...',
      allCategories: 'Tous',
      workshop: 'Garages',
      ev_charger: 'Bornes EV',
      tires: 'Pneus',
      fuel: 'Stations',
      dealership: 'Concessions',
      openNow: 'Ouvert',
      closed: 'Fermé',
      checklistTitle: 'Fiche de Synthèse pour le Garage',
      checklistDesc: 'Présentez les informations exactes de votre véhicule :',
    },
    settings: {
      title: 'Plateforme Internationale & Préférences',
      subtitle: 'Langue, unités de mesure, devise et intervalles de rappel.',
      languageLabel: 'Langue',
      unitsLabel: 'Unités',
      metricDesc: 'Kilomètres (km), Litres, PSI / kWh/100km',
      imperialDesc: 'Miles (mi), Gallons, PSI / mi/kWh',
      currencyLabel: 'Devise',
      themeLabel: 'Thème',
      light: 'Mode Clair',
      dark: 'Mode Sombre',
      remindersTitle: 'Intervalles des Rappels',
      oilInterval: "Contrôle d'huile (jours)",
      tireInterval: 'Pression des pneus (jours)',
      coolantInterval: 'Liquide de refroidissement (jours)',
      docAlertDays: 'Alerte documents (jours avant)',
    },
    items: {
      oil: { title: 'Huile Moteur', desc: 'Contrôler la jauge et respecter la vidange constructeur.' },
      coolant: {
        title: 'Liquide de Refroidissement',
        desc: 'Lire le niveau entre MIN et MAX sur le vase transparent.',
        safety: 'NE JAMAIS ouvrir le bouchon moteur chaud. Vérifier à froid uniquement.',
      },
      tires: { title: 'Pression & Usure des Pneus', desc: 'Gonfler à froid selon l’étiquette portière.' },
      battery: { title: 'Batterie 12V / Auxiliaire', desc: 'Vérifier démarrage et cosses.' },
      brakes: { title: 'Freins', desc: 'Surveiller bruits, plaquettes et liquide.' },
      documentation: { title: 'Documents & Assurance', desc: 'Suivi du contrôle technique et assurance.' },
      revision: { title: 'Révision Périodique', desc: 'Entretien programmé selon le kilométrage.' },
      timing_belt: { title: 'Courroie de Distribution', desc: 'Contrôle strict de l’échéance.' },
      chain_drive: {
        title: 'Kit Chaîne (Chaîne, Couronne & Pignon)',
        desc: 'Nettoyer et graisser tous les 500 km ; vérifier une flèche de 20 à 30 mm.',
        safety: 'NE JAMAIS nettoyer ou graisser la chaîne moteur allumé ou vitesse enclenchée.',
      },
      suspension: { title: 'Fourche & Suspension', desc: 'Vérifier les joints spi de fourche et la colonne de direction.' },
      moto_oil: {
        title: 'Huile Moto & Embrayage (JASO MA/MA2)',
        desc: 'Contrôler moto droite à plat (vidanges plus fréquentes : 1 500 à 3 000 km).',
        safety: 'Utiliser uniquement une huile norme JASO MA/MA2 pour embrayage humide.',
      },
      moto_tires: { title: 'Pneus Avant & Arrière Moto', desc: 'Gonfler à froid selon pressions avant/arrière distinctes.' },
      moto_brakes: { title: 'Freins Moto', desc: 'Contrôler plaquettes et niveau DOT4 au guidon.' },
    },
    guides: {
      oil: {
        title: "Vérifier l'huile moteur en sécurité",
        subtitle: 'Contrôle rapide sur sol plat',
        steps: [
          'Garez-vous à plat et attendez 10 minutes moteur coupé.',
          'Tirez la jauge (ou tenez la moto droite pour lire le hublot) et vérifiez.',
          "Le niveau doit se situer entre MIN et MAX.",
        ],
        warning: 'Utilisez la viscosité et norme (JASO MA/MA2 en moto) du manuel.',
      },
      coolant: {
        title: 'Contrôle visuel du refroidissement',
        subtitle: 'Règle vitale : vérifier le niveau ne signifie pas ouvrir le bocal',
        steps: [
          'Attendez que le moteur soit totalement froid.',
          'Observez le niveau par transparence entre MIN et MAX.',
          'En cas de baisse répétée, faites contrôler le circuit en garage.',
        ],
        warning: 'RISQUE DE BRÛLURE : Ne jamais ouvrir le bouchon sous pression à chaud.',
      },
      tires: {
        title: 'Contrôle de la pression des pneus',
        subtitle: 'Sécurité de freinage et autonomie optimisée',
        steps: [
          'Consultez la pression à froid sur la portière (auto) ou le bras oscillant (moto).',
          'Mesurez avant de rouler plus de 3 km.',
          'Vérifiez la bande de roulement et les flancs.',
        ],
        warning: 'Des pneus sous-gonflés augmentent la distance de freinage.',
      },
      moto_chain: {
        title: 'Nettoyage, graissage et tension de chaîne (Moto)',
        subtitle: 'Prolongez la durée de vie du kit chaîne en 5 minutes',
        steps: [
          'Contact coupé sur béquille, tournez la roue à la main et brossez la chaîne.',
          'Vérifiez la flèche verticale au centre (généralement 20 à 30 mm).',
          'Appliquez la graisse chaîne à l’intérieur et attendez 15 min avant de rouler.',
        ],
        warning: 'NE JAMAIS engager une vitesse moteur tournant pour graisser la chaîne.',
      },
      moto_brakes: {
        title: 'Freins et pneus de moto',
        subtitle: 'Inspection rapide avant de prendre la route',
        steps: [
          'Vérifiez l’épaisseur des plaquettes dans les étriers.',
          'Contrôlez le hublot DOT4 au guidon et la fermeté du levier.',
          'Réglez séparément la pression avant et arrière.',
        ],
        warning: 'En cas de levier spongieux ou de bruit métallique, consultez un atelier immédiatement.',
      },
    },
  },
};
