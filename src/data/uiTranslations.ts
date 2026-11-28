import { LanguageCode } from '../types/autolife';

export interface UiBundle {
  localeTag: string;
  header: {
    addShort: string;
  };
  sidebar: {
    noVehicles: string;
    add: string;
    remove: string;
    removeTitle: string;
  };
  pwa: {
    offlineBadge: string;
    installBtn: string;
    installTitle: string;
    installedOk: string;
    iosTitle: string;
    iosDesc: string;
    iosStep1: string;
    iosStep2: string;
    iosStep3: string;
    gotIt: string;
  };
  app: {
    mapsQuotaMsg: string;
    mapsQuotaLink: string;
    closeNotice: string;
    waBannerTitle: string;
    waBannerDescPrefix: string;
    waBannerDefaultAccount: string;
    waBannerDescSuffix: string;
    waSaveBtn: string;
    waLaterBtn: string;
    waInvalidError: string;
    waPlaceholder: string;
  };
  whatsapp: {
    buttonLabel: string;
    buttonDefaultTitle: string;
    invalidError: string;
    connectTitle: string;
    connectDesc: string;
    inputLabel: string;
    inputPlaceholder: string;
    cancel: string;
    saveOnly: string;
    saveAndOpen: string;
    close: string;
  };
  vehicleColors: {
    labels: Record<string, string>;
    categoryLabels: {
      electric: string;
      motoTrail: string;
      moto: string;
      suv: string;
      sedan: string;
    };
  };
  modals: {
    addTitle: string;
    editTitle: string;
    close: string;
    cancel: string;
    saveVehicle: string;
    saveChanges: string;
    saveLog: string;
    scanBannerTitle: string;
    scanBannerDesc: string;
    scanCameraBtn: string;
    scanFileBtn: string;
    scanning: string;
    scanSuccess: string;
    scanInvalidFile: string;
    scanFailed: string;
    planLimitReached: string;
    planLimitExpiredPrefix: string;
    planLimitActivePrefix: string;
    planLimitUpgradeBtn: string;
    vehicleKindLabel: string;
    vehicleKindCar: string;
    vehicleKindMoto: string;
    brandLabel: string;
    brandPlaceholderCar: string;
    brandPlaceholderMoto: string;
    modelLabel: string;
    modelPlaceholderCar: string;
    modelPlaceholderMoto: string;
    yearLabel: string;
    plateLabel: string;
    colorLabel: string;
    colorSelectedNone: string;
    colorCustomPlaceholder: string;
    powertrainLabel: string;
    displacementLabel: string;
    odometerLabel: string;
    frontPsiLabel: string;
    rearPsiLabel: string;
    singlePsiLabel: string;
    weeklyKmLabel: string;
    fleetGroupLabel: string;
    personalGroup: string;
    fleetGroup: string;
    licenseDateLabel: string;
    insuranceDateLabel: string;
    vinLabel: string;
    attachDocLabel: string;
    attachCamera: string;
    attachFile: string;
    deleteTitle: string;
    deleteConfirmBtn: string;
    deleteDescPrefix: string;
    deleteLogsLabel: string;
    deleteChargesLabel: string;
    deleteItemsLabel: string;
    deleteDocsLabel: string;
    deletePermanentNote: string;
    logVehicleLabel: string;
    logItemLabel: string;
    logDateLabel: string;
    logCostLabel: string;
    logSelfCheck: string;
  };
  healthUi: {
    emptyTitle: string;
    emptyDesc: string;
    emptyBtn: string;
    statusBadge: {
      pending: string;
      excellent: string;
      good: string;
      attention: string;
      critical: string;
    };
    tabs: {
      checklist: string;
      guides: string;
      finalReport: string;
    };
    actions: {
      preTrip: string;
      odometer: string;
      tirePsi: string;
      saveOdometer: string;
      clearFilters: string;
      registerNow: string;
      schedule: string;
      details: string;
    };
    hero: {
      title: string;
      recordedOf: string;
      summaryPending: string;
      summaryOverdue: string;
      summaryAttention: string;
      summaryHealthy: string;
      nextOilLabel: string;
      nextRevisionLabel: string;
      dueToday: string;
      overdueBy: string;
      remaining: string;
    };
    starter: {
      title: string;
      desc: string;
      cta: string;
    };
    nextSteps: {
      title: string;
      subtitle: string;
      allGood: string;
    };
    groups: {
      safety: string;
      engine: string;
      docs: string;
    };
    card: {
      cycleDetails: string;
      cycleUsage: string;
      everyDaysOrKm: string;
      safetyNote: string;
      intervalLabel: string;
      dueLabel: string;
      sendWhatsappTitle: string;
      addCalendarTitle: string;
      askMechanicTitle: string;
    };
    guides: {
      scopeAll: string;
      scopeCar: string;
      scopeMoto: string;
      emptyFilter: string;
      tipPrefix: string;
    };
    preTrip: {
      title: string;
      subtitle: string;
      distanceLabel: string;
      loadLabel: string;
      soloOption: string;
      heavyMotoOption: string;
      normalCarOption: string;
      heavyCarOption: string;
      verifiedOf: string;
      sendWa: string;
      readyBtn: string;
      items: {
        tires: string;
        oil: string;
        coolant: string;
        lights: string;
        chainOrSpare: string;
        brakes: string;
        docs: string;
      };
    };
    drivingProfiles: Record<'city' | 'highway' | 'mixed' | 'severe', string>;
  };
  garageUi: {
    emptyTitle: string;
    emptyDesc: string;
    emptyBtn: string;
    bannerTitle: string;
    bannerDesc: string;
    kpi: {
      vehicles: string;
      weeklyKm: string;
      tco: string;
      costPerKm: string;
      pendingDocs: string;
    };
    actions: {
      medical: string;
      passport: string;
      edit: string;
      remove: string;
    };
    fleet: {
      title: string;
      subtitle: string;
      gateTitle: string;
      gateDesc: string;
      gateBtn: string;
      searchPlaceholder: string;
      filterAll: string;
      filterCars: string;
      filterMotos: string;
      filterPersonal: string;
      filterFleet: string;
      colVehicle: string;
      colPlateColor: string;
      colDriver: string;
      colProfile: string;
      colOdometer: string;
      colStatus: string;
      colCosts: string;
      colActions: string;
      unassigned: string;
      noColor: string;
      statusOk: string;
      statusAttention: string;
      statusOverdue: string;
      statusPending: string;
      showingCount: string;
    };
    specs: {
      colorLabel: string;
      notInformed: string;
      profileLabel: string;
      weeklyAvgLabel: string;
      accumulatedTco: string;
      costPerKmLabel: string;
      vinLabel: string;
      docsNotSet: string;
    };
  };
  evUi: {
    emptyTitle: string;
    emptyDesc: string;
    emptyBtn: string;
    sendChargeWaTitle: string;
  };
  networkUi: {
    mapSearchTerms: Record<'workshop' | 'ev_charger' | 'tires' | 'fuel' | 'dealership', string>;
    geoUnsupported: string;
    geoDenied: string;
    useLocation: string;
    locActive: string;
    addPlace: string;
    searchMapsBtn: string;
    emptyTitle: string;
    emptyDesc: string;
    addModalTitle: string;
    placeName: string;
    placeCategory: string;
    placeCity: string;
    placeAddress: string;
    placePhone: string;
    placeNotes: string;
    savePlace: string;
    removePlace: string;
    openMaps: string;
    kmAway: string;
  };
  settingsUi: {
    accountTitle: string;
    accountSubtitle: string;
    connectedBadge: string;
    localOnlyBadge: string;
    syncGarageBtn: string;
    syncingBtn: string;
    syncedMsg: string;
    signOutBtn: string;
    authOAuthHint: string;
    continueWith: string;
    signInTab: string;
    signUpTab: string;
    emailLabel: string;
    passwordLabel: string;
    signInBtn: string;
    signUpBtn: string;
    authRequiredTitle: string;
    authSuccessSignIn: string;
    authSuccessSignUp: string;
    vehiclesTitle: string;
    vehiclesPlanUsage: string;
    upgradePlanBtn: string;
    addVehicleBtn: string;
    activeBadge: string;
    selectBtn: string;
    removeBtn: string;
    whatsappTitle: string;
    whatsappDesc: string;
    whatsappSavedBadge: string;
    whatsappSaveBtn: string;
    whatsappSavedMsg: string;
    whatsappInvalidMsg: string;
    regionCountryLabel: string;
    regionCurrencyLabel: string;
    regionAutoBtn: string;
    regionAutoApplied: string;
    pushTitle: string;
    pushDesc: string;
    pushSupported: string;
    pushUnsupported: string;
    pushEnableBtn: string;
    pushDisableBtn: string;
    pushTestBtn: string;
    pushEnabledMsg: string;
    pushDisabledMsg: string;
    pushVapidActive: string;
    remindersSavedHint: string;
  };
  medicalUi: {
    title: string;
    subtitle: string;
    addRecordBtn: string;
    exportPdfBtn: string;
    generatingPdf: string;
    summaryRecords: string;
    summaryTotalInvested: string;
    summaryPhotos: string;
    radarTitle: string;
    radarUrgentOnly: string;
    radarAll: string;
    radarShow: string;
    radarHide: string;
    radarAllClear: string;
    radarCompleteBtn: string;
    radarWaiting: string;
    radarOverdue: string;
    radarDueSoon: string;
    radarOnTrack: string;
    radarNoDate: string;
    radarNoDateHint: string;
    radarDueIn: string;
    radarOverdueByDays: string;
    radarOverdueByKm: string;
    radarSuggestedCycle: string;
    radarImmediate: string;
    dossierTitle: string;
    dossierDesc: string;
    dossierWhatsappBtn: string;
    dossierEmailBtn: string;
    dossierCopyBtn: string;
    dossierCopied: string;
    timelineSearchPlaceholder: string;
    filterAll: string;
    filterMaintenance: string;
    filterFuel: string;
    filterEv: string;
    filterExpense: string;
    noTimelineEntries: string;
    workshopLabel: string;
    photoCameraBtn: string;
    photoCameraTitle: string;
    photoGalleryTitle: string;
    viewBtn: string;
    downloadBtn: string;
    deleteAttAria: string;
    modalCreateTitle: string;
    modalCompleteReminderTitle: string;
    modalAutoCycleNote: string;
    kindMaintenance: string;
    kindRevision: string;
    kindFuel: string;
    kindEvCharge: string;
    kindExpense: string;
    categoryLabel: string;
    dateLabel: string;
    kmLabel: string;
    energyKwhLabel: string;
    powerTypeLabel: string;
    socStartLabel: string;
    socEndLabel: string;
    whatWasDoneLabel: string;
    placeholderFuel: string;
    placeholderRevision: string;
    placeholderExpense: string;
    placeholderMaint: string;
    placeLabelStation: string;
    placeLabelCharger: string;
    placeLabelWorkshop: string;
    placePhStation: string;
    placePhCharger: string;
    placePhWorkshop: string;
    amountLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    attachSectionTitle: string;
    takePhotoBtn: string;
    galleryBtn: string;
    saveRecordBtn: string;
    attachmentCategories: Record<'receipt' | 'insurance' | 'document' | 'vehicle_photo' | 'inspection' | 'diagnostic', string>;
    monthNames: string[];
    otherRecordsHeading: string;
  };
  finalReportUi: {
    headerBadge: string;
    headerSubtitle: string;
    sortOldest: string;
    sortNewest: string;
    downloadPdfBtn: string;
    sendWaPdfBtn: string;
    sendEmailBtn: string;
    printBtn: string;
    kpiEvents: string;
    kpiMaintenances: string;
    kpiPhotosDocs: string;
    kpiTotalInvested: string;
    quickSendWaLabel: string;
    quickSendEmailLabel: string;
    timelineTitle: string;
    timelineEmpty: string;
    galleryTitle: string;
    galleryEmpty: string;
    galleryConnectHint: string;
    uploadCategoryLabel: string;
    uploadNotesPlaceholder: string;
    snapshotTitle: string;
    snapshotColItem: string;
    snapshotColStatus: string;
    snapshotColLast: string;
    snapshotColNext: string;
    openBtn: string;
    downloadBtn: string;
    deleteAria: string;
    pdfGeneratedMsg: string;
    pdfSharedMsg: string;
    pdfErrorMsg: string;
    photoSavedMsg: string;
  };
  passportUi: {
    badge: string;
    plateLabel: string;
    kpiOnTrack: string;
    kpiVerifiedLogs: string;
    kpiInvestment: string;
    kpiIssuedAt: string;
    qrPublicLabel: string;
    qrAuthTitle: string;
    linkActiveRevoke: string;
    linkRevokedReactivate: string;
    includeExpenses: string;
    includeDocuments: string;
    copyBtn: string;
    copiedBtn: string;
    signInHint: string;
    updatingPassport: string;
    odometerTitle: string;
    historyTitle: string;
    emptyHistory: string;
    sendWaBtn: string;
    printPdfBtn: string;
    publicBadge: string;
    openAppBtn: string;
    verifying: string;
    unavailableTitle: string;
    unavailableDesc: string;
    authenticatedBadge: string;
    currentOdometer: string;
    preventiveHealth: string;
    onTrackSuffix: string;
    odometerMarksTitle: string;
    marksSuffix: string;
    updatedAt: string;
    maintHistoryTitle: string;
    noPublicServices: string;
    verifiedDocsTitle: string;
  };
  vaultUi: {
    title: string;
    subtitlePrefix: string;
    subtitleSuffix: string;
    connectAccountBtn: string;
    unavailable: string;
    signInPromptPrefix: string;
    signInPromptBtn: string;
    signInPromptSuffix: string;
    typeLabel: string;
    dateLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    takePhotoBtn: string;
    galleryBtn: string;
    loading: string;
    empty: string;
    expiredLink: string;
    viewBtn: string;
    downloadBtn: string;
    sendWaTitle: string;
    deleteAria: string;
    uploadSuccess: string;
    uploadError: string;
    loadError: string;
  };
  plansUi: {
    subtitle: string;
    sourceDb: string;
    sourceFallback: string;
    monthly: string;
    annualDiscount: string;
    currentHeader: string;
    vehicleUnit: string;
    neverDeletedNote: string;
    dueLabel: string;
    autoRenewLabel: string;
    on: string;
    off: string;
    cancelSubBtn: string;
    graceWarningPrefix: string;
    graceWarningSuffix: string;
    paymentHistoryTitle: string;
    currentPlanBadge: string;
    activeBadge: string;
    perMonth: string;
    estFee: string;
    upToVehicles: string;
    over100Vehicles: string;
    fromPrice: string;
    renewSwitchCurrency: string;
    subscribePersonal: string;
    contactB2b: string;
    manageRenew: string;
    subscribePlan: string;
    checkoutPixTitle: string;
    checkoutIntlTitle: string;
    scanPixPrompt: string;
    pixCopyPasteLabel: string;
    changeMethodBtn: string;
    doneBtn: string;
    verifyPixBtn: string;
    pixConfirmedMsg: string;
    pixPendingMsg: string;
    localCurrencyLabel: string;
    billingCycleLabel: string;
    monthlyLabel: string;
    annualLabel: string;
    paymentMethodsLabel: string;
    receiptEmailLabel: string;
    subtotalLabel: string;
    regionalTaxesFallback: string;
    processingFeeLabel: string;
    finalTotalLabel: string;
    generatePixBtn: string;
    payWithCardBtn: string;
    statusLabels: Record<'active' | 'trialing' | 'past_due' | 'grace_period' | 'canceled' | 'expired', string>;
  };
  analyticsUi: {
    title: string;
    subtitle: string;
    scopeAll: string;
    scopeCars: string;
    scopeMotos: string;
    scopeActive: string;
    kpiMaintenance: string;
    kpiCharging: string;
    kpiEnergy: string;
    chartVehicleTitle: string;
    chartTrendTitle: string;
    emptyTrend: string;
    legendMaintenance: string;
    legendCharging: string;
    legendChargingCost: string;
    legendEnergy: string;
  };
  carbonUi: {
    title: string;
    subtitle: string;
    gridBrazil: string;
    gridGlobal: string;
    kpiMonthlyCo2: string;
    kpiEstMonthDist: string;
    kpiAvoidedCo2: string;
    kpiAvoided6m: string;
    kpiReduction: string;
    kpiTreesYear: string;
    kpiIntensity: string;
    kpiEvTarget: string;
    chartEvolutionTitle: string;
    chartPerVehicleTitle: string;
    tooltipReal: string;
    tooltipAvoided: string;
    tooltipBaseline: string;
    tooltipMonthlyDist: string;
    legendReal: string;
    legendAvoided: string;
    legendBaseline: string;
    legendActualVehicle: string;
    legendSavingsVehicle: string;
    simPrefix: string;
    simMiddle: string;
    simMiddle2: string;
    simTrees: string;
    simAllEvTitle: string;
    simAllEvSuffix: string;
    powertrainLabels: {
      electric: string;
      hybrid: string;
      diesel: string;
      combustion: string;
    };
  };
  teamUi: {
    disconnectedTitle: string;
    disconnectedDesc: string;
    connectBtn: string;
    title: string;
    isolatedNote: string;
    teamCountLabel: string;
    companyNameLabel: string;
    companyPlaceholder: string;
    taxIdLabel: string;
    taxIdPlaceholder: string;
    saveBtn: string;
    savedBtn: string;
    inviteTitle: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    inviteBtn: string;
    statusActive: string;
    statusPending: string;
    statusRevoked: string;
    reactivateBtn: string;
    suspendBtn: string;
    removeMemberAria: string;
    limitReachedMsg: string;
    inviteSuccessMsg: string;
    roles: Record<'admin' | 'fleet_manager' | 'driver' | 'viewer', string>;
    permissions: Record<'canViewVehicles' | 'canEditVehicles' | 'canLogMaintenance' | 'canViewExpenses' | 'canManageTeam', string>;
  };
  adminUi: {
    title: string;
    subtitlePrefix: string;
    subtitleSuffix: string;
    refreshBtn: string;
    sqlSetupTitle: string;
    sqlSetupDesc: string;
    copySqlBtn: string;
    copiedSqlBtn: string;
    grantTitle: string;
    emailLabel: string;
    planLabel: string;
    durationLabel: string;
    grantHint: string;
    grantBtn: string;
    accountsTitle: string;
    searchPlaceholder: string;
    loading: string;
    emptyNeedSql: string;
    emptyNoMatch: string;
    noExpiry: string;
    selectBtn: string;
    grantEnterpriseBtn: string;
    planLabelPrefix: string;
    statusLabelPrefix: string;
    vehiclesLabel: string;
    expiryLabelPrefix: string;
  };
  pdfUi: {
    headerSubtitle: string;
    footerRight: string;
    pageLabel: string;
    ofLabel: string;
    vehicleLabel: string;
    plateLabel: string;
    yearLabel: string;
    odometerLabel: string;
    powertrainLabel: string;
    colorLabel: string;
    ownerLabel: string;
    issuedLabel: string;
    docExpiryLabel: string;
    insExpiryLabel: string;
    notInformed: string;
    summaryEvents: string;
    summaryMaintenances: string;
    summaryPhotos: string;
    summaryTotal: string;
    timelineTitle: string;
    emptyTimeline: string;
    colDate: string;
    colCategory: string;
    colTitle: string;
    colKm: string;
    colWorkshop: string;
    colCost: string;
    preventiveTitle: string;
    colItem: string;
    colStatus: string;
    colLastRecord: string;
    colNextDue: string;
    photosSectionTitle: string;
    filenamePrefix: string;
    timelineBadges: {
      evCharge: string;
      photoPrefix: string;
    };
  };
}

export const UI_BUNDLE: Record<LanguageCode, UiBundle> = {
  pt: {
    localeTag: 'pt-BR',
    header: { addShort: 'Novo' },
    sidebar: {
      noVehicles: 'Nenhum veículo cadastrado',
      add: 'Adicionar',
      remove: 'Remover',
      removeTitle: 'Remover veículo e todo o seu histórico',
    },
    pwa: {
      offlineBadge: 'Modo Offline — Dados locais ativos',
      installBtn: 'Instalar App (PWA)',
      installTitle: 'Instalar AutoLife World no dispositivo',
      installedOk: 'App Instalado',
      iosTitle: 'Instalar no iPhone',
      iosDesc: 'No Safari, toque no ícone de compartilhar e depois em "Adicionar à Tela de Início".',
      iosStep1: '1. Toque no botão Compartilhar na barra inferior do Safari.',
      iosStep2: '2. Role para baixo e selecione "Adicionar à Tela de Início".',
      iosStep3: '3. Confirme tocando em "Adicionar" no canto superior direito.',
      gotIt: 'Entendi',
    },
    app: {
      mapsQuotaMsg: 'Limite temporário da chave de demonstração do Google Maps atingido.',
      mapsQuotaLink: 'Saiba como usar sua própria chave com crédito gratuito',
      closeNotice: 'Fechar aviso',
      waBannerTitle: 'Complete seu cadastro único (E-mail + WhatsApp)',
      waBannerDescPrefix: 'E-mail já vinculado:',
      waBannerDefaultAccount: 'Conta conectada',
      waBannerDescSuffix: 'Salve seu WhatsApp uma única vez para enviar toda a ficha técnica e avisos com 1 clique.',
      waSaveBtn: 'Salvar WhatsApp',
      waLaterBtn: 'Agora não',
      waInvalidError: 'Informe um WhatsApp válido com DDD/DDI (ex.: +55 11 99999-8888).',
      waPlaceholder: 'Ex.: +55 11 99999-8888',
    },
    whatsapp: {
      buttonLabel: 'WhatsApp',
      buttonDefaultTitle: 'Enviar para WhatsApp cadastrado',
      invalidError: 'Informe um WhatsApp válido com DDD e DDI (ex.: +55 11 99999-8888).',
      connectTitle: 'Conectar WhatsApp',
      connectDesc: 'Cadastre seu número uma vez para enviar qualquer serviço, nota ou agendamento direto para o seu WhatsApp.',
      inputLabel: 'WhatsApp cadastrado (com DDI + DDD)',
      inputPlaceholder: 'Ex.: +55 11 99999-8888',
      cancel: 'Cancelar',
      saveOnly: 'Salvar WhatsApp',
      saveAndOpen: 'Salvar e Abrir WhatsApp',
      close: 'Fechar',
    },
    vehicleColors: {
      labels: {
        white: 'Branco',
        black: 'Preto',
        silver: 'Prata',
        gray: 'Cinza',
        red: 'Vermelho',
        blue: 'Azul',
        green: 'Verde',
        yellow: 'Amarelo',
        brown: 'Marrom',
        orange: 'Laranja',
      },
      categoryLabels: {
        electric: 'Elétrico / Híbrido',
        motoTrail: 'Moto Trail / Touring',
        moto: 'Motocicleta',
        suv: 'SUV / Utilitário',
        sedan: 'Automóvel',
      },
    },
    modals: {
      addTitle: 'Novo Veículo',
      editTitle: 'Editar Veículo',
      close: 'Fechar',
      cancel: 'Cancelar',
      saveVehicle: 'Cadastrar Veículo',
      saveChanges: 'Salvar Alterações',
      saveLog: 'Salvar Registro',
      scanBannerTitle: 'Preencher com foto do documento (Opcional)',
      scanBannerDesc: 'Envie CRLV, Permiso de Circulación, DUA ou Registration de qualquer país para preencher marca, modelo, ano, placa e cor automaticamente.',
      scanCameraBtn: 'Usar Câmera',
      scanFileBtn: 'Enviar Foto / PDF',
      scanning: 'Lendo documento com IA...',
      scanSuccess: 'Dados extraídos com sucesso! Revise os campos antes de salvar.',
      scanInvalidFile: 'Envie uma foto (JPG/PNG/WEBP) ou PDF do documento.',
      scanFailed: 'Não foi possível ler o documento automaticamente. Preencha os campos manualmente.',
      planLimitReached: 'Limite de veículos do plano atingido',
      planLimitExpiredPrefix: 'Sua assinatura expirou. Os veículos já cadastrados continuam preservados, mas novos cadastros estão bloqueados.',
      planLimitActivePrefix: 'Seu plano atual comporta até',
      planLimitUpgradeBtn: 'Ver Planos & Upgrade',
      vehicleKindLabel: 'Tipo de veículo',
      vehicleKindCar: 'Carro / Utilitário',
      vehicleKindMoto: 'Motocicleta',
      brandLabel: 'Marca',
      brandPlaceholderCar: 'Ex.: Toyota, VW, Tesla',
      brandPlaceholderMoto: 'Ex.: Honda, Yamaha, BMW',
      modelLabel: 'Modelo',
      modelPlaceholderCar: 'Ex.: Corolla Cross, Golf',
      modelPlaceholderMoto: 'Ex.: CB 500X, MT-07',
      yearLabel: 'Ano',
      plateLabel: 'Placa / Matrícula',
      colorLabel: 'Cor do veículo',
      colorSelectedNone: 'Não selecionada',
      colorCustomPlaceholder: 'Ou digite uma cor personalizada (ex.: Azul Metálico)',
      powertrainLabel: 'Motorização',
      displacementLabel: 'Cilindrada (cc)',
      odometerLabel: 'Odômetro atual',
      frontPsiLabel: 'PSI Dianteiro',
      rearPsiLabel: 'PSI Traseiro',
      singlePsiLabel: 'Pressão Pneus (PSI)',
      weeklyKmLabel: 'Uso semanal (km/sem)',
      fleetGroupLabel: 'Categoria',
      personalGroup: 'Uso Particular',
      fleetGroup: 'Frota / Trabalho',
      licenseDateLabel: 'Vencimento Licenciamento / ITV',
      insuranceDateLabel: 'Vencimento Seguro',
      vinLabel: 'Chassi / VIN / RENAVAM (opcional)',
      attachDocLabel: 'Anexar foto do documento no Cofre Privado (opcional)',
      attachCamera: 'Câmera',
      attachFile: 'Arquivo',
      deleteTitle: 'Remover veículo e histórico?',
      deleteConfirmBtn: 'Remover Permanentemente',
      deleteDescPrefix: 'Esta ação apaga permanentemente este veículo e todos os seus dados:',
      deleteLogsLabel: 'registro(s) na Ficha Médica',
      deleteChargesLabel: 'recarga(s) elétrica(s)',
      deleteItemsLabel: 'itens preventivos monitorados',
      deleteDocsLabel: 'documento(s) no cofre privado',
      deletePermanentNote: 'Esta exclusão também remove os registros sincronizados na nuvem.',
      logVehicleLabel: 'Veículo ativo',
      logItemLabel: 'Componente / Serviço',
      logDateLabel: 'Data da realização',
      logCostLabel: 'Valor pago',
      logSelfCheck: 'Verificação Própria',
    },
    healthUi: {
      emptyTitle: 'Nenhum veículo cadastrado',
      emptyDesc: 'Cadastre seu carro ou motocicleta para ativar o painel de Saúde & Manutenção, lembretes preventivos e ficha médica completa.',
      emptyBtn: 'Cadastrar Meu Veículo',
      statusBadge: {
        pending: 'Aguardando registros',
        excellent: 'Excelente',
        good: 'Bom',
        attention: 'Atenção',
        critical: 'Crítico',
      },
      tabs: {
        checklist: 'Checklist & Lembretes',
        guides: 'Guias Ilustrados',
        finalReport: 'Relatório Final',
      },
      actions: {
        preTrip: 'Pré-Viagem 60s',
        odometer: 'Odômetro',
        tirePsi: 'Calibragem',
        saveOdometer: 'Atualizar',
        clearFilters: 'Limpar filtros',
        registerNow: 'Registrar agora',
        schedule: 'Agenda',
        details: 'Detalhes',
      },
      hero: {
        title: 'Saúde & Manutenção',
        recordedOf: 'itens com registro de',
        summaryPending: 'Registre os primeiros serviços para ativar os alertas preventivos de',
        summaryOverdue: 'Existem manutenções vencidas para',
        summaryAttention: 'Alguns componentes estão próximos do vencimento em',
        summaryHealthy: 'Tudo em dia para',
        nextOilLabel: 'Troca de óleo',
        nextRevisionLabel: 'Próxima revisão',
        dueToday: 'Hoje',
        overdueBy: 'atrasado',
        remaining: 'restantes',
      },
      starter: {
        title: 'Comece o acompanhamento preventivo',
        desc: 'Registre o último serviço ou troca de óleo para calcular automaticamente as próximas previsões por data e quilometragem.',
        cta: 'Registrar 1º Serviço',
      },
      nextSteps: {
        title: 'Próximos Passos Prioritários',
        subtitle: 'Itens que merecem atenção antes dos demais:',
        allGood: 'Nenhuma pendência urgente no momento.',
      },
      groups: {
        safety: 'Segurança',
        engine: 'Motor & Sistemas',
        docs: 'Documentos & Prazos',
      },
      card: {
        cycleDetails: 'Detalhes',
        cycleUsage: 'Uso do ciclo',
        everyDaysOrKm: 'A cada',
        safetyNote: 'Atenção de segurança',
        intervalLabel: 'Ciclo:',
        dueLabel: 'Previsto:',
        sendWhatsappTitle: 'Enviar lembrete no WhatsApp',
        addCalendarTitle: 'Baixar lembrete (.ics)',
        askMechanicTitle: 'Tirar dúvida no Mecânico IA',
      },
      guides: {
        scopeAll: 'Todos',
        scopeCar: 'Carro',
        scopeMoto: 'Moto',
        emptyFilter: 'Nenhum guia para este filtro.',
        tipPrefix: 'Regra de segurança:',
      },
      preTrip: {
        title: 'Checklist Pré-Viagem 60s',
        subtitle: 'Inspeção visual rápida antes de pegar a estrada com segurança.',
        distanceLabel: 'Distância da viagem',
        loadLabel: 'Lotação / Carga',
        soloOption: 'Somente piloto',
        heavyMotoOption: 'Garupa / Baú carregado (+3 PSI traseiro)',
        normalCarOption: 'Carga normal',
        heavyCarOption: 'Carro cheio / bagagem (+3 PSI)',
        verifiedOf: 'verificados',
        sendWa: 'Enviar no WhatsApp',
        readyBtn: 'Pronto para Viajar',
        items: {
          tires: 'Calibrar pneus frios (incluindo estepe no carro)',
          oil: 'Conferir nível de óleo em piso plano',
          coolant: 'Olhar reservatório de arrefecimento (motor frio)',
          lights: 'Testar faróis, lanternas, setas e luz de freio',
          chainOrSpare: 'Checar folga/lubrificação da corrente (ou ferramentas/macaco)',
          brakes: 'Confirmar firmeza do pedal/manete de freio e nível DOT4',
          docs: 'Conferir documento do veículo, seguro e triângulo/capacete',
        },
      },
      drivingProfiles: {
        city: 'Urbano / Trânsito',
        highway: 'Rodovia / Estrada',
        mixed: 'Uso Misto',
        severe: 'Severo / Trabalho',
      },
    },
    garageUi: {
      emptyTitle: 'Sua garagem está vazia',
      emptyDesc: 'Cadastre seu primeiro carro ou moto para acompanhar a ficha médica completa, documentos, custos (TCO) e Passaporte Digital com QR Code.',
      emptyBtn: 'Cadastrar Primeiro Veículo',
      bannerTitle: 'Veículos, Documentos & Passaporte Digital',
      bannerDesc: 'Selecione um veículo para abrir a Ficha Médica completa, gerar QR Code ou editar dados.',
      kpi: {
        vehicles: 'Veículos na Garagem',
        weeklyKm: 'Rodagem Semanal',
        tco: 'Custo Total (TCO)',
        costPerKm: 'Custo Médio / km',
        pendingDocs: 'Docs. a Vencer',
      },
      actions: {
        medical: 'Ficha Médica',
        passport: 'Passaporte + QR',
        edit: 'Editar',
        remove: 'Remover',
      },
      fleet: {
        title: 'Frota Empresarial & Multi-Veículos',
        subtitle: 'Controle centralizado por responsável, perfil de uso, custos e status preventivo.',
        gateTitle: 'Painel de Frota Empresarial',
        gateDesc: 'Gerencie múltiplos veículos, motoristas com permissões e relatórios consolidados nos planos Frotas.',
        gateBtn: 'Ver Planos de Frota',
        searchPlaceholder: 'Buscar por placa, marca, modelo ou motorista...',
        filterAll: 'Todos',
        filterCars: 'Carros',
        filterMotos: 'Motos',
        filterPersonal: 'Particulares',
        filterFleet: 'Frota',
        colVehicle: 'Veículo',
        colPlateColor: 'Placa & Cor',
        colDriver: 'Responsável',
        colProfile: 'Perfil de Uso',
        colOdometer: 'Odômetro',
        colStatus: 'Saúde',
        colCosts: 'TCO Acumulado',
        colActions: 'Ações',
        unassigned: 'Sem motorista atribuído',
        noColor: 'Cor não informada',
        statusOk: 'Em dia',
        statusAttention: 'Atenção',
        statusOverdue: 'Atrasado',
        statusPending: 'Sem registro',
        showingCount: 'exibidos',
      },
      specs: {
        colorLabel: 'Cor do veículo',
        notInformed: 'Não informada',
        profileLabel: 'Perfil de Severidade de Uso',
        weeklyAvgLabel: 'Média semanal',
        accumulatedTco: 'TCO acumulado',
        costPerKmLabel: 'Custo por km',
        vinLabel: 'Chassi / VIN / Registro',
        docsNotSet: 'Data não informada',
      },
    },
    evUi: {
      emptyTitle: 'Nenhum veículo cadastrado',
      emptyDesc: 'Cadastre um veículo elétrico, híbrido ou a combustão para planejar recargas, simular viagens e localizar eletropostos no mapa.',
      emptyBtn: 'Cadastrar Veículo',
      sendChargeWaTitle: 'Enviar recarga para WhatsApp cadastrado',
    },
    networkUi: {
      mapSearchTerms: {
        workshop: 'Oficina mecânica',
        ev_charger: 'Posto de recarga elétrico EV',
        tires: 'Borracharia e alinhamento pneus',
        fuel: 'Posto de combustível',
        dealership: 'Concessionária automotiva',
      },
      geoUnsupported: 'Geolocalização não suportada neste navegador.',
      geoDenied: 'Permissão de localização negada ou indisponível.',
      useLocation: 'Usar minha localização',
      locActive: 'Localização ativa',
      addPlace: 'Adicionar Local',
      searchMapsBtn: 'Buscar no Google Maps',
      emptyTitle: 'Nenhum local salvo neste filtro',
      emptyDesc: 'Adicione suas oficinas de confiança ou busque locais próximos diretamente no Google Maps.',
      addModalTitle: 'Adicionar Local de Confiança',
      placeName: 'Nome do estabelecimento',
      placeCategory: 'Categoria',
      placeCity: 'Cidade / Região',
      placeAddress: 'Endereço',
      placePhone: 'Telefone / WhatsApp',
      placeNotes: 'Observações (opcional)',
      savePlace: 'Salvar Local',
      removePlace: 'Remover',
      openMaps: 'Maps',
      kmAway: 'de distância',
    },
    settingsUi: {
      accountTitle: 'Conta & Sincronização na Nuvem',
      accountSubtitle: 'Sincronize garagem, ficha médica, fotos privadas e planos em qualquer dispositivo.',
      connectedBadge: 'Conectado',
      localOnlyBadge: 'Somente local',
      syncGarageBtn: 'Sincronizar Garagem',
      syncingBtn: 'Sincronizando...',
      syncedMsg: 'Dados sincronizados com a nuvem!',
      signOutBtn: 'Sair',
      authOAuthHint: 'Entre com 1 clique usando sua conta:',
      continueWith: 'Continuar com',
      signInTab: 'Entrar',
      signUpTab: 'Criar Conta',
      emailLabel: 'E-mail',
      passwordLabel: 'Senha',
      signInBtn: 'Entrar na Conta',
      signUpBtn: 'Criar Minha Conta',
      authRequiredTitle: 'Conecte sua conta para sincronização segura',
      authSuccessSignIn: 'Login realizado! Carregando seus veículos da nuvem...',
      authSuccessSignUp: 'Conta criada! Verifique seu e-mail se a confirmação estiver ativa.',
      vehiclesTitle: 'Meus Veículos',
      vehiclesPlanUsage: 'Plano:',
      upgradePlanBtn: 'Ver Planos',
      addVehicleBtn: 'Adicionar Veículo',
      activeBadge: 'Ativo',
      selectBtn: 'Selecionar',
      removeBtn: 'Remover',
      whatsappTitle: 'WhatsApp Cadastrado',
      whatsappDesc: 'Receba alertas, fichas técnicas e relatórios em 1 clique.',
      whatsappSavedBadge: 'Configurado',
      whatsappSaveBtn: 'Salvar',
      whatsappSavedMsg: 'WhatsApp salvo com sucesso!',
      whatsappInvalidMsg: 'Número inválido. Inclua DDI + DDD (ex.: +55 11 99999-8888).',
      regionCountryLabel: 'País / Região de Faturamento',
      regionCurrencyLabel: 'Moeda Local',
      regionAutoBtn: 'Automático',
      regionAutoApplied: 'Idioma, país e moeda atualizados automaticamente para sua região.',
      pushTitle: 'Notificações Push em 2º Plano',
      pushDesc: 'Receba lembretes de óleo, pneus e documentação mesmo com o navegador fechado.',
      pushSupported: 'Compatível',
      pushUnsupported: 'Navegador não suporta Push',
      pushEnableBtn: 'Ativar Push em 2º Plano',
      pushDisableBtn: 'Desativar Push',
      pushTestBtn: 'Enviar Push de Teste',
      pushEnabledMsg: 'Push ativado!',
      pushDisabledMsg: 'Notificações Push desativadas.',
      pushVapidActive: 'VAPID persistente ativo',
      remindersSavedHint: 'As preferências são salvas automaticamente localmente e na nuvem.',
    },
    medicalUi: {
      title: 'Ficha Médica Digital do Veículo',
      subtitle: 'Histórico completo de manutenções, revisões, abastecimentos, notas e lembretes inteligentes.',
      addRecordBtn: 'Novo Registro',
      exportPdfBtn: 'Relatório PDF',
      generatingPdf: 'Gerando PDF...',
      summaryRecords: 'Registros',
      summaryTotalInvested: 'Investido',
      summaryPhotos: 'Notas / Fotos',
      radarTitle: 'Radar Inteligente de Vencimentos',
      radarUrgentOnly: 'Pendentes / Urgentes',
      radarAll: 'Todos',
      radarShow: 'Mostrar radar',
      radarHide: 'Ocultar',
      radarAllClear: 'Tudo em dia no radar preventivo!',
      radarCompleteBtn: 'Concluir',
      radarWaiting: 'Aguardando 1º registro',
      radarOverdue: 'Vencido',
      radarDueSoon: 'Vence em breve',
      radarOnTrack: 'Em dia',
      radarNoDate: 'Data não informada',
      radarNoDateHint: 'Registre o comprovante ou vencimento para ativar alertas',
      radarDueIn: 'Vence em',
      radarOverdueByDays: 'atrasado',
      radarOverdueByKm: 'excedidos',
      radarSuggestedCycle: 'Ciclo sugerido:',
      radarImmediate: 'Revisão imediata recomendada',
      dossierTitle: 'Enviar Ficha Médica & Relatório',
      dossierDesc: 'Compartilhe o dossiê completo com fotos, custos e histórico para oficinas, seguradoras ou compradores.',
      dossierWhatsappBtn: 'Enviar no WhatsApp',
      dossierEmailBtn: 'Enviar por E-mail',
      dossierCopyBtn: 'Copiar Resumo',
      dossierCopied: 'Copiado!',
      timelineSearchPlaceholder: 'Buscar serviço, oficina, nota ou data...',
      filterAll: 'Tudo',
      filterMaintenance: 'Manutenção',
      filterFuel: 'Combustível',
      filterEv: 'Recarga EV',
      filterExpense: 'Gastos / Docs',
      noTimelineEntries: 'Nenhum registro encontrado neste filtro.',
      workshopLabel: 'Oficina / Local:',
      photoCameraBtn: 'Foto da Nota',
      photoCameraTitle: 'Tirar foto da nota',
      photoGalleryTitle: 'Escolher nota da galeria',
      viewBtn: 'Ver',
      downloadBtn: 'Baixar',
      deleteAttAria: 'Apagar nota',
      modalCreateTitle: 'Novo Registro na Ficha Médica',
      modalCompleteReminderTitle: 'Concluir Lembrete e Registrar na Ficha',
      modalAutoCycleNote: 'Atualiza automaticamente o próximo ciclo',
      kindMaintenance: 'Manutenção',
      kindRevision: 'Revisão',
      kindFuel: 'Abastec.',
      kindEvCharge: 'Recarga EV',
      kindExpense: 'Gasto',
      categoryLabel: 'Sistema / Categoria',
      dateLabel: 'Data',
      kmLabel: 'Km',
      energyKwhLabel: 'Energia (kWh)',
      powerTypeLabel: 'Tipo',
      socStartLabel: 'Bateria Início %',
      socEndLabel: 'Bateria Fim %',
      whatWasDoneLabel: 'O que foi feito',
      placeholderFuel: 'Descrição do abastecimento',
      placeholderRevision: 'Descrição da revisão',
      placeholderExpense: 'Descrição do gasto ou seguro',
      placeholderMaint: 'Descrição da manutenção realizada',
      placeLabelStation: 'Posto',
      placeLabelCharger: 'Estação / Eletroposto',
      placeLabelWorkshop: 'Oficina / Estabelecimento',
      placePhStation: 'Nome do posto',
      placePhCharger: 'Nome da estação de recarga',
      placePhWorkshop: 'Nome da oficina ou próprio',
      amountLabel: 'Valor',
      notesLabel: 'Observações',
      notesPlaceholder: 'Peças trocadas, garantia, detalhes...',
      attachSectionTitle: 'Foto da nota, recibo, seguro ou documento (JPG ≤ 2 MB, privado)',
      takePhotoBtn: 'Tirar Foto',
      galleryBtn: 'Galeria',
      saveRecordBtn: 'Salvar Registro',
      attachmentCategories: {
        receipt: 'Nota da Oficina / Recibo',
        insurance: 'Seguro',
        document: 'Documento / Licenciamento',
        vehicle_photo: 'Foto do Veículo',
        inspection: 'Vistoria / Peça',
        diagnostic: 'Laudo / Scanner',
      },
      monthNames: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
      ],
      otherRecordsHeading: 'Outros registros',
    },
    finalReportUi: {
      headerBadge: 'Relatório Final & Dossiê Completo',
      headerSubtitle: 'Linha cronológica consolidada, fotos anexadas, quadro preventivo e exportação PDF.',
      sortOldest: 'Mais antigos',
      sortNewest: 'Mais recentes',
      downloadPdfBtn: 'Baixar PDF Completo',
      sendWaPdfBtn: 'Enviar no WhatsApp',
      sendEmailBtn: 'Enviar por E-mail',
      printBtn: 'Imprimir',
      kpiEvents: 'Eventos',
      kpiMaintenances: 'Manutenções',
      kpiPhotosDocs: 'Fotos & Docs',
      kpiTotalInvested: 'Investimento Total',
      quickSendWaLabel: 'WhatsApp destino',
      quickSendEmailLabel: 'E-mail destino',
      timelineTitle: 'Linha do Tempo Completa',
      timelineEmpty: 'Nenhum registro na linha do tempo para este filtro.',
      galleryTitle: 'Galeria Privada de Notas & Fotos',
      galleryEmpty: 'Nenhuma foto ou documento anexado ainda.',
      galleryConnectHint: 'Entre na sua conta em Configurações para enviar fotos privadas.',
      uploadCategoryLabel: 'Tipo do anexo',
      uploadNotesPlaceholder: 'Descrição opcional (ex.: Nota troca de óleo)',
      snapshotTitle: 'Quadro Preventivo no Momento da Emissão',
      snapshotColItem: 'Item',
      snapshotColStatus: 'Status',
      snapshotColLast: 'Último registro',
      snapshotColNext: 'Próxima previsão',
      openBtn: 'Abrir',
      downloadBtn: 'Baixar',
      deleteAria: 'Excluir anexo',
      pdfGeneratedMsg: 'PDF gerado com',
      pdfSharedMsg: 'PDF compartilhado com',
      pdfErrorMsg: 'Não foi possível gerar o PDF completo.',
      photoSavedMsg: 'Anexo salvo no relatório.',
    },
    passportUi: {
      badge: 'AutoLife World · Passaporte Digital do Veículo',
      plateLabel: 'Placa:',
      kpiOnTrack: 'Itens em dia',
      kpiVerifiedLogs: 'Registros verificados',
      kpiInvestment: 'Investimento',
      kpiIssuedAt: 'Emissão',
      qrPublicLabel: 'QR Consulta Pública',
      qrAuthTitle: 'Compartilhamento Autorizado por QR Code',
      linkActiveRevoke: 'Link Ativo (Revogar)',
      linkRevokedReactivate: 'Link Revogado (Reativar)',
      includeExpenses: 'Exibir valores de despesas',
      includeDocuments: 'Exibir lista de documentos',
      copyBtn: 'Copiar',
      copiedBtn: 'Copiado',
      signInHint: 'Entre na sua conta em Configurações para ativar o link público verificável com revogação instantânea.',
      updatingPassport: 'Atualizando Passaporte verificável...',
      odometerTitle: 'Histórico Imutável de Quilometragem',
      historyTitle: 'Histórico Cronológico de Manutenção',
      emptyHistory: 'Nenhum registro histórico lançado ainda.',
      sendWaBtn: 'Enviar Passaporte no WhatsApp',
      printPdfBtn: 'Imprimir / Salvar PDF',
      publicBadge: 'AutoLife World · Consulta Verificada',
      openAppBtn: 'Abrir Aplicativo',
      verifying: 'Verificando Passaporte Digital do Veículo...',
      unavailableTitle: 'Passaporte Indisponível',
      unavailableDesc: 'Este link não existe, expirou ou foi revogado pelo proprietário.',
      authenticatedBadge: 'Passaporte Digital Autenticado',
      currentOdometer: 'Odômetro atual:',
      preventiveHealth: 'Saúde Preventiva',
      onTrackSuffix: 'em dia',
      odometerMarksTitle: 'Registros de Odômetro',
      marksSuffix: 'marcos',
      updatedAt: 'Atualizado em',
      maintHistoryTitle: 'Histórico de Manutenções',
      noPublicServices: 'Nenhum serviço público registrado.',
      verifiedDocsTitle: 'Documentos Comprovados',
    },
    vaultUi: {
      title: 'Fotos da Nota, Recibos & Documentos (Privado)',
      subtitlePrefix: 'Nota da oficina, recibo, seguro e documento de',
      subtitleSuffix: '· Imagens comprimidas em JPG até 2 MB com acesso privado.',
      connectAccountBtn: 'Conectar Conta',
      unavailable: 'Cofre privado indisponível no momento.',
      signInPromptPrefix: 'Entre com sua conta (Google, Apple, Facebook ou e-mail) em',
      signInPromptBtn: 'Configurações → Conta & Nuvem',
      signInPromptSuffix: 'para tirar foto da nota da oficina, recibo, seguro ou documento com acesso privado.',
      typeLabel: 'Tipo da nota / documento',
      dateLabel: 'Data',
      notesLabel: 'Observação (opcional)',
      notesPlaceholder: 'Detalhes da nota ou documento',
      takePhotoBtn: 'Tirar Foto',
      galleryBtn: 'Galeria',
      loading: 'Carregando arquivos privados...',
      empty: 'Nenhuma nota ou documento salvo ainda. Fotos são comprimidas automaticamente em JPG até 2 MB.',
      expiredLink: 'Link expirado',
      viewBtn: 'Ver',
      downloadBtn: 'Baixar',
      sendWaTitle: 'Enviar documento/nota no WhatsApp cadastrado',
      deleteAria: 'Excluir arquivo',
      uploadSuccess: 'salvo com acesso privado.',
      uploadError: 'Falha ao enviar arquivo.',
      loadError: 'Não foi possível carregar os arquivos privados no momento.',
    },
    plansUi: {
      subtitle: 'Preços regionais configurados por país e moeda local',
      sourceDb: 'catálogo sincronizado com banco de dados',
      sourceFallback: 'tabela regional oficial',
      monthly: 'Mensal',
      annualDiscount: 'Anual (-20%)',
      currentHeader: 'Assinatura & Limite Atual',
      vehicleUnit: 'veículo(s)',
      neverDeletedNote: 'Seus veículos e históricos nunca são excluídos caso a assinatura vença ou seja cancelada.',
      dueLabel: 'Vencimento:',
      autoRenewLabel: 'Renovação automática:',
      on: 'Ativa',
      off: 'Desativada',
      cancelSubBtn: 'Cancelar assinatura',
      graceWarningPrefix: 'Assinatura em período de tolerância até',
      graceWarningSuffix: 'Regularize o pagamento para manter novos cadastros liberados.',
      paymentHistoryTitle: 'Histórico de Pagamentos',
      currentPlanBadge: 'Plano atual',
      activeBadge: 'Ativo',
      perMonth: '/ mês',
      estFee: 'Taxa est.',
      upToVehicles: 'Até',
      over100Vehicles: 'Acima de 100 veículos',
      fromPrice: 'A partir de',
      renewSwitchCurrency: 'Renovar / Trocar Moeda',
      subscribePersonal: 'Assinar Plano Particular',
      contactB2b: 'Falar com Consultor B2B',
      manageRenew: 'Gerenciar / Renovar',
      subscribePlan: 'Contratar',
      checkoutPixTitle: 'Pagamento Instantâneo via Pix',
      checkoutIntlTitle: 'Pagamento Seguro Internacional',
      scanPixPrompt: 'Escaneie o QR Code no app do seu banco',
      pixCopyPasteLabel: 'Pix Copia e Cola',
      changeMethodBtn: 'Trocar forma de pagamento',
      doneBtn: 'Concluir',
      verifyPixBtn: 'Verificar Pagamento Pix',
      pixConfirmedMsg: 'Pagamento Pix confirmado! Sua assinatura foi ativada.',
      pixPendingMsg: 'Pagamento Pix ainda aguardando compensação. Conclua no app do seu banco e tente Verificar novamente.',
      localCurrencyLabel: 'Moeda local',
      billingCycleLabel: 'Ciclo de faturamento',
      monthlyLabel: 'Mensal',
      annualLabel: 'Anual (-20%)',
      paymentMethodsLabel: 'Meios de pagamento',
      receiptEmailLabel: 'E-mail para comprovante (opcional)',
      subtotalLabel: 'Subtotal do plano',
      regionalTaxesFallback: 'Impostos regionais',
      processingFeeLabel: 'Taxa de processamento',
      finalTotalLabel: 'Total final',
      generatePixBtn: 'Gerar QR Code Pix',
      payWithCardBtn: 'Pagar com Cartão',
      statusLabels: {
        active: 'Ativa',
        trialing: 'Em avaliação',
        past_due: 'Pagamento em atraso',
        grace_period: 'Período de tolerância (7 dias)',
        canceled: 'Cancelada',
        expired: 'Expirada (somente leitura para novos cadastros)',
      },
    },
    analyticsUi: {
      title: 'Analytics da Frota · Custos & Recargas',
      subtitle: 'Comparativo de carros e motos: manutenção preventiva, recargas e TCO em',
      scopeAll: 'Todos',
      scopeCars: 'Carros',
      scopeMotos: 'Motos',
      scopeActive: 'Ativo',
      kpiMaintenance: 'Total em Manutenção (Frota)',
      kpiCharging: 'Total em Recargas EV',
      kpiEnergy: 'Energia Acumulada',
      chartVehicleTitle: 'Custo Total por Veículo',
      chartTrendTitle: 'Tendência Cronológica: Custos & Energia (kWh)',
      emptyTrend: 'Sem registros de manutenção ou recarga para este filtro.',
      legendMaintenance: 'Manutenção',
      legendCharging: 'Recarga EV',
      legendChargingCost: 'Custo Recarga',
      legendEnergy: 'Energia (kWh)',
    },
    carbonUi: {
      title: 'Pegada de Carbono Mensal & Redução EV',
      subtitle: 'Cálculo de CO₂e baseado no histórico de odômetro, rodagem mensal e propulsão (combustão, híbrido e elétrico)',
      gridBrazil: 'Matriz Renovável (95 gCO₂/kWh)',
      gridGlobal: 'Média Global (280 gCO₂/kWh)',
      kpiMonthlyCo2: 'Pegada Mensal Atual',
      kpiEstMonthDist: '/mês estimados',
      kpiAvoidedCo2: 'CO₂ Evitado (Elétricos / Híbridos)',
      kpiAvoided6m: 'kg evitados em 6 meses',
      kpiReduction: 'Redução de Impacto vs Combustão',
      kpiTreesYear: 'árvores/ano equivalentes',
      kpiIntensity: 'Intensidade Média da Frota',
      kpiEvTarget: 'Meta referência EV: < 25 g/km',
      chartEvolutionTitle: 'Evolução Mensal: Emissão Real vs CO₂ Evitado (kg CO₂)',
      chartPerVehicleTitle: 'Pegada Mensal vs Economia EV por Veículo (kg CO₂/mês)',
      tooltipReal: 'Emissão Real:',
      tooltipAvoided: 'CO₂ Evitado (EV/Híbrido):',
      tooltipBaseline: 'Cenário 100% Combustão:',
      tooltipMonthlyDist: 'Rodagem mensal:',
      legendReal: 'Emissão Real (kg)',
      legendAvoided: 'Redução EV / Híbrido (kg)',
      legendBaseline: 'Linha Base 100% Combustão',
      legendActualVehicle: 'Emissão Atual (kg)',
      legendSavingsVehicle: 'Economia EV/Híbrido (kg)',
      simPrefix: 'Simulação de Eletrificação:',
      simMiddle: 'Substituir',
      simMiddle2: 'por um modelo 100% elétrico reduziria mais',
      simTrees: 'árvores/ano equivalentes',
      simAllEvTitle: 'Frota 100% Elétrica neste filtro:',
      simAllEvSuffix: 'nas emissões de carbono em relação a equivalentes a gasolina.',
      powertrainLabels: {
        electric: 'Elétrico',
        hybrid: 'Híbrido',
        diesel: 'Diesel',
        combustion: 'Combustão',
      },
    },
    teamUi: {
      disconnectedTitle: 'Empresa & Equipe de Motoristas',
      disconnectedDesc: 'Conecte-se à sua conta na nuvem para cadastrar sua empresa, convidar funcionários com permissões granulares e isolar os veículos da organização.',
      connectBtn: 'Conectar Conta Empresarial',
      title: 'Estrutura Empresarial & Responsáveis da Frota',
      isolatedNote: 'Dados isolados por empresa (nenhuma organização acessa veículos ou documentos de outra).',
      teamCountLabel: 'Equipe:',
      companyNameLabel: 'Razão Social / Nome da Empresa',
      companyPlaceholder: 'Ex.: Transportes Silva Ltda',
      taxIdLabel: 'NIF / CNPJ / VAT / EIN',
      taxIdPlaceholder: 'Documento fiscal',
      saveBtn: 'Salvar',
      savedBtn: '✓ Salvo',
      inviteTitle: 'Convidar Funcionário / Responsável',
      namePlaceholder: 'Nome completo',
      emailPlaceholder: 'funcionario@empresa.com',
      inviteBtn: 'Convidar Funcionário',
      statusActive: 'Ativo',
      statusPending: 'Convite pendente',
      statusRevoked: 'Revogado',
      reactivateBtn: 'Reativar',
      suspendBtn: 'Suspender',
      removeMemberAria: 'Remover funcionário',
      limitReachedMsg: 'Limite de responsáveis atingido no plano atual. Faça upgrade da frota para adicionar mais usuários.',
      inviteSuccessMsg: 'Convite registrado com permissões personalizadas.',
      roles: {
        admin: 'Administrador',
        fleet_manager: 'Gestor de Frota',
        driver: 'Motorista / Responsável',
        viewer: 'Auditor / Leitura',
      },
      permissions: {
        canViewVehicles: 'Ver veículos',
        canEditVehicles: 'Editar frota',
        canLogMaintenance: 'Lançar manutenção',
        canViewExpenses: 'Ver despesas',
        canManageTeam: 'Gerir equipe',
      },
    },
    adminUi: {
      title: 'Painel Admin — Liberação de Planos',
      subtitlePrefix: 'Acesso exclusivo para',
      subtitleSuffix: 'Libere planos VIP, frotas ou cortesias em 1 clique.',
      refreshBtn: 'Atualizar contas',
      sqlSetupTitle: 'Ativação única no SQL Editor do Supabase',
      sqlSetupDesc: 'Cole este SQL uma única vez no SQL Editor do Supabase e clique em Run para habilitar a listagem e liberação por aqui.',
      copySqlBtn: 'Copiar SQL único',
      copiedSqlBtn: 'SQL copiado',
      grantTitle: 'Liberar ou Alterar Plano por E-mail',
      emailLabel: 'E-mail da conta',
      planLabel: 'Plano a liberar',
      durationLabel: 'Validade',
      grantHint: 'A pessoa precisa já ter entrado no app pelo menos uma vez para aparecer abaixo.',
      grantBtn: 'Liberar Plano Agora',
      accountsTitle: 'Contas Cadastradas',
      searchPlaceholder: 'Buscar por e-mail ou nome...',
      loading: 'Carregando contas...',
      emptyNeedSql: 'Execute o SQL acima no Supabase e clique em Atualizar contas.',
      emptyNoMatch: 'Nenhuma conta encontrada.',
      noExpiry: 'Sem vencimento',
      selectBtn: 'Selecionar',
      grantEnterpriseBtn: 'Liberar Enterprise (1 ano)',
      planLabelPrefix: 'Plano:',
      statusLabelPrefix: 'Status:',
      vehiclesLabel: 'veículo(s)',
      expiryLabelPrefix: 'Validade:',
    },
    pdfUi: {
      headerSubtitle: 'Relatório Final Completo do Veículo',
      footerRight: 'Documento gerado em',
      pageLabel: 'Página',
      ofLabel: 'de',
      vehicleLabel: 'Veículo',
      plateLabel: 'Placa / Matrícula',
      yearLabel: 'Ano',
      odometerLabel: 'Odômetro',
      powertrainLabel: 'Motorização',
      colorLabel: 'Cor',
      ownerLabel: 'Proprietário / Conta',
      issuedLabel: 'Emissão',
      docExpiryLabel: 'Documento / ITV',
      insExpiryLabel: 'Seguro',
      notInformed: 'Não informado',
      summaryEvents: 'Total de Eventos',
      summaryMaintenances: 'Manutenções',
      summaryPhotos: 'Fotos / Notas',
      summaryTotal: 'Investido Total',
      timelineTitle: 'Linha do Tempo Completa (Serviços, Recargas & Notas)',
      emptyTimeline: 'Nenhum registro histórico lançado ainda para este veículo.',
      colDate: 'Data',
      colCategory: 'Tipo',
      colTitle: 'Descrição',
      colKm: 'Odômetro',
      colWorkshop: 'Local',
      colCost: 'Valor',
      preventiveTitle: 'Quadro Preventivo Atual',
      colItem: 'Item',
      colStatus: 'Status',
      colLastRecord: 'Último Registro',
      colNextDue: 'Próxima Previsão',
      photosSectionTitle: 'Notas, Recibos & Documentos Incorporados',
      filenamePrefix: 'Relatorio-AutoLife',
      timelineBadges: {
        evCharge: 'Recarga EV',
        photoPrefix: 'Anexo:',
      },
    },
  },
  en: {
    localeTag: 'en-US',
    header: { addShort: 'New' },
    sidebar: {
      noVehicles: 'No vehicles registered',
      add: 'Add',
      remove: 'Remove',
      removeTitle: 'Remove vehicle and all history',
    },
    pwa: {
      offlineBadge: 'Offline Mode — Local data active',
      installBtn: 'Install App (PWA)',
      installTitle: 'Install AutoLife World on your device',
      installedOk: 'App Installed',
      iosTitle: 'Install on iPhone',
      iosDesc: 'In Safari, tap the Share icon and select "Add to Home Screen".',
      iosStep1: '1. Tap the Share button on Safari’s bottom toolbar.',
      iosStep2: '2. Scroll down and select "Add to Home Screen".',
      iosStep3: '3. Confirm by tapping "Add" in the top-right corner.',
      gotIt: 'Got it',
    },
    app: {
      mapsQuotaMsg: 'Temporary demo quota reached for Google Maps.',
      mapsQuotaLink: 'Learn how to use your own free-tier API key',
      closeNotice: 'Dismiss notice',
      waBannerTitle: 'Complete your quick profile (Email + WhatsApp)',
      waBannerDescPrefix: 'Linked email:',
      waBannerDefaultAccount: 'Connected account',
      waBannerDescSuffix: 'Save your WhatsApp once to send reports, receipts, and reminders in 1 tap.',
      waSaveBtn: 'Save WhatsApp',
      waLaterBtn: 'Not now',
      waInvalidError: 'Enter a valid phone number with country code (e.g., +1 555 234 5678).',
      waPlaceholder: 'e.g. +1 555 234 5678',
    },
    whatsapp: {
      buttonLabel: 'WhatsApp',
      buttonDefaultTitle: 'Send to linked WhatsApp',
      invalidError: 'Enter a valid WhatsApp number with country code (e.g. +1 555 234 5678).',
      connectTitle: 'Connect WhatsApp',
      connectDesc: 'Save your phone number once to send any service log, receipt, or reminder directly to WhatsApp.',
      inputLabel: 'WhatsApp number (with country code)',
      inputPlaceholder: 'e.g. +1 555 234 5678',
      cancel: 'Cancel',
      saveOnly: 'Save WhatsApp',
      saveAndOpen: 'Save & Open WhatsApp',
      close: 'Close',
    },
    vehicleColors: {
      labels: {
        white: 'White',
        black: 'Black',
        silver: 'Silver',
        gray: 'Gray',
        red: 'Red',
        blue: 'Blue',
        green: 'Green',
        yellow: 'Yellow',
        brown: 'Brown',
        orange: 'Orange',
      },
      categoryLabels: {
        electric: 'Electric / Hybrid',
        motoTrail: 'Adventure / Touring Moto',
        moto: 'Motorcycle',
        suv: 'SUV / Utility',
        sedan: 'Automobile',
      },
    },
    modals: {
      addTitle: 'Add Vehicle',
      editTitle: 'Edit Vehicle',
      close: 'Close',
      cancel: 'Cancel',
      saveVehicle: 'Register Vehicle',
      saveChanges: 'Save Changes',
      saveLog: 'Save Record',
      scanBannerTitle: 'Auto-fill from document photo (Optional)',
      scanBannerDesc: 'Upload your vehicle registration, title, or logbook from any country to automatically fill make, model, year, plate, and color.',
      scanCameraBtn: 'Use Camera',
      scanFileBtn: 'Upload Photo / PDF',
      scanning: 'Reading document with AI...',
      scanSuccess: 'Details extracted! Review fields before saving.',
      scanInvalidFile: 'Please select a photo (JPG/PNG/WEBP) or PDF file.',
      scanFailed: 'Could not read document automatically. Please fill the fields manually.',
      planLimitReached: 'Plan vehicle limit reached',
      planLimitExpiredPrefix: 'Your subscription has expired. Existing vehicles remain intact, but new additions are locked.',
      planLimitActivePrefix: 'Your current plan allows up to',
      planLimitUpgradeBtn: 'View Plans & Upgrade',
      vehicleKindLabel: 'Vehicle type',
      vehicleKindCar: 'Car / SUV / Van',
      vehicleKindMoto: 'Motorcycle',
      brandLabel: 'Make',
      brandPlaceholderCar: 'e.g. Toyota, Ford, Tesla',
      brandPlaceholderMoto: 'e.g. Honda, Yamaha, BMW',
      modelLabel: 'Model',
      modelPlaceholderCar: 'e.g. RAV4, Model 3',
      modelPlaceholderMoto: 'e.g. CB 500X, MT-07',
      yearLabel: 'Year',
      plateLabel: 'License Plate',
      colorLabel: 'Vehicle color',
      colorSelectedNone: 'Not selected',
      colorCustomPlaceholder: 'Or type a custom color (e.g. Midnight Blue)',
      powertrainLabel: 'Powertrain',
      displacementLabel: 'Engine (cc)',
      odometerLabel: 'Current odometer',
      frontPsiLabel: 'Front PSI',
      rearPsiLabel: 'Rear PSI',
      singlePsiLabel: 'Tire Pressure (PSI)',
      weeklyKmLabel: 'Weekly distance',
      fleetGroupLabel: 'Category',
      personalGroup: 'Personal Use',
      fleetGroup: 'Fleet / Business',
      licenseDateLabel: 'Registration / Inspection Due',
      insuranceDateLabel: 'Insurance Renewal',
      vinLabel: 'VIN / Chassis No. (optional)',
      attachDocLabel: 'Save document photo to Private Vault (optional)',
      attachCamera: 'Camera',
      attachFile: 'File',
      deleteTitle: 'Remove vehicle and history?',
      deleteConfirmBtn: 'Delete Permanently',
      deleteDescPrefix: 'This permanently deletes this vehicle and all linked records:',
      deleteLogsLabel: 'medical record entry(ies)',
      deleteChargesLabel: 'EV charging session(s)',
      deleteItemsLabel: 'tracked maintenance items',
      deleteDocsLabel: 'document(s) in private vault',
      deletePermanentNote: 'This also removes synced records from your cloud account.',
      logVehicleLabel: 'Active vehicle',
      logItemLabel: 'Component / Service',
      logDateLabel: 'Completion date',
      logCostLabel: 'Cost paid',
      logSelfCheck: 'Self Inspection',
    },
    healthUi: {
      emptyTitle: 'No vehicles registered',
      emptyDesc: 'Add your car or motorcycle to unlock Vehicle Health, smart preventive reminders, and the complete service dossier.',
      emptyBtn: 'Register My Vehicle',
      statusBadge: {
        pending: 'Awaiting records',
        excellent: 'Excellent',
        good: 'Good',
        attention: 'Attention',
        critical: 'Critical',
      },
      tabs: {
        checklist: 'Checklist & Reminders',
        guides: 'Illustrated Guides',
        finalReport: 'Final Report',
      },
      actions: {
        preTrip: 'Pre-Trip 60s',
        odometer: 'Odometer',
        tirePsi: 'Tire PSI',
        saveOdometer: 'Update',
        clearFilters: 'Clear filters',
        registerNow: 'Log now',
        schedule: 'Calendar',
        details: 'Details',
      },
      hero: {
        title: 'Health & Maintenance',
        recordedOf: 'items logged out of',
        summaryPending: 'Log your first service items to activate preventive alerts for',
        summaryOverdue: 'Overdue maintenance items detected for',
        summaryAttention: 'Some items are due soon for',
        summaryHealthy: 'Everything is on track for',
        nextOilLabel: 'Oil change',
        nextRevisionLabel: 'Next service',
        dueToday: 'Today',
        overdueBy: 'overdue',
        remaining: 'remaining',
      },
      starter: {
        title: 'Start preventive tracking',
        desc: 'Log your latest oil change or inspection so AutoLife automatically projects upcoming dates and mileage deadlines.',
        cta: 'Log 1st Service',
      },
      nextSteps: {
        title: 'Priority Next Steps',
        subtitle: 'Items requiring your attention first:',
        allGood: 'No urgent tasks at the moment.',
      },
      groups: {
        safety: 'Safety Systems',
        engine: 'Engine & Drivetrain',
        docs: 'Documents & Deadlines',
      },
      card: {
        cycleDetails: 'Details',
        cycleUsage: 'Cycle usage',
        everyDaysOrKm: 'Every',
        safetyNote: 'Safety warning',
        intervalLabel: 'Cycle:',
        dueLabel: 'Due:',
        sendWhatsappTitle: 'Send reminder via WhatsApp',
        addCalendarTitle: 'Download reminder (.ics)',
        askMechanicTitle: 'Ask AI Mechanic',
      },
      guides: {
        scopeAll: 'All',
        scopeCar: 'Car',
        scopeMoto: 'Motorcycle',
        emptyFilter: 'No guides match this filter.',
        tipPrefix: 'Safety rule:',
      },
      preTrip: {
        title: '60-Second Pre-Trip Check',
        subtitle: 'Quick visual safety inspection before hitting the highway.',
        distanceLabel: 'Trip distance',
        loadLabel: 'Passengers / Load',
        soloOption: 'Rider only',
        heavyMotoOption: 'Passenger / Top box (+3 PSI rear)',
        normalCarOption: 'Normal load',
        heavyCarOption: 'Full load / luggage (+3 PSI)',
        verifiedOf: 'checked',
        sendWa: 'Send via WhatsApp',
        readyBtn: 'Ready to Drive',
        items: {
          tires: 'Check cold tire pressure (including spare tire)',
          oil: 'Verify engine oil level on flat ground',
          coolant: 'Inspect coolant tank externally (cold engine)',
          lights: 'Test headlights, brake lights, and turn signals',
          chainOrSpare: 'Inspect motorcycle chain slack/lube (or jack & spare tools)',
          brakes: 'Confirm brake pedal/lever firmness and fluid level',
          docs: 'Verify registration, insurance, and safety kit/helmet',
        },
      },
      drivingProfiles: {
        city: 'City / Traffic',
        highway: 'Highway',
        mixed: 'Mixed Use',
        severe: 'Severe / Commercial',
      },
    },
    garageUi: {
      emptyTitle: 'Your garage is empty',
      emptyDesc: 'Add your first car or motorcycle to manage its digital medical record, documents, total cost of ownership (TCO), and QR Passport.',
      emptyBtn: 'Add First Vehicle',
      bannerTitle: 'Vehicles, Documents & Digital Passport',
      bannerDesc: 'Select a vehicle to open its full Medical Record, generate a QR Passport, or edit specs.',
      kpi: {
        vehicles: 'Garage Vehicles',
        weeklyKm: 'Weekly Distance',
        tco: 'Total Cost (TCO)',
        costPerKm: 'Avg Cost / Dist',
        pendingDocs: 'Expiring Docs',
      },
      actions: {
        medical: 'Medical Record',
        passport: 'Passport + QR',
        edit: 'Edit',
        remove: 'Remove',
      },
      fleet: {
        title: 'Business Fleet & Multi-Vehicle',
        subtitle: 'Centralized view by driver, driving profile, TCO costs, and preventive status.',
        gateTitle: 'Business Fleet Dashboard',
        gateDesc: 'Manage multiple vehicles, driver permissions, and consolidated analytics with Fleet plans.',
        gateBtn: 'View Fleet Plans',
        searchPlaceholder: 'Search by plate, make, model, or driver...',
        filterAll: 'All',
        filterCars: 'Cars',
        filterMotos: 'Motorcycles',
        filterPersonal: 'Personal',
        filterFleet: 'Fleet',
        colVehicle: 'Vehicle',
        colPlateColor: 'Plate & Color',
        colDriver: 'Assigned Driver',
        colProfile: 'Usage Profile',
        colOdometer: 'Odometer',
        colStatus: 'Health',
        colCosts: 'Total TCO',
        colActions: 'Actions',
        unassigned: 'Unassigned',
        noColor: 'Color not set',
        statusOk: 'On track',
        statusAttention: 'Attention',
        statusOverdue: 'Overdue',
        statusPending: 'No records',
        showingCount: 'shown',
      },
      specs: {
        colorLabel: 'Vehicle color',
        notInformed: 'Not specified',
        profileLabel: 'Usage Severity Profile',
        weeklyAvgLabel: 'Weekly avg',
        accumulatedTco: 'Accumulated TCO',
        costPerKmLabel: 'Cost per unit',
        vinLabel: 'VIN / Registration ID',
        docsNotSet: 'Date not set',
      },
    },
    evUi: {
      emptyTitle: 'No vehicles registered',
      emptyDesc: 'Add an electric, hybrid, or combustion vehicle to plan charging trips and locate chargers live on the map.',
      emptyBtn: 'Add Vehicle',
      sendChargeWaTitle: 'Send charging session to WhatsApp',
    },
    networkUi: {
      mapSearchTerms: {
        workshop: 'Auto repair shop mechanic',
        ev_charger: 'EV charging station',
        tires: 'Tire shop wheel alignment',
        fuel: 'Gas fuel station',
        dealership: 'Car dealership service center',
      },
      geoUnsupported: 'Geolocation is not supported in this browser.',
      geoDenied: 'Location permission denied or unavailable.',
      useLocation: 'Use my location',
      locActive: 'Location active',
      addPlace: 'Add Place',
      searchMapsBtn: 'Search on Google Maps',
      emptyTitle: 'No saved places in this filter',
      emptyDesc: 'Save your trusted workshops or search nearby locations directly on Google Maps.',
      addModalTitle: 'Add Trusted Location',
      placeName: 'Place name',
      placeCategory: 'Category',
      placeCity: 'City / Region',
      placeAddress: 'Address',
      placePhone: 'Phone / WhatsApp',
      placeNotes: 'Notes (optional)',
      savePlace: 'Save Place',
      removePlace: 'Remove',
      openMaps: 'Maps',
      kmAway: 'away',
    },
    settingsUi: {
      accountTitle: 'Account & Cloud Sync',
      accountSubtitle: 'Sync your garage, service history, private documents, and plans across any device.',
      connectedBadge: 'Connected',
      localOnlyBadge: 'Local only',
      syncGarageBtn: 'Sync Garage',
      syncingBtn: 'Syncing...',
      syncedMsg: 'Cloud data synced successfully!',
      signOutBtn: 'Sign Out',
      authOAuthHint: 'Sign in with 1 click:',
      continueWith: 'Continue with',
      signInTab: 'Sign In',
      signUpTab: 'Create Account',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      signInBtn: 'Sign In',
      signUpBtn: 'Create Account',
      authRequiredTitle: 'Connect your account for secure cloud sync',
      authSuccessSignIn: 'Signed in! Loading your vehicles from cloud...',
      authSuccessSignUp: 'Account created! Check your email if verification is enabled.',
      vehiclesTitle: 'My Vehicles',
      vehiclesPlanUsage: 'Plan:',
      upgradePlanBtn: 'View Plans',
      addVehicleBtn: 'Add Vehicle',
      activeBadge: 'Active',
      selectBtn: 'Select',
      removeBtn: 'Remove',
      whatsappTitle: 'Linked WhatsApp',
      whatsappDesc: 'Send specs, service alerts, and PDFs in one click.',
      whatsappSavedBadge: 'Configured',
      whatsappSaveBtn: 'Save',
      whatsappSavedMsg: 'WhatsApp saved!',
      whatsappInvalidMsg: 'Invalid number. Include country code (e.g. +1 555 234 5678).',
      regionCountryLabel: 'Billing Country / Region',
      regionCurrencyLabel: 'Local Currency',
      regionAutoBtn: 'Automatic',
      regionAutoApplied: 'Language, country, and currency synced to your current region.',
      pushTitle: 'Background Push Notifications',
      pushDesc: 'Receive oil, tire, and registration reminders even when the browser is closed.',
      pushSupported: 'Supported',
      pushUnsupported: 'Browser does not support Push',
      pushEnableBtn: 'Enable Background Push',
      pushDisableBtn: 'Disable Push',
      pushTestBtn: 'Send Test Push',
      pushEnabledMsg: 'Push enabled!',
      pushDisabledMsg: 'Push notifications disabled.',
      pushVapidActive: 'Persistent VAPID active',
      remindersSavedHint: 'Preferences are saved automatically locally and in the cloud.',
    },
    medicalUi: {
      title: 'Digital Vehicle Medical Record',
      subtitle: 'Complete timeline of maintenance, inspections, fuel, receipts, and smart reminders.',
      addRecordBtn: 'New Record',
      exportPdfBtn: 'PDF Report',
      generatingPdf: 'Generating PDF...',
      summaryRecords: 'Records',
      summaryTotalInvested: 'Invested',
      summaryPhotos: 'Receipts / Photos',
      radarTitle: 'Smart Due-Date Radar',
      radarUrgentOnly: 'Pending / Urgent',
      radarAll: 'All',
      radarShow: 'Show radar',
      radarHide: 'Hide',
      radarAllClear: 'All preventive items are on track!',
      radarCompleteBtn: 'Complete',
      radarWaiting: 'Awaiting 1st log',
      radarOverdue: 'Overdue',
      radarDueSoon: 'Due soon',
      radarOnTrack: 'On track',
      radarNoDate: 'No date set',
      radarNoDateHint: 'Record expiry date to activate alerts',
      radarDueIn: 'Due in',
      radarOverdueByDays: 'overdue',
      radarOverdueByKm: 'over limit',
      radarSuggestedCycle: 'Suggested cycle:',
      radarImmediate: 'Immediate inspection recommended',
      dossierTitle: 'Share Medical Record & Report',
      dossierDesc: 'Send the full dossier with photos, costs, and timeline to workshops, insurers, or buyers.',
      dossierWhatsappBtn: 'Send on WhatsApp',
      dossierEmailBtn: 'Send by Email',
      dossierCopyBtn: 'Copy Summary',
      dossierCopied: 'Copied!',
      timelineSearchPlaceholder: 'Search service, workshop, note, or date...',
      filterAll: 'All',
      filterMaintenance: 'Maintenance',
      filterFuel: 'Fuel',
      filterEv: 'EV Charge',
      filterExpense: 'Expenses / Docs',
      noTimelineEntries: 'No records match this filter.',
      workshopLabel: 'Workshop / Location:',
      photoCameraBtn: 'Receipt Photo',
      photoCameraTitle: 'Take photo of receipt',
      photoGalleryTitle: 'Choose from gallery',
      viewBtn: 'View',
      downloadBtn: 'Download',
      deleteAttAria: 'Delete receipt',
      modalCreateTitle: 'New Medical Record Entry',
      modalCompleteReminderTitle: 'Complete Reminder & Log Service',
      modalAutoCycleNote: 'Automatically resets the next cycle',
      kindMaintenance: 'Service',
      kindRevision: 'Inspection',
      kindFuel: 'Fuel',
      kindEvCharge: 'EV Charge',
      kindExpense: 'Expense',
      categoryLabel: 'System / Category',
      dateLabel: 'Date',
      kmLabel: 'Odometer',
      energyKwhLabel: 'Energy (kWh)',
      powerTypeLabel: 'Type',
      socStartLabel: 'Start SoC %',
      socEndLabel: 'End SoC %',
      whatWasDoneLabel: 'What was done',
      placeholderFuel: 'Refueling description',
      placeholderRevision: 'Scheduled inspection details',
      placeholderExpense: 'Expense or insurance description',
      placeholderMaint: 'Maintenance performed',
      placeLabelStation: 'Gas station',
      placeLabelCharger: 'Charging station',
      placeLabelWorkshop: 'Workshop / Provider',
      placePhStation: 'Station name',
      placePhCharger: 'Charger location',
      placePhWorkshop: 'Workshop name or DIY',
      amountLabel: 'Amount',
      notesLabel: 'Notes',
      notesPlaceholder: 'Parts replaced, warranty, details...',
      attachSectionTitle: 'Receipt, invoice, insurance, or document photo (JPG ≤ 2 MB, private)',
      takePhotoBtn: 'Take Photo',
      galleryBtn: 'Gallery',
      saveRecordBtn: 'Save Record',
      attachmentCategories: {
        receipt: 'Workshop Receipt / Invoice',
        insurance: 'Insurance Policy',
        document: 'Registration / Inspection',
        vehicle_photo: 'Vehicle Photo',
        inspection: 'Inspection / Part',
        diagnostic: 'Diagnostic / Scanner',
      },
      monthNames: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ],
      otherRecordsHeading: 'Other records',
    },
    finalReportUi: {
      headerBadge: 'Final Report & Complete Dossier',
      headerSubtitle: 'Consolidated timeline, attached receipts & photos, preventive snapshot, and PDF export.',
      sortOldest: 'Oldest first',
      sortNewest: 'Newest first',
      downloadPdfBtn: 'Download Full PDF',
      sendWaPdfBtn: 'Send on WhatsApp',
      sendEmailBtn: 'Send via Email',
      printBtn: 'Print',
      kpiEvents: 'Events',
      kpiMaintenances: 'Services',
      kpiPhotosDocs: 'Photos & Docs',
      kpiTotalInvested: 'Total Invested',
      quickSendWaLabel: 'Target WhatsApp',
      quickSendEmailLabel: 'Target Email',
      timelineTitle: 'Complete Chronological Timeline',
      timelineEmpty: 'No timeline records for this filter.',
      galleryTitle: 'Private Vault Photos & Receipts',
      galleryEmpty: 'No photos or documents uploaded yet.',
      galleryConnectHint: 'Sign in under Settings to upload private photos.',
      uploadCategoryLabel: 'Attachment category',
      uploadNotesPlaceholder: 'Optional note (e.g. Oil change invoice)',
      snapshotTitle: 'Preventive Status Snapshot at Issue Time',
      snapshotColItem: 'Item',
      snapshotColStatus: 'Status',
      snapshotColLast: 'Last log',
      snapshotColNext: 'Next due',
      openBtn: 'Open',
      downloadBtn: 'Download',
      deleteAria: 'Delete attachment',
      pdfGeneratedMsg: 'PDF generated with',
      pdfSharedMsg: 'PDF shared with',
      pdfErrorMsg: 'Could not generate full PDF.',
      photoSavedMsg: 'Attachment saved to report.',
    },
    passportUi: {
      badge: 'AutoLife World · Digital Vehicle Passport',
      plateLabel: 'Plate:',
      kpiOnTrack: 'On-track items',
      kpiVerifiedLogs: 'Verified logs',
      kpiInvestment: 'Investment',
      kpiIssuedAt: 'Issued',
      qrPublicLabel: 'Public QR Verification',
      qrAuthTitle: 'Authorized QR Code Sharing',
      linkActiveRevoke: 'Link Active (Revoke)',
      linkRevokedReactivate: 'Link Revoked (Reactivate)',
      includeExpenses: 'Show expense amounts',
      includeDocuments: 'Show document list',
      copyBtn: 'Copy',
      copiedBtn: 'Copied',
      signInHint: 'Sign in under Settings to enable a verifiable public link with instant revocation.',
      updatingPassport: 'Updating verifiable Passport...',
      odometerTitle: 'Immutable Odometer Timeline',
      historyTitle: 'Chronological Maintenance History',
      emptyHistory: 'No maintenance history recorded yet.',
      sendWaBtn: 'Send Passport on WhatsApp',
      printPdfBtn: 'Print / Save PDF',
      publicBadge: 'AutoLife World · Verified Check',
      openAppBtn: 'Open App',
      verifying: 'Verifying Digital Vehicle Passport...',
      unavailableTitle: 'Passport Unavailable',
      unavailableDesc: 'This link does not exist, has expired, or was revoked by the owner.',
      authenticatedBadge: 'Authenticated Digital Passport',
      currentOdometer: 'Current odometer:',
      preventiveHealth: 'Preventive Health',
      onTrackSuffix: 'on track',
      odometerMarksTitle: 'Odometer Checkpoints',
      marksSuffix: 'logs',
      updatedAt: 'Updated on',
      maintHistoryTitle: 'Maintenance History',
      noPublicServices: 'No public service entries recorded.',
      verifiedDocsTitle: 'Verified Documents',
    },
    vaultUi: {
      title: 'Receipts, Invoices & Documents (Private)',
      subtitlePrefix: 'Invoices, insurance, and registration files for',
      subtitleSuffix: '· Compressed to JPG ≤ 2 MB with private access.',
      connectAccountBtn: 'Connect Account',
      unavailable: 'Private vault currently unavailable.',
      signInPromptPrefix: 'Sign in (Google, Apple, Facebook, or email) under',
      signInPromptBtn: 'Settings → Account & Cloud',
      signInPromptSuffix: 'to store workshop receipts, insurance policies, and inspection docs privately.',
      typeLabel: 'Document / receipt type',
      dateLabel: 'Date',
      notesLabel: 'Note (optional)',
      notesPlaceholder: 'Invoice or document details',
      takePhotoBtn: 'Take Photo',
      galleryBtn: 'Gallery',
      loading: 'Loading private files...',
      empty: 'No receipts or documents saved yet. Photos are compressed to JPG ≤ 2 MB automatically.',
      expiredLink: 'Link expired',
      viewBtn: 'View',
      downloadBtn: 'Download',
      sendWaTitle: 'Send document/receipt via WhatsApp',
      deleteAria: 'Delete file',
      uploadSuccess: 'saved with private access.',
      uploadError: 'Failed to upload file.',
      loadError: 'Unable to load private files right now.',
    },
    plansUi: {
      subtitle: 'Regional pricing configured by country & local currency',
      sourceDb: 'synced database catalog',
      sourceFallback: 'official regional pricing',
      monthly: 'Monthly',
      annualDiscount: 'Annual (-20%)',
      currentHeader: 'Current Plan & Quota',
      vehicleUnit: 'vehicle(s)',
      neverDeletedNote: 'Your vehicles and service history are never deleted if a subscription expires or is canceled.',
      dueLabel: 'Renews / Ends:',
      autoRenewLabel: 'Auto-renew:',
      on: 'On',
      off: 'Off',
      cancelSubBtn: 'Cancel subscription',
      graceWarningPrefix: 'Subscription in grace period until',
      graceWarningSuffix: 'Update payment to keep adding new vehicles.',
      paymentHistoryTitle: 'Payment History',
      currentPlanBadge: 'Current plan',
      activeBadge: 'Active',
      perMonth: '/ mo',
      estFee: 'Est. fee',
      upToVehicles: 'Up to',
      over100Vehicles: 'Over 100 vehicles',
      fromPrice: 'Starting at',
      renewSwitchCurrency: 'Renew / Change Currency',
      subscribePersonal: 'Subscribe Personal',
      contactB2b: 'Contact B2B Advisor',
      manageRenew: 'Manage / Renew',
      subscribePlan: 'Subscribe',
      checkoutPixTitle: 'Instant Pix Payment',
      checkoutIntlTitle: 'Secure Global Checkout',
      scanPixPrompt: 'Scan this QR code in your banking app',
      pixCopyPasteLabel: 'Pix Copy & Paste',
      changeMethodBtn: 'Change payment method',
      doneBtn: 'Done',
      verifyPixBtn: 'Verify Pix Payment',
      pixConfirmedMsg: 'Pix confirmed! Your subscription is now active.',
      pixPendingMsg: 'Pix still awaiting confirmation. Complete payment in your bank app and verify again.',
      localCurrencyLabel: 'Local currency',
      billingCycleLabel: 'Billing cycle',
      monthlyLabel: 'Monthly',
      annualLabel: 'Annual (-20%)',
      paymentMethodsLabel: 'Payment methods',
      receiptEmailLabel: 'Receipt email (optional)',
      subtotalLabel: 'Plan subtotal',
      regionalTaxesFallback: 'Regional taxes',
      processingFeeLabel: 'Processing fee',
      finalTotalLabel: 'Final total',
      generatePixBtn: 'Generate Pix QR Code',
      payWithCardBtn: 'Pay by Card',
      statusLabels: {
        active: 'Active',
        trialing: 'Trialing',
        past_due: 'Past due',
        grace_period: 'Grace period (7 days)',
        canceled: 'Canceled',
        expired: 'Expired (read-only for new vehicles)',
      },
    },
    analyticsUi: {
      title: 'Fleet Analytics · Costs & Charging',
      subtitle: 'Cars vs motorcycles breakdown: maintenance, EV charging, and TCO in',
      scopeAll: 'All',
      scopeCars: 'Cars',
      scopeMotos: 'Motorcycles',
      scopeActive: 'Active',
      kpiMaintenance: 'Total Maintenance (Fleet)',
      kpiCharging: 'Total EV Charging',
      kpiEnergy: 'Total Energy Delivered',
      chartVehicleTitle: 'Total Cost by Vehicle',
      chartTrendTitle: 'Chronological Trend: Costs & Energy (kWh)',
      emptyTrend: 'No maintenance or charging entries for this filter.',
      legendMaintenance: 'Maintenance',
      legendCharging: 'EV Charge',
      legendChargingCost: 'Charge Cost',
      legendEnergy: 'Energy (kWh)',
    },
    carbonUi: {
      title: 'Monthly Carbon Footprint & EV Savings',
      subtitle: 'CO₂e estimate based on odometer history, monthly mileage, and powertrain',
      gridBrazil: 'Renewable Grid (95 gCO₂/kWh)',
      gridGlobal: 'Global Grid Avg (280 gCO₂/kWh)',
      kpiMonthlyCo2: 'Current Monthly Footprint',
      kpiEstMonthDist: '/mo estimated',
      kpiAvoidedCo2: 'CO₂ Avoided (EV / Hybrid)',
      kpiAvoided6m: 'kg avoided in 6 months',
      kpiReduction: 'Impact Reduction vs ICE',
      kpiTreesYear: 'trees/year equivalent',
      kpiIntensity: 'Fleet Avg Intensity',
      kpiEvTarget: 'EV benchmark: < 25 g/km',
      chartEvolutionTitle: '6-Month Trend: Actual Emissions vs EV Savings (kg CO₂)',
      chartPerVehicleTitle: 'Monthly Emissions vs EV Savings per Vehicle (kg CO₂/mo)',
      tooltipReal: 'Actual Emissions:',
      tooltipAvoided: 'CO₂ Avoided (EV/Hybrid):',
      tooltipBaseline: '100% Combustion Baseline:',
      tooltipMonthlyDist: 'Monthly distance:',
      legendReal: 'Actual CO₂ (kg)',
      legendAvoided: 'EV / Hybrid Savings (kg)',
      legendBaseline: '100% ICE Baseline',
      legendActualVehicle: 'Current CO₂ (kg)',
      legendSavingsVehicle: 'EV/Hybrid Savings (kg)',
      simPrefix: 'Electrification Simulator:',
      simMiddle: 'Replacing',
      simMiddle2: 'with a 100% EV would cut an extra',
      simTrees: 'trees/year equivalent',
      simAllEvTitle: '100% Electric in this filter:',
      simAllEvSuffix: 'CO₂ reduction compared to gasoline equivalents.',
      powertrainLabels: {
        electric: 'Electric',
        hybrid: 'Hybrid',
        diesel: 'Diesel',
        combustion: 'Combustion',
      },
    },
    teamUi: {
      disconnectedTitle: 'Company & Driver Team',
      disconnectedDesc: 'Sign in to register your company, invite drivers or fleet managers with granular permissions, and isolate organization vehicles.',
      connectBtn: 'Connect Business Account',
      title: 'Organization Structure & Fleet Roles',
      isolatedNote: 'Data is strictly isolated per company (organizations never access external vehicles or documents).',
      teamCountLabel: 'Team:',
      companyNameLabel: 'Company Name / Legal Entity',
      companyPlaceholder: 'e.g. Acme Fleet Logistics Ltd',
      taxIdLabel: 'VAT / Tax ID / EIN',
      taxIdPlaceholder: 'Tax registration ID',
      saveBtn: 'Save',
      savedBtn: '✓ Saved',
      inviteTitle: 'Invite Driver / Manager',
      namePlaceholder: 'Full name',
      emailPlaceholder: 'member@company.com',
      inviteBtn: 'Invite Member',
      statusActive: 'Active',
      statusPending: 'Pending invite',
      statusRevoked: 'Revoked',
      reactivateBtn: 'Reactivate',
      suspendBtn: 'Suspend',
      removeMemberAria: 'Remove member',
      limitReachedMsg: 'Member limit reached on your current plan. Upgrade to add more users.',
      inviteSuccessMsg: 'Invite recorded with custom permissions.',
      roles: {
        admin: 'Administrator',
        fleet_manager: 'Fleet Manager',
        driver: 'Driver / Operator',
        viewer: 'Auditor / Read-only',
      },
      permissions: {
        canViewVehicles: 'View vehicles',
        canEditVehicles: 'Edit fleet',
        canLogMaintenance: 'Log services',
        canViewExpenses: 'View costs',
        canManageTeam: 'Manage team',
      },
    },
    adminUi: {
      title: 'Admin Console — Plan Provisioning',
      subtitlePrefix: 'Restricted access for',
      subtitleSuffix: 'Grant VIP, fleet, or complimentary plans in 1 click.',
      refreshBtn: 'Refresh accounts',
      sqlSetupTitle: 'One-time Supabase SQL setup',
      sqlSetupDesc: 'Run this SQL once in Supabase SQL Editor to enable direct user listing and plan grants.',
      copySqlBtn: 'Copy setup SQL',
      copiedSqlBtn: 'SQL copied',
      grantTitle: 'Grant or Update Plan by Email',
      emailLabel: 'Account email',
      planLabel: 'Plan to grant',
      durationLabel: 'Duration',
      grantHint: 'The user must have signed in at least once to appear in the directory below.',
      grantBtn: 'Grant Plan Now',
      accountsTitle: 'Registered Accounts',
      searchPlaceholder: 'Search by email or name...',
      loading: 'Loading accounts...',
      emptyNeedSql: 'Run the SQL snippet above in Supabase and click Refresh accounts.',
      emptyNoMatch: 'No accounts found.',
      noExpiry: 'No expiration',
      selectBtn: 'Select',
      grantEnterpriseBtn: 'Grant Enterprise (1 yr)',
      planLabelPrefix: 'Plan:',
      statusLabelPrefix: 'Status:',
      vehiclesLabel: 'vehicle(s)',
      expiryLabelPrefix: 'Expires:',
    },
    pdfUi: {
      headerSubtitle: 'Complete Final Vehicle Report',
      footerRight: 'Generated on',
      pageLabel: 'Page',
      ofLabel: 'of',
      vehicleLabel: 'Vehicle',
      plateLabel: 'Plate',
      yearLabel: 'Year',
      odometerLabel: 'Odometer',
      powertrainLabel: 'Powertrain',
      colorLabel: 'Color',
      ownerLabel: 'Owner / Account',
      issuedLabel: 'Issued',
      docExpiryLabel: 'Registration / Inspection',
      insExpiryLabel: 'Insurance',
      notInformed: 'Not specified',
      summaryEvents: 'Total Events',
      summaryMaintenances: 'Services',
      summaryPhotos: 'Photos / Receipts',
      summaryTotal: 'Total Invested',
      timelineTitle: 'Full Chronological Timeline (Services, Charges & Receipts)',
      emptyTimeline: 'No service records logged for this vehicle yet.',
      colDate: 'Date',
      colCategory: 'Type',
      colTitle: 'Description',
      colKm: 'Odometer',
      colWorkshop: 'Location',
      colCost: 'Amount',
      preventiveTitle: 'Current Preventive Snapshot',
      colItem: 'Item',
      colStatus: 'Status',
      colLastRecord: 'Last Log',
      colNextDue: 'Next Due',
      photosSectionTitle: 'Embedded Receipts, Photos & Documents',
      filenamePrefix: 'AutoLife-Report',
      timelineBadges: {
        evCharge: 'EV Charge',
        photoPrefix: 'Attachment:',
      },
    },
  },
  es: {
    localeTag: 'es-ES',
    header: { addShort: 'Nuevo' },
    sidebar: {
      noVehicles: 'Ningún vehículo registrado',
      add: 'Añadir',
      remove: 'Eliminar',
      removeTitle: 'Eliminar vehículo y todo su historial',
    },
    pwa: {
      offlineBadge: 'Modo Sin Conexión — Datos locales activos',
      installBtn: 'Instalar App (PWA)',
      installTitle: 'Instalar AutoLife World en tu dispositivo',
      installedOk: 'App Instalada',
      iosTitle: 'Instalar en iPhone',
      iosDesc: 'En Safari, pulsa el icono Compartir y selecciona "Añadir a pantalla de inicio".',
      iosStep1: '1. Pulsa el botón Compartir en la barra inferior de Safari.',
      iosStep2: '2. Desplázate y elige "Añadir a pantalla de inicio".',
      iosStep3: '3. Confirma pulsando "Añadir" arriba a la derecha.',
      gotIt: 'Entendido',
    },
    app: {
      mapsQuotaMsg: 'Se alcanzó el límite temporal de demostración de Google Maps.',
      mapsQuotaLink: 'Cómo usar tu propia clave con crédito gratuito',
      closeNotice: 'Cerrar aviso',
      waBannerTitle: 'Completa tu registro rápido (Email + WhatsApp)',
      waBannerDescPrefix: 'Email vinculado:',
      waBannerDefaultAccount: 'Cuenta conectada',
      waBannerDescSuffix: 'Guarda tu WhatsApp una vez para enviar fichas técnicas, facturas y avisos con 1 toque.',
      waSaveBtn: 'Guardar WhatsApp',
      waLaterBtn: 'Ahora no',
      waInvalidError: 'Introduce un número de WhatsApp válido con prefijo internacional (ej.: +34 612 345 678).',
      waPlaceholder: 'Ej.: +34 612 345 678',
    },
    whatsapp: {
      buttonLabel: 'WhatsApp',
      buttonDefaultTitle: 'Enviar al WhatsApp guardado',
      invalidError: 'Introduce un WhatsApp válido con prefijo internacional (ej.: +34 612 345 678).',
      connectTitle: 'Conectar WhatsApp',
      connectDesc: 'Guarda tu número una sola vez para enviar cualquier servicio, factura o recordatorio directo a tu WhatsApp.',
      inputLabel: 'WhatsApp guardado (con prefijo de país)',
      inputPlaceholder: 'Ej.: +34 612 345 678',
      cancel: 'Cancelar',
      saveOnly: 'Guardar WhatsApp',
      saveAndOpen: 'Guardar y Abrir WhatsApp',
      close: 'Cerrar',
    },
    vehicleColors: {
      labels: {
        white: 'Blanco',
        black: 'Negro',
        silver: 'Plata',
        gray: 'Gris',
        red: 'Rojo',
        blue: 'Azul',
        green: 'Verde',
        yellow: 'Amarillo',
        brown: 'Marrón',
        orange: 'Naranja',
      },
      categoryLabels: {
        electric: 'Eléctrico / Híbrido',
        motoTrail: 'Moto Trail / Touring',
        moto: 'Motocicleta',
        suv: 'SUV / Todoterreno',
        sedan: 'Automóvil',
      },
    },
    modals: {
      addTitle: 'Nuevo Vehículo',
      editTitle: 'Editar Vehículo',
      close: 'Cerrar',
      cancel: 'Cancelar',
      saveVehicle: 'Guardar Vehículo',
      saveChanges: 'Guardar Cambios',
      saveLog: 'Guardar Registro',
      scanBannerTitle: 'Rellenar con foto del documento (Opcional)',
      scanBannerDesc: 'Sube el Permiso de Circulación, Ficha Técnica, CRLV o documento de cualquier país para rellenar marca, modelo, año, matrícula y color automáticamente.',
      scanCameraBtn: 'Usar Cámara',
      scanFileBtn: 'Subir Foto / PDF',
      scanning: 'Leyendo documento con IA...',
      scanSuccess: '¡Datos extraídos! Revisa los campos antes de guardar.',
      scanInvalidFile: 'Sube una foto (JPG/PNG/WEBP) o archivo PDF del documento.',
      scanFailed: 'No se pudo leer el documento automáticamente. Completa los campos manualmente.',
      planLimitReached: 'Límite de vehículos del plan alcanzado',
      planLimitExpiredPrefix: 'Tu suscripción ha caducado. Tus vehículos siguen guardados, pero no puedes añadir nuevos.',
      planLimitActivePrefix: 'Tu plan actual permite hasta',
      planLimitUpgradeBtn: 'Ver Planes y Mejorar',
      vehicleKindLabel: 'Tipo de vehículo',
      vehicleKindCar: 'Coche / SUV / Furgoneta',
      vehicleKindMoto: 'Motocicleta',
      brandLabel: 'Marca',
      brandPlaceholderCar: 'Ej.: Seat, Toyota, Tesla',
      brandPlaceholderMoto: 'Ej.: Honda, Yamaha, BMW',
      modelLabel: 'Modelo',
      modelPlaceholderCar: 'Ej.: León, Corolla, Model 3',
      modelPlaceholderMoto: 'Ej.: CB 500X, MT-07',
      yearLabel: 'Año',
      plateLabel: 'Matrícula / Placa',
      colorLabel: 'Color del vehículo',
      colorSelectedNone: 'Sin seleccionar',
      colorCustomPlaceholder: 'O escribe un color personalizado (ej.: Azul Metalizado)',
      powertrainLabel: 'Motorización',
      displacementLabel: 'Cilindrada (cc)',
      odometerLabel: 'Kilometraje actual',
      frontPsiLabel: 'PSI Delantero',
      rearPsiLabel: 'PSI Trasero',
      singlePsiLabel: 'Presión Neumáticos (PSI)',
      weeklyKmLabel: 'Uso semanal (km/sem)',
      fleetGroupLabel: 'Categoría',
      personalGroup: 'Uso Particular',
      fleetGroup: 'Flota / Empresa',
      licenseDateLabel: 'Vencimiento ITV / Permiso',
      insuranceDateLabel: 'Vencimiento Seguro',
      vinLabel: 'Bastidor / VIN (opcional)',
      attachDocLabel: 'Guardar foto del documento en tu Bóveda Privada (opcional)',
      attachCamera: 'Cámara',
      attachFile: 'Archivo',
      deleteTitle: '¿Eliminar vehículo e historial?',
      deleteConfirmBtn: 'Eliminar Permanentemente',
      deleteDescPrefix: 'Esta acción borra permanentemente este vehículo y todos sus datos:',
      deleteLogsLabel: 'registro(s) en la Ficha Médica',
      deleteChargesLabel: 'recarga(s) eléctrica(s)',
      deleteItemsLabel: 'elementos preventivos controlados',
      deleteDocsLabel: 'documento(s) en bóveda privada',
      deletePermanentNote: 'También se eliminan los datos sincronizados en la nube.',
      logVehicleLabel: 'Vehículo activo',
      logItemLabel: 'Componente / Servicio',
      logDateLabel: 'Fecha de realización',
      logCostLabel: 'Importe pagado',
      logSelfCheck: 'Revisión Propia',
    },
    healthUi: {
      emptyTitle: 'Ningún vehículo registrado',
      emptyDesc: 'Añade tu coche o moto para activar el panel de Salud y Mantenimiento, alertas preventivas y ficha médica completa.',
      emptyBtn: 'Registrar Mi Vehículo',
      statusBadge: {
        pending: 'Esperando registros',
        excellent: 'Excelente',
        good: 'Bueno',
        attention: 'Atención',
        critical: 'Crítico',
      },
      tabs: {
        checklist: 'Checklist y Avisos',
        guides: 'Guías Ilustradas',
        finalReport: 'Informe Final',
      },
      actions: {
        preTrip: 'Pre-Viaje 60s',
        odometer: 'Kilometraje',
        tirePsi: 'Presión',
        saveOdometer: 'Actualizar',
        clearFilters: 'Limpiar filtros',
        registerNow: 'Registrar ahora',
        schedule: 'Agenda',
        details: 'Detalles',
      },
      hero: {
        title: 'Salud y Mantenimiento',
        recordedOf: 'elementos registrados de',
        summaryPending: 'Registra tus primeros servicios para activar los avisos preventivos de',
        summaryOverdue: 'Hay mantenimientos vencidos para',
        summaryAttention: 'Algunos componentes están próximos a vencer en',
        summaryHealthy: 'Todo al día para',
        nextOilLabel: 'Cambio de aceite',
        nextRevisionLabel: 'Próxima revisión',
        dueToday: 'Hoy',
        overdueBy: 'atrasado',
        remaining: 'restantes',
      },
      starter: {
        title: 'Empieza el control preventivo',
        desc: 'Registra el último servicio o cambio de aceite para calcular automáticamente las próximas fechas y kilómetros.',
        cta: 'Registrar 1.er Servicio',
      },
      nextSteps: {
        title: 'Próximos Pasos Prioritarios',
        subtitle: 'Elementos que requieren atención antes que los demás:',
        allGood: 'Ninguna tarea urgente por ahora.',
      },
      groups: {
        safety: 'Seguridad',
        engine: 'Motor y Sistemas',
        docs: 'Documentos y Plazos',
      },
      card: {
        cycleDetails: 'Detalles',
        cycleUsage: 'Uso del ciclo',
        everyDaysOrKm: 'Cada',
        safetyNote: 'Aviso de seguridad',
        intervalLabel: 'Ciclo:',
        dueLabel: 'Previsto:',
        sendWhatsappTitle: 'Enviar recordatorio por WhatsApp',
        addCalendarTitle: 'Descargar aviso (.ics)',
        askMechanicTitle: 'Consultar al Mecánico IA',
      },
      guides: {
        scopeAll: 'Todos',
        scopeCar: 'Coche',
        scopeMoto: 'Moto',
        emptyFilter: 'No hay guías para este filtro.',
        tipPrefix: 'Regla de seguridad:',
      },
      preTrip: {
        title: 'Checklist Pre-Viaje 60s',
        subtitle: 'Inspección visual rápida antes de salir a carretera con seguridad.',
        distanceLabel: 'Distancia del viaje',
        loadLabel: 'Carga / Ocupantes',
        soloOption: 'Solo piloto',
        heavyMotoOption: 'Pasajero / Baúl cargado (+3 PSI atrás)',
        normalCarOption: 'Carga normal',
        heavyCarOption: 'Coche lleno / equipaje (+3 PSI)',
        verifiedOf: 'verificados',
        sendWa: 'Enviar por WhatsApp',
        readyBtn: 'Listo para Viajar',
        items: {
          tires: 'Revisar presión en frío (incluida rueda de repuesto)',
          oil: 'Comprobar nivel de aceite en superficie plana',
          coolant: 'Mirar depósito de refrigerante por fuera (motor frío)',
          lights: 'Probar luces, intermitentes y luz de freno',
          chainOrSpare: 'Revisar tensión/engrase de cadena (o herramientas/gato)',
          brakes: 'Confirmar firmeza del freno y nivel de líquido DOT4',
          docs: 'Comprobar documentación, seguro y chaleco/casco',
        },
      },
      drivingProfiles: {
        city: 'Ciudad / Tráfico',
        highway: 'Autopista / Carretera',
        mixed: 'Uso Mixto',
        severe: 'Severo / Trabajo',
      },
    },
    garageUi: {
      emptyTitle: 'Tu garaje está vacío',
      emptyDesc: 'Añade tu primer coche o moto para llevar su ficha médica digital, documentos, gastos (TCO) y Pasaporte Digital con código QR.',
      emptyBtn: 'Añadir Primer Vehículo',
      bannerTitle: 'Vehículos, Documentos y Pasaporte Digital',
      bannerDesc: 'Selecciona un vehículo para abrir su Ficha Médica completa, generar código QR o editar datos.',
      kpi: {
        vehicles: 'Vehículos en Garaje',
        weeklyKm: 'Uso Semanal',
        tco: 'Coste Total (TCO)',
        costPerKm: 'Coste Medio / km',
        pendingDocs: 'Docs. por Vencer',
      },
      actions: {
        medical: 'Ficha Médica',
        passport: 'Pasaporte + QR',
        edit: 'Editar',
        remove: 'Eliminar',
      },
      fleet: {
        title: 'Flota Empresarial y Multivehículo',
        subtitle: 'Control centralizado por conductor, perfil de uso, costes y estado preventivo.',
        gateTitle: 'Panel de Flota Empresarial',
        gateDesc: 'Gestiona varios vehículos, permisos de conductores e informes consolidados con los planes Flota.',
        gateBtn: 'Ver Planes de Flota',
        searchPlaceholder: 'Buscar por matrícula, marca, modelo o conductor...',
        filterAll: 'Todos',
        filterCars: 'Coches',
        filterMotos: 'Motos',
        filterPersonal: 'Particulares',
        filterFleet: 'Flota',
        colVehicle: 'Vehículo',
        colPlateColor: 'Matrícula y Color',
        colDriver: 'Responsable',
        colProfile: 'Perfil de Uso',
        colOdometer: 'Kilometraje',
        colStatus: 'Salud',
        colCosts: 'TCO Acumulado',
        colActions: 'Acciones',
        unassigned: 'Sin asignar',
        noColor: 'Color sin indicar',
        statusOk: 'Al día',
        statusAttention: 'Atención',
        statusOverdue: 'Atrasado',
        statusPending: 'Sin registro',
        showingCount: 'mostrados',
      },
      specs: {
        colorLabel: 'Color del vehículo',
        notInformed: 'No especificado',
        profileLabel: 'Perfil de Severidad de Uso',
        weeklyAvgLabel: 'Media semanal',
        accumulatedTco: 'TCO acumulado',
        costPerKmLabel: 'Coste por km',
        vinLabel: 'Bastidor / VIN',
        docsNotSet: 'Fecha sin indicar',
      },
    },
    evUi: {
      emptyTitle: 'Ningún vehículo registrado',
      emptyDesc: 'Registra un vehículo eléctrico, híbrido o de combustión para planificar cargas y buscar cargadores en el mapa.',
      emptyBtn: 'Registrar Vehículo',
      sendChargeWaTitle: 'Enviar recarga al WhatsApp guardado',
    },
    networkUi: {
      mapSearchTerms: {
        workshop: 'Taller mecánico',
        ev_charger: 'Punto de carga coche eléctrico',
        tires: 'Taller de neumáticos y alineación',
        fuel: 'Gasolinera',
        dealership: 'Concesionario oficial',
      },
      geoUnsupported: 'La geolocalización no es compatible con este navegador.',
      geoDenied: 'Permiso de ubicación denegado o no disponible.',
      useLocation: 'Usar mi ubicación',
      locActive: 'Ubicación activa',
      addPlace: 'Añadir Lugar',
      searchMapsBtn: 'Buscar en Google Maps',
      emptyTitle: 'No hay lugares guardados en este filtro',
      emptyDesc: 'Guarda tus talleres de confianza o busca lugares cercanos directamente en Google Maps.',
      addModalTitle: 'Añadir Lugar de Confianza',
      placeName: 'Nombre del establecimiento',
      placeCategory: 'Categoría',
      placeCity: 'Ciudad / Región',
      placeAddress: 'Dirección',
      placePhone: 'Teléfono / WhatsApp',
      placeNotes: 'Notas (opcional)',
      savePlace: 'Guardar Lugar',
      removePlace: 'Eliminar',
      openMaps: 'Maps',
      kmAway: 'de distancia',
    },
    settingsUi: {
      accountTitle: 'Cuenta y Sincronización en la Nube',
      accountSubtitle: 'Sincroniza tu garaje, ficha médica, fotos privadas y planes en cualquier dispositivo.',
      connectedBadge: 'Conectado',
      localOnlyBadge: 'Solo local',
      syncGarageBtn: 'Sincronizar Garaje',
      syncingBtn: 'Sincronizando...',
      syncedMsg: '¡Datos sincronizados con la nube!',
      signOutBtn: 'Cerrar sesión',
      authOAuthHint: 'Accede en 1 clic con tu cuenta:',
      continueWith: 'Continuar con',
      signInTab: 'Iniciar Sesión',
      signUpTab: 'Crear Cuenta',
      emailLabel: 'Correo electrónico',
      passwordLabel: 'Contraseña',
      signInBtn: 'Entrar en mi Cuenta',
      signUpBtn: 'Crear Mi Cuenta',
      authRequiredTitle: 'Conecta tu cuenta para sincronización segura',
      authSuccessSignIn: '¡Sesión iniciada! Cargando tus vehículos desde la nube...',
      authSuccessSignUp: '¡Cuenta creada! Revisa tu correo si requiere confirmación.',
      vehiclesTitle: 'Mis Vehículos',
      vehiclesPlanUsage: 'Plan:',
      upgradePlanBtn: 'Ver Planes',
      addVehicleBtn: 'Añadir Vehículo',
      activeBadge: 'Activo',
      selectBtn: 'Seleccionar',
      removeBtn: 'Eliminar',
      whatsappTitle: 'WhatsApp Guardado',
      whatsappDesc: 'Recibe alertas, fichas técnicas e informes en 1 toque.',
      whatsappSavedBadge: 'Configurado',
      whatsappSaveBtn: 'Guardar',
      whatsappSavedMsg: '¡WhatsApp guardado correctamente!',
      whatsappInvalidMsg: 'Número inválido. Incluye prefijo de país (ej.: +34 612 345 678).',
      regionCountryLabel: 'País / Región de Facturación',
      regionCurrencyLabel: 'Moneda Local',
      regionAutoBtn: 'Automático',
      regionAutoApplied: 'Idioma, país y moneda ajustados automáticamente a tu región.',
      pushTitle: 'Notificaciones Push en 2.º Plano',
      pushDesc: 'Recibe avisos de aceite, neumáticos e ITV incluso con el navegador cerrado.',
      pushSupported: 'Compatible',
      pushUnsupported: 'El navegador no admite Push',
      pushEnableBtn: 'Activar Push en 2.º Plano',
      pushDisableBtn: 'Desactivar Push',
      pushTestBtn: 'Enviar Push de Prueba',
      pushEnabledMsg: '¡Notificaciones Push activadas!',
      pushDisabledMsg: 'Notificaciones Push desactivadas.',
      pushVapidActive: 'VAPID persistente activo',
      remindersSavedHint: 'Las preferencias se guardan automáticamente en local y en la nube.',
    },
    medicalUi: {
      title: 'Ficha Médica Digital del Vehículo',
      subtitle: 'Historial completo de mantenimiento, revisiones, combustible, facturas y avisos inteligentes.',
      addRecordBtn: 'Nuevo Registro',
      exportPdfBtn: 'Informe PDF',
      generatingPdf: 'Generando PDF...',
      summaryRecords: 'Registros',
      summaryTotalInvested: 'Invertido',
      summaryPhotos: 'Facturas / Fotos',
      radarTitle: 'Radar Inteligente de Vencimientos',
      radarUrgentOnly: 'Pendientes / Urgentes',
      radarAll: 'Todos',
      radarShow: 'Ver radar',
      radarHide: 'Ocultar',
      radarAllClear: '¡Todo al día en el radar preventivo!',
      radarCompleteBtn: 'Completar',
      radarWaiting: 'Esperando 1.er registro',
      radarOverdue: 'Vencido',
      radarDueSoon: 'Vence pronto',
      radarOnTrack: 'Al día',
      radarNoDate: 'Sin fecha indicada',
      radarNoDateHint: 'Registra la fecha de vencimiento para activar avisos',
      radarDueIn: 'Vence en',
      radarOverdueByDays: 'atrasado',
      radarOverdueByKm: 'excedidos',
      radarSuggestedCycle: 'Ciclo sugerido:',
      radarImmediate: 'Revisión inmediata recomendada',
      dossierTitle: 'Enviar Ficha Médica e Informe',
      dossierDesc: 'Comparte el historial completo con fotos, costes y facturas con talleres, seguros o compradores.',
      dossierWhatsappBtn: 'Enviar por WhatsApp',
      dossierEmailBtn: 'Enviar por Email',
      dossierCopyBtn: 'Copiar Resumen',
      dossierCopied: '¡Copiado!',
      timelineSearchPlaceholder: 'Buscar servicio, taller, factura o fecha...',
      filterAll: 'Todo',
      filterMaintenance: 'Mantenimiento',
      filterFuel: 'Combustible',
      filterEv: 'Carga EV',
      filterExpense: 'Gastos / Docs',
      noTimelineEntries: 'No hay registros para este filtro.',
      workshopLabel: 'Taller / Lugar:',
      photoCameraBtn: 'Foto Factura',
      photoCameraTitle: 'Hacer foto de la factura',
      photoGalleryTitle: 'Elegir foto de galería',
      viewBtn: 'Ver',
      downloadBtn: 'Descargar',
      deleteAttAria: 'Borrar factura',
      modalCreateTitle: 'Nuevo Registro en Ficha Médica',
      modalCompleteReminderTitle: 'Completar Aviso y Registrar Servicio',
      modalAutoCycleNote: 'Actualiza automáticamente el próximo ciclo',
      kindMaintenance: 'Mantenim.',
      kindRevision: 'Revisión',
      kindFuel: 'Repostaje',
      kindEvCharge: 'Carga EV',
      kindExpense: 'Gasto',
      categoryLabel: 'Sistema / Categoría',
      dateLabel: 'Fecha',
      kmLabel: 'Km',
      energyKwhLabel: 'Energía (kWh)',
      powerTypeLabel: 'Tipo',
      socStartLabel: 'Batería Inicio %',
      socEndLabel: 'Batería Fin %',
      whatWasDoneLabel: 'Trabajo realizado',
      placeholderFuel: 'Descripción del repostaje',
      placeholderRevision: 'Descripción de la revisión',
      placeholderExpense: 'Descripción del gasto o seguro',
      placeholderMaint: 'Descripción del mantenimiento realizado',
      placeLabelStation: 'Gasolinera',
      placeLabelCharger: 'Estación de carga',
      placeLabelWorkshop: 'Taller / Establecimiento',
      placePhStation: 'Nombre de la estación',
      placePhCharger: 'Nombre del cargador',
      placePhWorkshop: 'Nombre del taller o propio',
      amountLabel: 'Importe',
      notesLabel: 'Observaciones',
      notesPlaceholder: 'Piezas sustituidas, garantía, detalles...',
      attachSectionTitle: 'Foto de factura, recibo, seguro o ITV (JPG ≤ 2 MB, privado)',
      takePhotoBtn: 'Hacer Foto',
      galleryBtn: 'Galería',
      saveRecordBtn: 'Guardar Registro',
      attachmentCategories: {
        receipt: 'Factura del Taller / Recibo',
        insurance: 'Seguro',
        document: 'ITV / Permiso / Documento',
        vehicle_photo: 'Foto del Vehículo',
        inspection: 'Inspección / Pieza',
        diagnostic: 'Informe / Diagnosis',
      },
      monthNames: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ],
      otherRecordsHeading: 'Otros registros',
    },
    finalReportUi: {
      headerBadge: 'Informe Final y Dossier Completo',
      headerSubtitle: 'Línea temporal consolidada, fotos adjuntas, cuadro preventivo y exportación en PDF.',
      sortOldest: 'Más antiguos',
      sortNewest: 'Más recientes',
      downloadPdfBtn: 'Descargar PDF Completo',
      sendWaPdfBtn: 'Enviar por WhatsApp',
      sendEmailBtn: 'Enviar por Email',
      printBtn: 'Imprimir',
      kpiEvents: 'Eventos',
      kpiMaintenances: 'Mantenimientos',
      kpiPhotosDocs: 'Fotos y Docs',
      kpiTotalInvested: 'Inversión Total',
      quickSendWaLabel: 'WhatsApp destino',
      quickSendEmailLabel: 'Email destino',
      timelineTitle: 'Línea Temporal Completa',
      timelineEmpty: 'No hay registros en la línea temporal para este filtro.',
      galleryTitle: 'Galería Privada de Facturas y Fotos',
      galleryEmpty: 'Aún no hay fotos ni documentos adjuntos.',
      galleryConnectHint: 'Inicia sesión en Preferencias para subir fotos privadas.',
      uploadCategoryLabel: 'Tipo de archivo',
      uploadNotesPlaceholder: 'Descripción opcional (ej.: Factura cambio aceite)',
      snapshotTitle: 'Estado Preventivo en el Momento de Emisión',
      snapshotColItem: 'Elemento',
      snapshotColStatus: 'Estado',
      snapshotColLast: 'Último registro',
      snapshotColNext: 'Próxima fecha',
      openBtn: 'Abrir',
      downloadBtn: 'Descargar',
      deleteAria: 'Eliminar adjunto',
      pdfGeneratedMsg: 'PDF generado con',
      pdfSharedMsg: 'PDF compartido con',
      pdfErrorMsg: 'No se pudo generar el PDF completo.',
      photoSavedMsg: 'Adjunto guardado en el informe.',
    },
    passportUi: {
      badge: 'AutoLife World · Pasaporte Digital del Vehículo',
      plateLabel: 'Matrícula:',
      kpiOnTrack: 'Puntos al día',
      kpiVerifiedLogs: 'Registros verificados',
      kpiInvestment: 'Inversión',
      kpiIssuedAt: 'Emisión',
      qrPublicLabel: 'QR Consulta Pública',
      qrAuthTitle: 'Compartición Autorizada por Código QR',
      linkActiveRevoke: 'Enlace Activo (Revocar)',
      linkRevokedReactivate: 'Enlace Revocado (Reactivar)',
      includeExpenses: 'Mostrar importes de gastos',
      includeDocuments: 'Mostrar lista de documentos',
      copyBtn: 'Copiar',
      copiedBtn: 'Copiado',
      signInHint: 'Inicia sesión en Preferencias para activar un enlace público verificable con revocación al instante.',
      updatingPassport: 'Actualizando Pasaporte verificable...',
      odometerTitle: 'Historial Inmutable de Kilometraje',
      historyTitle: 'Historial Cronológico de Mantenimiento',
      emptyHistory: 'Aún no hay registros históricos.',
      sendWaBtn: 'Enviar Pasaporte por WhatsApp',
      printPdfBtn: 'Imprimir / Guardar PDF',
      publicBadge: 'AutoLife World · Consulta Verificada',
      openAppBtn: 'Abrir Aplicación',
      verifying: 'Verificando Pasaporte Digital del Vehículo...',
      unavailableTitle: 'Pasaporte No Disponible',
      unavailableDesc: 'Este enlace no existe, ha caducado o fue revocado por el propietario.',
      authenticatedBadge: 'Pasaporte Digital Autenticado',
      currentOdometer: 'Kilometraje actual:',
      preventiveHealth: 'Salud Preventiva',
      onTrackSuffix: 'al día',
      odometerMarksTitle: 'Registros de Kilometraje',
      marksSuffix: 'hitos',
      updatedAt: 'Actualizado el',
      maintHistoryTitle: 'Historial de Mantenimiento',
      noPublicServices: 'Ningún servicio público registrado.',
      verifiedDocsTitle: 'Documentos Verificados',
    },
    vaultUi: {
      title: 'Fotos de Facturas, Recibos y Documentos (Privado)',
      subtitlePrefix: 'Facturas de taller, seguro e ITV de',
      subtitleSuffix: '· Imágenes comprimidas en JPG ≤ 2 MB con acceso privado.',
      connectAccountBtn: 'Conectar Cuenta',
      unavailable: 'Bóveda privada no disponible en este momento.',
      signInPromptPrefix: 'Inicia sesión (Google, Apple, Facebook o email) en',
      signInPromptBtn: 'Preferencias → Cuenta y Nube',
      signInPromptSuffix: 'para guardar facturas del taller, seguro o ITV con acceso privado solo para ti.',
      typeLabel: 'Tipo de factura / documento',
      dateLabel: 'Fecha',
      notesLabel: 'Observación (opcional)',
      notesPlaceholder: 'Detalles de la factura o documento',
      takePhotoBtn: 'Hacer Foto',
      galleryBtn: 'Galería',
      loading: 'Cargando archivos privados...',
      empty: 'Ninguna factura o documento guardado aún. Las fotos se comprimen automáticamente en JPG ≤ 2 MB.',
      expiredLink: 'Enlace caducado',
      viewBtn: 'Ver',
      downloadBtn: 'Descargar',
      sendWaTitle: 'Enviar documento/factura por WhatsApp',
      deleteAria: 'Eliminar archivo',
      uploadSuccess: 'guardado con acceso privado.',
      uploadError: 'Error al subir el archivo.',
      loadError: 'No se pudieron cargar los archivos privados en este momento.',
    },
    plansUi: {
      subtitle: 'Precios regionales configurados por país y moneda local',
      sourceDb: 'catálogo sincronizado con base de datos',
      sourceFallback: 'tarifa regional oficial',
      monthly: 'Mensual',
      annualDiscount: 'Anual (-20%)',
      currentHeader: 'Suscripción y Límite Actual',
      vehicleUnit: 'vehículo(s)',
      neverDeletedNote: 'Tus vehículos e historiales nunca se borran aunque caduque o se cancele la suscripción.',
      dueLabel: 'Vencimiento:',
      autoRenewLabel: 'Renovación automática:',
      on: 'Activa',
      off: 'Desactivada',
      cancelSubBtn: 'Cancelar suscripción',
      graceWarningPrefix: 'Suscripción en período de gracia hasta',
      graceWarningSuffix: 'Regulariza el pago para seguir añadiendo vehículos.',
      paymentHistoryTitle: 'Historial de Pagos',
      currentPlanBadge: 'Plan actual',
      activeBadge: 'Activo',
      perMonth: '/ mes',
      estFee: 'Comisión est.',
      upToVehicles: 'Hasta',
      over100Vehicles: 'Más de 100 vehículos',
      fromPrice: 'Desde',
      renewSwitchCurrency: 'Renovar / Cambiar Moneda',
      subscribePersonal: 'Suscribir Plan Particular',
      contactB2b: 'Hablar con Asesor B2B',
      manageRenew: 'Gestionar / Renovar',
      subscribePlan: 'Contratar',
      checkoutPixTitle: 'Pago Instantáneo vía Pix',
      checkoutIntlTitle: 'Pago Seguro Internacional',
      scanPixPrompt: 'Escanea el código QR con tu app bancaria',
      pixCopyPasteLabel: 'Pix Copia y Pega',
      changeMethodBtn: 'Cambiar método de pago',
      doneBtn: 'Finalizar',
      verifyPixBtn: 'Verificar Pago Pix',
      pixConfirmedMsg: '¡Pago Pix confirmado! Tu suscripción ha sido activada.',
      pixPendingMsg: 'Pago Pix pendiente de confirmación. Complétalo en tu banco y pulsa Verificar.',
      localCurrencyLabel: 'Moneda local',
      billingCycleLabel: 'Ciclo de facturación',
      monthlyLabel: 'Mensual',
      annualLabel: 'Anual (-20%)',
      paymentMethodsLabel: 'Métodos de pago',
      receiptEmailLabel: 'Email para comprobante (opcional)',
      subtotalLabel: 'Subtotal del plan',
      regionalTaxesFallback: 'Impuestos regionales',
      processingFeeLabel: 'Comisión de procesamiento',
      finalTotalLabel: 'Total final',
      generatePixBtn: 'Generar QR Pix',
      payWithCardBtn: 'Pagar con Tarjeta',
      statusLabels: {
        active: 'Activa',
        trialing: 'En prueba',
        past_due: 'Pago pendiente',
        grace_period: 'Período de gracia (7 días)',
        canceled: 'Cancelada',
        expired: 'Caducada (solo lectura para nuevos registros)',
      },
    },
    analyticsUi: {
      title: 'Analítica de Flota · Costes y Cargas',
      subtitle: 'Comparativa de coches y motos: mantenimiento preventivo, recargas y TCO en',
      scopeAll: 'Todos',
      scopeCars: 'Coches',
      scopeMotos: 'Motos',
      scopeActive: 'Activo',
      kpiMaintenance: 'Total Mantenimiento (Flota)',
      kpiCharging: 'Total Recargas EV',
      kpiEnergy: 'Energía Acumulada',
      chartVehicleTitle: 'Coste Total por Vehículo',
      chartTrendTitle: 'Tendencia Cronológica: Costes y Energía (kWh)',
      emptyTrend: 'Sin registros de mantenimiento ni carga para este filtro.',
      legendMaintenance: 'Mantenimiento',
      legendCharging: 'Carga EV',
      legendChargingCost: 'Coste Carga',
      legendEnergy: 'Energía (kWh)',
    },
    carbonUi: {
      title: 'Huella de Carbono Mensual y Ahorro EV',
      subtitle: 'Cálculo de CO₂e según historial de kilometraje, uso mensual y propulsión',
      gridBrazil: 'Red Renovable (95 gCO₂/kWh)',
      gridGlobal: 'Media Global (280 gCO₂/kWh)',
      kpiMonthlyCo2: 'Huella Mensual Actual',
      kpiEstMonthDist: '/mes estimados',
      kpiAvoidedCo2: 'CO₂ Evitado (Eléctricos / Híbridos)',
      kpiAvoided6m: 'kg evitados en 6 meses',
      kpiReduction: 'Reducción frente a Combustión',
      kpiTreesYear: 'árboles/año equivalentes',
      kpiIntensity: 'Intensidad Media de Flota',
      kpiEvTarget: 'Referencia EV: < 25 g/km',
      chartEvolutionTitle: 'Evolución 6 Meses: Emisión Real vs CO₂ Evitado (kg CO₂)',
      chartPerVehicleTitle: 'Huella Mensual vs Ahorro EV por Vehículo (kg CO₂/mes)',
      tooltipReal: 'Emisión Real:',
      tooltipAvoided: 'CO₂ Evitado (EV/Híbrido):',
      tooltipBaseline: 'Base 100% Combustión:',
      tooltipMonthlyDist: 'Uso mensual:',
      legendReal: 'Emisión Real (kg)',
      legendAvoided: 'Ahorro EV / Híbrido (kg)',
      legendBaseline: 'Referencia 100% Combustión',
      legendActualVehicle: 'Emisión Actual (kg)',
      legendSavingsVehicle: 'Ahorro EV/Híbrido (kg)',
      simPrefix: 'Simulador de Electrificación:',
      simMiddle: 'Sustituir',
      simMiddle2: 'por un modelo 100% eléctrico reduciría',
      simTrees: 'árboles/año equivalentes',
      simAllEvTitle: 'Flota 100% Eléctrica en este filtro:',
      simAllEvSuffix: 'de reducción frente a equivalentes de gasolina.',
      powertrainLabels: {
        electric: 'Eléctrico',
        hybrid: 'Híbrido',
        diesel: 'Diésel',
        combustion: 'Combustión',
      },
    },
    teamUi: {
      disconnectedTitle: 'Empresa y Equipo de Conductores',
      disconnectedDesc: 'Conéctate a la nube para registrar tu empresa, invitar conductores con permisos granulares y aislar los vehículos de tu organización.',
      connectBtn: 'Conectar Cuenta Empresarial',
      title: 'Estructura Empresarial y Responsables de Flota',
      isolatedNote: 'Datos aislados por empresa (ninguna organización accede a vehículos ni documentos de otra).',
      teamCountLabel: 'Equipo:',
      companyNameLabel: 'Razón Social / Nombre de Empresa',
      companyPlaceholder: 'Ej.: Transportes Ibérica S.L.',
      taxIdLabel: 'CIF / NIF / VAT / EIN',
      taxIdPlaceholder: 'Documento fiscal',
      saveBtn: 'Guardar',
      savedBtn: '✓ Guardado',
      inviteTitle: 'Invitar Conductor / Responsable',
      namePlaceholder: 'Nombre completo',
      emailPlaceholder: 'conductor@empresa.com',
      inviteBtn: 'Invitar Miembro',
      statusActive: 'Activo',
      statusPending: 'Invitación pendiente',
      statusRevoked: 'Revocado',
      reactivateBtn: 'Reactivar',
      suspendBtn: 'Suspender',
      removeMemberAria: 'Eliminar miembro',
      limitReachedMsg: 'Límite de miembros alcanzado en tu plan actual. Mejora el plan para añadir más usuarios.',
      inviteSuccessMsg: 'Invitación registrada con permisos personalizados.',
      roles: {
        admin: 'Administrador',
        fleet_manager: 'Gestor de Flota',
        driver: 'Conductor / Responsable',
        viewer: 'Auditor / Lectura',
      },
      permissions: {
        canViewVehicles: 'Ver vehículos',
        canEditVehicles: 'Editar flota',
        canLogMaintenance: 'Registrar mantenim.',
        canViewExpenses: 'Ver gastos',
        canManageTeam: 'Gestionar equipo',
      },
    },
    adminUi: {
      title: 'Panel Admin — Gestión de Planes',
      subtitlePrefix: 'Acceso exclusivo para',
      subtitleSuffix: 'Activa planes VIP, flotas o cortesías en 1 clic.',
      refreshBtn: 'Actualizar cuentas',
      sqlSetupTitle: 'Activación única en SQL Editor de Supabase',
      sqlSetupDesc: 'Ejecuta este SQL una sola vez en el SQL Editor de Supabase para habilitar el listado y concesión de planes.',
      copySqlBtn: 'Copiar SQL único',
      copiedSqlBtn: 'SQL copiado',
      grantTitle: 'Activar o Cambiar Plan por Email',
      emailLabel: 'Email de la cuenta',
      planLabel: 'Plan a activar',
      durationLabel: 'Duración',
      grantHint: 'La persona debe haber iniciado sesión al menos una vez para aparecer abajo.',
      grantBtn: 'Activar Plan Ahora',
      accountsTitle: 'Cuentas Registradas',
      searchPlaceholder: 'Buscar por email o nombre...',
      loading: 'Cargando cuentas...',
      emptyNeedSql: 'Ejecuta el SQL superior en Supabase y pulsa Actualizar cuentas.',
      emptyNoMatch: 'No se encontraron cuentas.',
      noExpiry: 'Sin caducidad',
      selectBtn: 'Seleccionar',
      grantEnterpriseBtn: 'Activar Enterprise (1 año)',
      planLabelPrefix: 'Plan:',
      statusLabelPrefix: 'Estado:',
      vehiclesLabel: 'vehículo(s)',
      expiryLabelPrefix: 'Caduca:',
    },
    pdfUi: {
      headerSubtitle: 'Informe Final Completo del Vehículo',
      footerRight: 'Documento generado el',
      pageLabel: 'Página',
      ofLabel: 'de',
      vehicleLabel: 'Vehículo',
      plateLabel: 'Matrícula',
      yearLabel: 'Año',
      odometerLabel: 'Kilometraje',
      powertrainLabel: 'Motorización',
      colorLabel: 'Color',
      ownerLabel: 'Propietario / Cuenta',
      issuedLabel: 'Emisión',
      docExpiryLabel: 'ITV / Permiso',
      insExpiryLabel: 'Seguro',
      notInformed: 'No especificado',
      summaryEvents: 'Total de Eventos',
      summaryMaintenances: 'Mantenimientos',
      summaryPhotos: 'Fotos / Facturas',
      summaryTotal: 'Inversión Total',
      timelineTitle: 'Línea Temporal Completa (Servicios, Cargas y Facturas)',
      emptyTimeline: 'Aún no hay registros históricos para este vehículo.',
      colDate: 'Fecha',
      colCategory: 'Tipo',
      colTitle: 'Descripción',
      colKm: 'Kilometraje',
      colWorkshop: 'Lugar',
      colCost: 'Importe',
      preventiveTitle: 'Estado Preventivo Actual',
      colItem: 'Elemento',
      colStatus: 'Estado',
      colLastRecord: 'Último Registro',
      colNextDue: 'Próxima Previsión',
      photosSectionTitle: 'Facturas, Recibos y Documentos Adjuntos',
      filenamePrefix: 'Informe-AutoLife',
      timelineBadges: {
        evCharge: 'Carga EV',
        photoPrefix: 'Adjunto:',
      },
    },
  },
  de: {
    localeTag: 'de-DE',
    header: { addShort: 'Neu' },
    sidebar: {
      noVehicles: 'Kein Fahrzeug erfasst',
      add: 'Hinzufügen',
      remove: 'Entfernen',
      removeTitle: 'Fahrzeug und gesamte Historie entfernen',
    },
    pwa: {
      offlineBadge: 'Offline-Modus — Lokale Daten aktiv',
      installBtn: 'App installieren (PWA)',
      installTitle: 'AutoLife World auf dem Gerät installieren',
      installedOk: 'App installiert',
      iosTitle: 'Auf iPhone installieren',
      iosDesc: 'Tippen Sie in Safari auf Teilen und dann auf „Zum Home-Bildschirm“.',
      iosStep1: '1. Tippen Sie auf das Teilen-Symbol unten in Safari.',
      iosStep2: '2. Scrollen Sie und wählen Sie „Zum Home-Bildschirm“.',
      iosStep3: '3. Bestätigen Sie oben rechts mit „Hinzufügen“.',
      gotIt: 'Verstanden',
    },
    app: {
      mapsQuotaMsg: 'Temporäres Demo-Kontingent für Google Maps erreicht.',
      mapsQuotaLink: 'Eigenen API-Schlüssel einrichten',
      closeNotice: 'Hinweis schließen',
      waBannerTitle: 'Profil vervollständigen (E-Mail + WhatsApp)',
      waBannerDescPrefix: 'Verknüpfte E-Mail:',
      waBannerDefaultAccount: 'Verbundenes Konto',
      waBannerDescSuffix: 'Speichern Sie Ihre WhatsApp-Nummer einmalig, um Berichte und Erinnerungen mit 1 Klick zu senden.',
      waSaveBtn: 'WhatsApp speichern',
      waLaterBtn: 'Später',
      waInvalidError: 'Gültige Nummer mit Ländervorwahl eingeben (z. B. +49 170 1234567).',
      waPlaceholder: 'z. B. +49 170 1234567',
    },
    whatsapp: {
      buttonLabel: 'WhatsApp',
      buttonDefaultTitle: 'An gespeichertes WhatsApp senden',
      invalidError: 'Gültige WhatsApp-Nummer mit Vorwahl eingeben (z. B. +49 170 1234567).',
      connectTitle: 'WhatsApp verknüpfen',
      connectDesc: 'Speichern Sie Ihre Nummer einmalig, um Serviceeinträge, Belege oder Termine direkt an WhatsApp zu senden.',
      inputLabel: 'WhatsApp-Nummer (mit Ländervorwahl)',
      inputPlaceholder: 'z. B. +49 170 1234567',
      cancel: 'Abbrechen',
      saveOnly: 'Speichern',
      saveAndOpen: 'Speichern & Öffnen',
      close: 'Schließen',
    },
    vehicleColors: {
      labels: {
        white: 'Weiß',
        black: 'Schwarz',
        silver: 'Silber',
        gray: 'Grau',
        red: 'Rot',
        blue: 'Blau',
        green: 'Grün',
        yellow: 'Gelb',
        brown: 'Braun',
        orange: 'Orange',
      },
      categoryLabels: {
        electric: 'Elektro / Hybrid',
        motoTrail: 'Reiseenduro / Touring',
        moto: 'Motorrad',
        suv: 'SUV / Geländewagen',
        sedan: 'Pkw',
      },
    },
    modals: {
      addTitle: 'Neues Fahrzeug',
      editTitle: 'Fahrzeug bearbeiten',
      close: 'Schließen',
      cancel: 'Abbrechen',
      saveVehicle: 'Fahrzeug speichern',
      saveChanges: 'Änderungen speichern',
      saveLog: 'Eintrag speichern',
      scanBannerTitle: 'Mit Dokumentfoto ausfüllen (Optional)',
      scanBannerDesc: 'Laden Sie Fahrzeugschein, Zulassungsbescheinigung oder Fahrzeugbrief aus jedem Land hoch, um Marke, Modell, Jahr, Kennzeichen & Farbe automatisch zu erkennen.',
      scanCameraBtn: 'Kamera nutzen',
      scanFileBtn: 'Foto / PDF laden',
      scanning: 'Dokument wird gelesen...',
      scanSuccess: 'Daten erkannt! Felder vor dem Speichern prüfen.',
      scanInvalidFile: 'Bitte ein Foto (JPG/PNG/WEBP) oder PDF auswählen.',
      scanFailed: 'Dokument konnte nicht automatisch gelesen werden. Bitte manuell ausfüllen.',
      planLimitReached: 'Fahrzeuglimit des Tarifs erreicht',
      planLimitExpiredPrefix: 'Ihr Abonnement ist abgelaufen. Vorhandene Fahrzeuge bleiben erhalten, neue Einträge sind gesperrt.',
      planLimitActivePrefix: 'Ihr aktueller Tarif umfasst bis zu',
      planLimitUpgradeBtn: 'Tarife ansehen',
      vehicleKindLabel: 'Fahrzeugtyp',
      vehicleKindCar: 'Auto / SUV / Transporter',
      vehicleKindMoto: 'Motorrad',
      brandLabel: 'Marke',
      brandPlaceholderCar: 'z. B. VW, BMW, Tesla',
      brandPlaceholderMoto: 'z. B. BMW, Honda, Yamaha',
      modelLabel: 'Modell',
      modelPlaceholderCar: 'z. B. Golf, Model 3',
      modelPlaceholderMoto: 'z. B. R 1250 GS, MT-07',
      yearLabel: 'Baujahr',
      plateLabel: 'Kennzeichen',
      colorLabel: 'Fahrzeugfarbe',
      colorSelectedNone: 'Nicht gewählt',
      colorCustomPlaceholder: 'Oder eigene Farbe eingeben (z. B. Mitternachtsblau)',
      powertrainLabel: 'Antrieb',
      displacementLabel: 'Hubraum (ccm)',
      odometerLabel: 'Kilometerstand',
      frontPsiLabel: 'PSI Vorne',
      rearPsiLabel: 'PSI Hinten',
      singlePsiLabel: 'Reifendruck (PSI)',
      weeklyKmLabel: 'Wochenstrecke (km)',
      fleetGroupLabel: 'Kategorie',
      personalGroup: 'Privatnutzung',
      fleetGroup: 'Flotte / Gewerblich',
      licenseDateLabel: 'TÜV / HU Fälligkeit',
      insuranceDateLabel: 'Versicherung Ablauf',
      vinLabel: 'FIN / Fahrgestellnr. (optional)',
      attachDocLabel: 'Dokumentfoto im Privaten Tresor sichern (optional)',
      attachCamera: 'Kamera',
      attachFile: 'Datei',
      deleteTitle: 'Fahrzeug & Historie löschen?',
      deleteConfirmBtn: 'Endgültig löschen',
      deleteDescPrefix: 'Dadurch werden Fahrzeug und alle verknüpften Daten endgültig gelöscht:',
      deleteLogsLabel: 'Einträge in der Fahrzeugakte',
      deleteChargesLabel: 'Ladevorgänge',
      deleteItemsLabel: 'überwachte Wartungspunkte',
      deleteDocsLabel: 'Dokumente im privaten Tresor',
      deletePermanentNote: 'Entfernt auch synchronisierte Cloud-Daten.',
      logVehicleLabel: 'Aktives Fahrzeug',
      logItemLabel: 'Bauteil / Service',
      logDateLabel: 'Datum',
      logCostLabel: 'Kosten',
      logSelfCheck: 'Eigenprüfung',
    },
    healthUi: {
      emptyTitle: 'Keine Fahrzeuge erfasst',
      emptyDesc: 'Fügen Sie Ihr Auto oder Motorrad hinzu, um Wartungserinnerungen und die komplette Fahrzeugakte zu nutzen.',
      emptyBtn: 'Fahrzeug erfassen',
      statusBadge: {
        pending: 'Wartet auf Einträge',
        excellent: 'Ausgezeichnet',
        good: 'Gut',
        attention: 'Prüfen',
        critical: 'Kritisch',
      },
      tabs: {
        checklist: 'Checkliste & Fristen',
        guides: 'Anleitungen',
        finalReport: 'Abschlussbericht',
      },
      actions: {
        preTrip: 'Abfahrt-Check 60s',
        odometer: 'Kilometerstand',
        tirePsi: 'Reifendruck',
        saveOdometer: 'Aktualisieren',
        clearFilters: 'Filter zurücksetzen',
        registerNow: 'Jetzt erfassen',
        schedule: 'Kalender',
        details: 'Details',
      },
      hero: {
        title: 'Zustand & Wartung',
        recordedOf: 'erfasste Punkte von',
        summaryPending: 'Erfassen Sie den ersten Service, um Erinnerungen zu aktivieren für',
        summaryOverdue: 'Überfällige Wartungen gefunden für',
        summaryAttention: 'Einige Punkte stehen bald an für',
        summaryHealthy: 'Alles im Plan für',
        nextOilLabel: 'Ölwechsel',
        nextRevisionLabel: 'Nächste Inspektion',
        dueToday: 'Heute',
        overdueBy: 'überfällig',
        remaining: 'verbleibend',
      },
      starter: {
        title: 'Präventive Wartung starten',
        desc: 'Erfassen Sie den letzten Ölwechsel oder Service, damit nächste Fristen automatisch berechnet werden.',
        cta: '1. Service erfassen',
      },
      nextSteps: {
        title: 'Prioritäre Nächste Schritte',
        subtitle: 'Punkte, die zuerst geprüft werden sollten:',
        allGood: 'Derzeit keine dringenden Aufgaben.',
      },
      groups: {
        safety: 'Sicherheit',
        engine: 'Motor & Antrieb',
        docs: 'Dokumente & Fristen',
      },
      card: {
        cycleDetails: 'Details',
        cycleUsage: 'Zyklus-Nutzung',
        everyDaysOrKm: 'Alle',
        safetyNote: 'Sicherheitshinweis',
        intervalLabel: 'Zyklus:',
        dueLabel: 'Fällig:',
        sendWhatsappTitle: 'Per WhatsApp senden',
        addCalendarTitle: 'Kalenderdatei (.ics) laden',
        askMechanicTitle: 'KI-Mechaniker fragen',
      },
      guides: {
        scopeAll: 'Alle',
        scopeCar: 'Auto',
        scopeMoto: 'Motorrad',
        emptyFilter: 'Keine Anleitungen für diesen Filter.',
        tipPrefix: 'Sicherheitsregel:',
      },
      preTrip: {
        title: '60s Abfahrt-Checkliste',
        subtitle: 'Schnelle Sichtprüfung vor längeren Fahrten.',
        distanceLabel: 'Fahrstrecke',
        loadLabel: 'Beladung',
        soloOption: 'Nur Fahrer',
        heavyMotoOption: 'Sozius / Gepäck (+3 PSI hinten)',
        normalCarOption: 'Normale Beladung',
        heavyCarOption: 'Voll beladen (+3 PSI)',
        verifiedOf: 'geprüft',
        sendWa: 'Per WhatsApp senden',
        readyBtn: 'Startklar',
        items: {
          tires: 'Kalten Reifendruck prüfen (inkl. Reserverad)',
          oil: 'Motorölstand auf ebener Fläche kontrollieren',
          coolant: 'Kühlmittelstand von außen prüfen (Motor kalt)',
          lights: 'Scheinwerfer, Blinker und Bremslicht testen',
          chainOrSpare: 'Kettenspannung/-fettung prüfen (bzw. Bordwerkzeug)',
          brakes: 'Bremsdruck & DOT4-Stand kontrollieren',
          docs: 'Fahrzeugschein, Versicherung & Warnweste/Helm prüfen',
        },
      },
      drivingProfiles: {
        city: 'Stadtverkehr',
        highway: 'Autobahn',
        mixed: 'Gemischt',
        severe: 'Erschwert / Gewerbe',
      },
    },
    garageUi: {
      emptyTitle: 'Ihre Garage ist leer',
      emptyDesc: 'Legen Sie Ihr erstes Fahrzeug an, um die digitale Fahrzeugakte, Kosten (TCO) und den QR-Pass zu nutzen.',
      emptyBtn: 'Erstes Fahrzeug anlegen',
      bannerTitle: 'Fahrzeuge, Dokumente & Digitaler Pass',
      bannerDesc: 'Wählen Sie ein Fahrzeug für die vollständige Akte, QR-Code oder Bearbeitung.',
      kpi: {
        vehicles: 'Fahrzeuge',
        weeklyKm: 'Wochenstrecke',
        tco: 'Gesamtkosten (TCO)',
        costPerKm: 'Kosten / km',
        pendingDocs: 'Ablaufende Dok.',
      },
      actions: {
        medical: 'Fahrzeugakte',
        passport: 'Pass + QR',
        edit: 'Bearbeiten',
        remove: 'Entfernen',
      },
      fleet: {
        title: 'Unternehmensflotte & Multi-Fahrzeug',
        subtitle: 'Zentrale Übersicht nach Fahrer, Einsatzprofil, Kosten und Wartungsstatus.',
        gateTitle: 'Flotten-Dashboard',
        gateDesc: 'Verwalten Sie mehrere Fahrzeuge, Fahrerrollen und Berichte mit unseren Flottentarifen.',
        gateBtn: 'Flottentarife ansehen',
        searchPlaceholder: 'Suche nach Kennzeichen, Marke, Modell oder Fahrer...',
        filterAll: 'Alle',
        filterCars: 'Autos',
        filterMotos: 'Motorräder',
        filterPersonal: 'Privat',
        filterFleet: 'Flotte',
        colVehicle: 'Fahrzeug',
        colPlateColor: 'Kennzeichen & Farbe',
        colDriver: 'Verantwortlich',
        colProfile: 'Profil',
        colOdometer: 'Kilometer',
        colStatus: 'Status',
        colCosts: 'TCO Gesamt',
        colActions: 'Aktionen',
        unassigned: 'Nicht zugewiesen',
        noColor: 'Keine Farbe',
        statusOk: 'Im Plan',
        statusAttention: 'Prüfen',
        statusOverdue: 'Überfällig',
        statusPending: 'Offen',
        showingCount: 'angezeigt',
      },
      specs: {
        colorLabel: 'Fahrzeugfarbe',
        notInformed: 'Nicht angegeben',
        profileLabel: 'Nutzungsprofil',
        weeklyAvgLabel: 'Wochenmittel',
        accumulatedTco: 'Kumulierte Kosten',
        costPerKmLabel: 'Kosten pro km',
        vinLabel: 'FIN / Registrierungsnr.',
        docsNotSet: 'Kein Datum',
      },
    },
    evUi: {
      emptyTitle: 'Keine Fahrzeuge erfasst',
      emptyDesc: 'Fügen Sie ein Elektro-, Hybrid- oder Verbrennerfahrzeug hinzu, um Ladestopps zu planen.',
      emptyBtn: 'Fahrzeug anlegen',
      sendChargeWaTitle: 'Ladevorgang an WhatsApp senden',
    },
    networkUi: {
      mapSearchTerms: {
        workshop: 'Autowerkstatt KFZ Service',
        ev_charger: 'Elektroauto Ladestation',
        tires: 'Reifenservice Achsvermessung',
        fuel: 'Tankstelle',
        dealership: 'Autohaus Vertragshändler',
      },
      geoUnsupported: 'Standortbestimmung wird nicht unterstützt.',
      geoDenied: 'Standortzugriff verweigert.',
      useLocation: 'Meinen Standort nutzen',
      locActive: 'Standort aktiv',
      addPlace: 'Ort hinzufügen',
      searchMapsBtn: 'Auf Google Maps suchen',
      emptyTitle: 'Keine gespeicherten Orte',
      emptyDesc: 'Speichern Sie Ihre Stammwerkstatt oder suchen Sie direkt über Google Maps.',
      addModalTitle: 'Vertrauensort hinzufügen',
      placeName: 'Name des Betriebs',
      placeCategory: 'Kategorie',
      placeCity: 'Stadt / Region',
      placeAddress: 'Adresse',
      placePhone: 'Telefon / WhatsApp',
      placeNotes: 'Notizen (optional)',
      savePlace: 'Speichern',
      removePlace: 'Entfernen',
      openMaps: 'Maps',
      kmAway: 'entfernt',
    },
    settingsUi: {
      accountTitle: 'Konto & Cloud-Sync',
      accountSubtitle: 'Synchronisieren Sie Garage, Fahrzeugakte, Belege und Tarife geräteübergreifend.',
      connectedBadge: 'Verbunden',
      localOnlyBadge: 'Nur lokal',
      syncGarageBtn: 'Garage synchronisieren',
      syncingBtn: 'Synchronisiere...',
      syncedMsg: 'Mit der Cloud synchronisiert!',
      signOutBtn: 'Abmelden',
      authOAuthHint: 'Mit 1 Klick anmelden:',
      continueWith: 'Weiter mit',
      signInTab: 'Anmelden',
      signUpTab: 'Registrieren',
      emailLabel: 'E-Mail',
      passwordLabel: 'Passwort',
      signInBtn: 'Anmelden',
      signUpBtn: 'Konto erstellen',
      authRequiredTitle: 'Konto für sichere Synchronisierung verbinden',
      authSuccessSignIn: 'Angemeldet! Lade Fahrzeuge aus der Cloud...',
      authSuccessSignUp: 'Konto erstellt! Prüfen Sie ggf. Ihr Postfach.',
      vehiclesTitle: 'Meine Fahrzeuge',
      vehiclesPlanUsage: 'Tarif:',
      upgradePlanBtn: 'Tarife ansehen',
      addVehicleBtn: 'Fahrzeug hinzufügen',
      activeBadge: 'Aktiv',
      selectBtn: 'Auswählen',
      removeBtn: 'Entfernen',
      whatsappTitle: 'Gespeichertes WhatsApp',
      whatsappDesc: 'Berichte, Fahrzeugdaten und Warnungen mit 1 Klick senden.',
      whatsappSavedBadge: 'Gespeichert',
      whatsappSaveBtn: 'Speichern',
      whatsappSavedMsg: 'WhatsApp gespeichert!',
      whatsappInvalidMsg: 'Ungültige Nummer. Bitte mit Vorwahl eingeben.',
      regionCountryLabel: 'Abrechnungsland / Region',
      regionCurrencyLabel: 'Lokale Währung',
      regionAutoBtn: 'Automatisch',
      regionAutoApplied: 'Sprache, Land und Währung automatisch an Ihre Region angepasst.',
      pushTitle: 'Hintergrund-Push-Benachrichtigungen',
      pushDesc: 'Erinnerungen für Öl, Reifen und TÜV auch bei geschlossenem Browser erhalten.',
      pushSupported: 'Unterstützt',
      pushUnsupported: 'Browser unterstützt kein Push',
      pushEnableBtn: 'Push aktivieren',
      pushDisableBtn: 'Push deaktivieren',
      pushTestBtn: 'Test-Push senden',
      pushEnabledMsg: 'Push aktiviert!',
      pushDisabledMsg: 'Push deaktiviert.',
      pushVapidActive: 'Persistentes VAPID aktiv',
      remindersSavedHint: 'Einstellungen werden automatisch lokal und in der Cloud gespeichert.',
    },
    medicalUi: {
      title: 'Digitale Fahrzeugakte',
      subtitle: 'Komplette Historie aus Wartungen, Inspektionen, Tanken, Belegen und Erinnerungen.',
      addRecordBtn: 'Neuer Eintrag',
      exportPdfBtn: 'PDF-Bericht',
      generatingPdf: 'PDF wird erstellt...',
      summaryRecords: 'Einträge',
      summaryTotalInvested: 'Investiert',
      summaryPhotos: 'Belege / Fotos',
      radarTitle: 'Intelligentes Fristen-Radar',
      radarUrgentOnly: 'Offen / Dringend',
      radarAll: 'Alle',
      radarShow: 'Radar anzeigen',
      radarHide: 'Ausblenden',
      radarAllClear: 'Alle Wartungen im Plan!',
      radarCompleteBtn: 'Erledigen',
      radarWaiting: 'Wartet auf 1. Eintrag',
      radarOverdue: 'Überfällig',
      radarDueSoon: 'Bald fällig',
      radarOnTrack: 'Im Plan',
      radarNoDate: 'Kein Datum',
      radarNoDateHint: 'Ablaufdatum erfassen, um Warnungen zu aktivieren',
      radarDueIn: 'Fällig in',
      radarOverdueByDays: 'überfällig',
      radarOverdueByKm: 'überschritten',
      radarSuggestedCycle: 'Empfohlener Zyklus:',
      radarImmediate: 'Sofortige Prüfung empfohlen',
      dossierTitle: 'Fahrzeugakte & Bericht teilen',
      dossierDesc: 'Vollständiges Dossier mit Fotos, Kosten und Historie per WhatsApp oder E-Mail senden.',
      dossierWhatsappBtn: 'Per WhatsApp',
      dossierEmailBtn: 'Per E-Mail',
      dossierCopyBtn: 'Text kopieren',
      dossierCopied: 'Kopiert!',
      timelineSearchPlaceholder: 'Nach Service, Werkstatt, Notiz oder Datum suchen...',
      filterAll: 'Alle',
      filterMaintenance: 'Wartung',
      filterFuel: 'Tanken',
      filterEv: 'Laden',
      filterExpense: 'Ausgaben / Dok.',
      noTimelineEntries: 'Keine Einträge für diesen Filter.',
      workshopLabel: 'Werkstatt / Ort:',
      photoCameraBtn: 'Belegfoto',
      photoCameraTitle: 'Foto aufnehmen',
      photoGalleryTitle: 'Aus Galerie wählen',
      viewBtn: 'Ansehen',
      downloadBtn: 'Laden',
      deleteAttAria: 'Beleg löschen',
      modalCreateTitle: 'Neuer Eintrag in der Fahrzeugakte',
      modalCompleteReminderTitle: 'Erinnerung abschließen & erfassen',
      modalAutoCycleNote: 'Aktualisiert automatisch den nächsten Zyklus',
      kindMaintenance: 'Wartung',
      kindRevision: 'Inspektion',
      kindFuel: 'Tanken',
      kindEvCharge: 'EV Laden',
      kindExpense: 'Ausgabe',
      categoryLabel: 'System / Kategorie',
      dateLabel: 'Datum',
      kmLabel: 'Km',
      energyKwhLabel: 'Energie (kWh)',
      powerTypeLabel: 'Typ',
      socStartLabel: 'Start-SoC %',
      socEndLabel: 'End-SoC %',
      whatWasDoneLabel: 'Durchgeführte Arbeiten',
      placeholderFuel: 'Beschreibung des Tankvorgangs',
      placeholderRevision: 'Inspektionsdetails',
      placeholderExpense: 'Ausgabe oder Versicherung',
      placeholderMaint: 'Durchgeführte Wartung',
      placeLabelStation: 'Tankstelle',
      placeLabelCharger: 'Ladestation',
      placeLabelWorkshop: 'Werkstatt / Anbieter',
      placePhStation: 'Name der Tankstelle',
      placePhCharger: 'Name der Ladestation',
      placePhWorkshop: 'Werkstatt oder Eigenleistung',
      amountLabel: 'Betrag',
      notesLabel: 'Notizen',
      notesPlaceholder: 'Teile, Garantie, Details...',
      attachSectionTitle: 'Foto von Rechnung, Beleg, Versicherung oder TÜV (JPG ≤ 2 MB, privat)',
      takePhotoBtn: 'Foto aufnehmen',
      galleryBtn: 'Galerie',
      saveRecordBtn: 'Eintrag speichern',
      attachmentCategories: {
        receipt: 'Werkstattrechnung / Beleg',
        insurance: 'Versicherung',
        document: 'TÜV / Zulassung',
        vehicle_photo: 'Fahrzeugfoto',
        inspection: 'Prüfung / Bauteil',
        diagnostic: 'Diagnose / Bericht',
      },
      monthNames: [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
      ],
      otherRecordsHeading: 'Weitere Einträge',
    },
    finalReportUi: {
      headerBadge: 'Abschlussbericht & Gesamtdossier',
      headerSubtitle: 'Konsolidierte Chronologie, Belege, aktueller Wartungsstatus und PDF-Export.',
      sortOldest: 'Älteste zuerst',
      sortNewest: 'Neueste zuerst',
      downloadPdfBtn: 'Vollständiges PDF laden',
      sendWaPdfBtn: 'Per WhatsApp senden',
      sendEmailBtn: 'Per E-Mail senden',
      printBtn: 'Drucken',
      kpiEvents: 'Ereignisse',
      kpiMaintenances: 'Wartungen',
      kpiPhotosDocs: 'Fotos & Dok.',
      kpiTotalInvested: 'Gesamtinvestition',
      quickSendWaLabel: 'Ziel-WhatsApp',
      quickSendEmailLabel: 'Ziel-E-Mail',
      timelineTitle: 'Vollständige Chronologie',
      timelineEmpty: 'Keine Einträge für diesen Filter.',
      galleryTitle: 'Privater Tresor: Belege & Fotos',
      galleryEmpty: 'Noch keine Fotos oder Dokumente vorhanden.',
      galleryConnectHint: 'Melden Sie sich unter Einstellungen an, um private Fotos hochzuladen.',
      uploadCategoryLabel: 'Dokumenttyp',
      uploadNotesPlaceholder: 'Optionale Notiz',
      snapshotTitle: 'Präventiver Status bei Erstellung',
      snapshotColItem: 'Punkt',
      snapshotColStatus: 'Status',
      snapshotColLast: 'Letzter Eintrag',
      snapshotColNext: 'Nächste Fälligkeit',
      openBtn: 'Öffnen',
      downloadBtn: 'Laden',
      deleteAria: 'Anhang löschen',
      pdfGeneratedMsg: 'PDF erstellt mit',
      pdfSharedMsg: 'PDF geteilt mit',
      pdfErrorMsg: 'PDF konnte nicht erstellt werden.',
      photoSavedMsg: 'Anhang im Bericht gespeichert.',
    },
    passportUi: {
      badge: 'AutoLife World · Digitaler Fahrzeugpass',
      plateLabel: 'Kennzeichen:',
      kpiOnTrack: 'Punkte im Plan',
      kpiVerifiedLogs: 'Verifizierte Einträge',
      kpiInvestment: 'Investition',
      kpiIssuedAt: 'Ausgestellt',
      qrPublicLabel: 'Öffentlicher QR-Code',
      qrAuthTitle: 'Autorisierte QR-Freigabe',
      linkActiveRevoke: 'Link aktiv (Widerrufen)',
      linkRevokedReactivate: 'Link widerrufen (Reaktivieren)',
      includeExpenses: 'Kostenbeträge anzeigen',
      includeDocuments: 'Dokumentliste anzeigen',
      copyBtn: 'Kopieren',
      copiedBtn: 'Kopiert',
      signInHint: 'Melden Sie sich unter Einstellungen an, um einen jederzeit widerrufbaren Prüf-Link zu aktivieren.',
      updatingPassport: 'Aktualisiere verifizierbaren Fahrzeugpass...',
      odometerTitle: 'Unveränderliche Kilometerhistorie',
      historyTitle: 'Chronologische Wartungshistorie',
      emptyHistory: 'Noch keine Serviceeinträge vorhanden.',
      sendWaBtn: 'Pass per WhatsApp senden',
      printPdfBtn: 'Drucken / Als PDF speichern',
      publicBadge: 'AutoLife World · Verifizierte Abfrage',
      openAppBtn: 'App öffnen',
      verifying: 'Prüfe Digitalen Fahrzeugpass...',
      unavailableTitle: 'Fahrzeugpass nicht verfügbar',
      unavailableDesc: 'Dieser Link existiert nicht, ist abgelaufen oder wurde vom Eigentümer widerrufen.',
      authenticatedBadge: 'Authentifizierter Digitaler Pass',
      currentOdometer: 'Kilometerstand:',
      preventiveHealth: 'Wartungszustand',
      onTrackSuffix: 'im Plan',
      odometerMarksTitle: 'Kilometer-Einträge',
      marksSuffix: 'Punkte',
      updatedAt: 'Aktualisiert am',
      maintHistoryTitle: 'Wartungshistorie',
      noPublicServices: 'Keine öffentlichen Serviceeinträge.',
      verifiedDocsTitle: 'Geprüfte Dokumente',
    },
    vaultUi: {
      title: 'Belege, Rechnungen & Dokumente (Privat)',
      subtitlePrefix: 'Rechnungen, Versicherung & TÜV für',
      subtitleSuffix: '· JPG-Komprimierung ≤ 2 MB mit privatem Zugriff.',
      connectAccountBtn: 'Konto verbinden',
      unavailable: 'Privater Tresor derzeit nicht verfügbar.',
      signInPromptPrefix: 'Melden Sie sich unter',
      signInPromptBtn: 'Einstellungen → Konto & Cloud',
      signInPromptSuffix: 'an, um Rechnungen und Dokumente sicher privat abzulegen.',
      typeLabel: 'Dokumenttyp',
      dateLabel: 'Datum',
      notesLabel: 'Notiz (optional)',
      notesPlaceholder: 'Details zur Rechnung oder Urkunde',
      takePhotoBtn: 'Foto aufnehmen',
      galleryBtn: 'Galerie',
      loading: 'Lade private Dateien...',
      empty: 'Noch keine Belege gespeichert. Fotos werden automatisch als JPG ≤ 2 MB komprimiert.',
      expiredLink: 'Link abgelaufen',
      viewBtn: 'Ansehen',
      downloadBtn: 'Laden',
      sendWaTitle: 'Dokument per WhatsApp senden',
      deleteAria: 'Datei löschen',
      uploadSuccess: 'privat gespeichert.',
      uploadError: 'Fehler beim Hochladen.',
      loadError: 'Dateien konnten nicht geladen werden.',
    },
    plansUi: {
      subtitle: 'Regionale Preise nach Land & lokaler Währung',
      sourceDb: 'Datenbank-Katalog',
      sourceFallback: 'offizielle Preistabelle',
      monthly: 'Monatlich',
      annualDiscount: 'Jährlich (-20%)',
      currentHeader: 'Aktuelles Abonnement & Limit',
      vehicleUnit: 'Fahrzeug(e)',
      neverDeletedNote: 'Ihre Fahrzeuge und Historien werden bei Ablauf oder Kündigung niemals gelöscht.',
      dueLabel: 'Laufzeit bis:',
      autoRenewLabel: 'Auto-Verlängerung:',
      on: 'Ein',
      off: 'Aus',
      cancelSubBtn: 'Abo kündigen',
      graceWarningPrefix: 'Kulanzfrist bis',
      graceWarningSuffix: 'Bitte Zahlung aktualisieren, um neue Fahrzeuge hinzuzufügen.',
      paymentHistoryTitle: 'Zahlungshistorie',
      currentPlanBadge: 'Aktueller Tarif',
      activeBadge: 'Aktiv',
      perMonth: '/ Monat',
      estFee: 'Gebühr ca.',
      upToVehicles: 'Bis zu',
      over100Vehicles: 'Über 100 Fahrzeuge',
      fromPrice: 'Ab',
      renewSwitchCurrency: 'Verlängern / Währung ändern',
      subscribePersonal: 'Privat-Tarif wählen',
      contactB2b: 'B2B-Beratung kontaktieren',
      manageRenew: 'Verwalten / Verlängern',
      subscribePlan: 'Auswählen',
      checkoutPixTitle: 'Sofortzahlung via Pix',
      checkoutIntlTitle: 'Sicherer Global-Checkout',
      scanPixPrompt: 'QR-Code in Ihrer Banking-App scannen',
      pixCopyPasteLabel: 'Pix-Code kopieren',
      changeMethodBtn: 'Zahlungsart ändern',
      doneBtn: 'Fertig',
      verifyPixBtn: 'Pix-Zahlung prüfen',
      pixConfirmedMsg: 'Pix bestätigt! Ihr Tarif ist jetzt aktiv.',
      pixPendingMsg: 'Zahlung steht noch aus. In der App abschließen und erneut prüfen.',
      localCurrencyLabel: 'Währung',
      billingCycleLabel: 'Abrechnungszyklus',
      monthlyLabel: 'Monatlich',
      annualLabel: 'Jährlich (-20%)',
      paymentMethodsLabel: 'Zahlungsarten',
      receiptEmailLabel: 'Beleg-E-Mail (optional)',
      subtotalLabel: 'Zwischensumme',
      regionalTaxesFallback: 'Regionale Steuern',
      processingFeeLabel: 'Bearbeitungsgebühr',
      finalTotalLabel: 'Gesamtbetrag',
      generatePixBtn: 'Pix-QR erzeugen',
      payWithCardBtn: 'Mit Karte zahlen',
      statusLabels: {
        active: 'Aktiv',
        trialing: 'Testphase',
        past_due: 'Zahlung ausstehend',
        grace_period: 'Kulanzfrist (7 Tage)',
        canceled: 'Gekündigt',
        expired: 'Abgelaufen (Schreibschutz)',
      },
    },
    analyticsUi: {
      title: 'Flotten-Analytik · Kosten & Laden',
      subtitle: 'Vergleich von Autos & Motorrädern: Wartung, Ladekosten und TCO in',
      scopeAll: 'Alle',
      scopeCars: 'Autos',
      scopeMotos: 'Motorräder',
      scopeActive: 'Aktiv',
      kpiMaintenance: 'Wartungskosten (Flotte)',
      kpiCharging: 'EV-Ladekosten gesamt',
      kpiEnergy: 'Geladene Energie',
      chartVehicleTitle: 'Gesamtkosten pro Fahrzeug',
      chartTrendTitle: 'Zeitverlauf: Kosten & Energie (kWh)',
      emptyTrend: 'Keine Einträge für diesen Filter.',
      legendMaintenance: 'Wartung',
      legendCharging: 'EV-Laden',
      legendChargingCost: 'Ladekosten',
      legendEnergy: 'Energie (kWh)',
    },
    carbonUi: {
      title: 'Monatlicher CO₂-Fußabdruck & EV-Einsparung',
      subtitle: 'CO₂e-Schätzung anhand Kilometerhistorie, Monatsleistung und Antriebsart',
      gridBrazil: 'Erneuerbarer Strommix (95 gCO₂/kWh)',
      gridGlobal: 'Globaler Strommix (280 gCO₂/kWh)',
      kpiMonthlyCo2: 'Aktueller Monatswert',
      kpiEstMonthDist: '/Monat geschätzt',
      kpiAvoidedCo2: 'Eingespartes CO₂ (EV / Hybrid)',
      kpiAvoided6m: 'kg in 6 Monaten gespart',
      kpiReduction: 'Reduktion vs. Verbrenner',
      kpiTreesYear: 'Bäume/Jahr Äquivalent',
      kpiIntensity: 'Flotten-Intensität',
      kpiEvTarget: 'EV-Richtwert: < 25 g/km',
      chartEvolutionTitle: '6-Monats-Verlauf: Emissionen vs. EV-Einsparung (kg CO₂)',
      chartPerVehicleTitle: 'Monatsemission vs. Einsparung je Fahrzeug (kg CO₂)',
      tooltipReal: 'Aktuelle Emission:',
      tooltipAvoided: 'Eingespartes CO₂:',
      tooltipBaseline: '100% Verbrenner-Basis:',
      tooltipMonthlyDist: 'Monatsstrecke:',
      legendReal: 'Aktuelle Emission (kg)',
      legendAvoided: 'EV / Hybrid Einsparung (kg)',
      legendBaseline: '100% Verbrenner',
      legendActualVehicle: 'Emission (kg)',
      legendSavingsVehicle: 'EV-Einsparung (kg)',
      simPrefix: 'Elektrifizierungs-Simulator:',
      simMiddle: 'Der Ersatz von',
      simMiddle2: 'durch ein reines E-Modell spart zusätzlich',
      simTrees: 'Bäume/Jahr Äquivalent',
      simAllEvTitle: '100% Elektrisch in diesem Filter:',
      simAllEvSuffix: 'CO₂-Reduktion gegenüber Benzinern.',
      powertrainLabels: {
        electric: 'Elektrisch',
        hybrid: 'Hybrid',
        diesel: 'Diesel',
        combustion: 'Verbrenner',
      },
    },
    teamUi: {
      disconnectedTitle: 'Unternehmen & Fahrer-Team',
      disconnectedDesc: 'Melden Sie sich an, um Ihr Unternehmen anzulegen, Fahrer einzuladen und Flottendaten zu trennen.',
      connectBtn: 'Unternehmenskonto verbinden',
      title: 'Unternehmensstruktur & Flotten-Team',
      isolatedNote: 'Strikte Datentrennung je Unternehmen.',
      teamCountLabel: 'Team:',
      companyNameLabel: 'Firmenname',
      companyPlaceholder: 'z. B. Muster Logistik GmbH',
      taxIdLabel: 'USt-IdNr. / Steuernr.',
      taxIdPlaceholder: 'Steuer-ID',
      saveBtn: 'Speichern',
      savedBtn: '✓ Gespeichert',
      inviteTitle: 'Mitarbeiter / Fahrer einladen',
      namePlaceholder: 'Vollständiger Name',
      emailPlaceholder: 'fahrer@firma.de',
      inviteBtn: 'Einladen',
      statusActive: 'Aktiv',
      statusPending: 'Ausstehend',
      statusRevoked: 'Widerrufen',
      reactivateBtn: 'Reaktivieren',
      suspendBtn: 'Sperren',
      removeMemberAria: 'Mitglied entfernen',
      limitReachedMsg: 'Mitgliederlimit im aktuellen Tarif erreicht.',
      inviteSuccessMsg: 'Einladung mit individuellen Rechten gespeichert.',
      roles: {
        admin: 'Administrator',
        fleet_manager: 'Flottenmanager',
        driver: 'Fahrer',
        viewer: 'Prüfer / Lesen',
      },
      permissions: {
        canViewVehicles: 'Fahrzeuge sehen',
        canEditVehicles: 'Flotte bearbeiten',
        canLogMaintenance: 'Wartung erfassen',
        canViewExpenses: 'Kosten sehen',
        canManageTeam: 'Team verwalten',
      },
    },
    adminUi: {
      title: 'Admin-Bereich — Tarifverwaltung',
      subtitlePrefix: 'Exklusiver Zugang für',
      subtitleSuffix: 'VIP- oder Flottentarife mit 1 Klick freischalten.',
      refreshBtn: 'Konten aktualisieren',
      sqlSetupTitle: 'Einmalige SQL-Einrichtung in Supabase',
      sqlSetupDesc: 'Dieses SQL einmal im Supabase SQL Editor ausführen.',
      copySqlBtn: 'SQL kopieren',
      copiedSqlBtn: 'Kopiert',
      grantTitle: 'Tarif per E-Mail freischalten',
      emailLabel: 'Konto-E-Mail',
      planLabel: 'Tarif',
      durationLabel: 'Laufzeit',
      grantHint: 'Der Nutzer muss sich mindestens einmal angemeldet haben.',
      grantBtn: 'Tarif jetzt freischalten',
      accountsTitle: 'Registrierte Konten',
      searchPlaceholder: 'Nach E-Mail oder Name suchen...',
      loading: 'Lade Konten...',
      emptyNeedSql: 'SQL ausführen und Konten aktualisieren.',
      emptyNoMatch: 'Keine Konten gefunden.',
      noExpiry: 'Unbegrenzt',
      selectBtn: 'Auswählen',
      grantEnterpriseBtn: 'Enterprise freischalten (1 Jahr)',
      planLabelPrefix: 'Tarif:',
      statusLabelPrefix: 'Status:',
      vehiclesLabel: 'Fahrzeug(e)',
      expiryLabelPrefix: 'Gültig bis:',
    },
    pdfUi: {
      headerSubtitle: 'Vollständiger Fahrzeug-Abschlussbericht',
      footerRight: 'Erstellt am',
      pageLabel: 'Seite',
      ofLabel: 'von',
      vehicleLabel: 'Fahrzeug',
      plateLabel: 'Kennzeichen',
      yearLabel: 'Baujahr',
      odometerLabel: 'Kilometerstand',
      powertrainLabel: 'Antrieb',
      colorLabel: 'Farbe',
      ownerLabel: 'Eigentümer / Konto',
      issuedLabel: 'Ausgestellt',
      docExpiryLabel: 'TÜV / Zulassung',
      insExpiryLabel: 'Versicherung',
      notInformed: 'Nicht angegeben',
      summaryEvents: 'Ereignisse',
      summaryMaintenances: 'Wartungen',
      summaryPhotos: 'Fotos / Belege',
      summaryTotal: 'Gesamtbetrag',
      timelineTitle: 'Vollständige Chronologie (Wartung, Laden & Belege)',
      emptyTimeline: 'Noch keine Einträge vorhanden.',
      colDate: 'Datum',
      colCategory: 'Typ',
      colTitle: 'Beschreibung',
      colKm: 'Kilometer',
      colWorkshop: 'Ort',
      colCost: 'Betrag',
      preventiveTitle: 'Aktueller Wartungsstatus',
      colItem: 'Punkt',
      colStatus: 'Status',
      colLastRecord: 'Letzter Eintrag',
      colNextDue: 'Nächste Fälligkeit',
      photosSectionTitle: 'Eingebettete Belege & Dokumente',
      filenamePrefix: 'AutoLife-Bericht',
      timelineBadges: {
        evCharge: 'EV-Laden',
        photoPrefix: 'Anhang:',
      },
    },
  },
  fr: {
    localeTag: 'fr-FR',
    header: { addShort: 'Nouveau' },
    sidebar: {
      noVehicles: 'Aucun véhicule enregistré',
      add: 'Ajouter',
      remove: 'Supprimer',
      removeTitle: 'Supprimer le véhicule et tout son historique',
    },
    pwa: {
      offlineBadge: 'Mode Hors Ligne — Données locales actives',
      installBtn: 'Installer l’App (PWA)',
      installTitle: 'Installer AutoLife World sur cet appareil',
      installedOk: 'App installée',
      iosTitle: 'Installer sur iPhone',
      iosDesc: 'Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».',
      iosStep1: '1. Touchez le bouton Partager en bas de Safari.',
      iosStep2: '2. Faites défiler et choisissez « Sur l’écran d’accueil ».',
      iosStep3: '3. Validez en touchant « Ajouter » en haut à droite.',
      gotIt: 'Compris',
    },
    app: {
      mapsQuotaMsg: 'Quota temporaire de démonstration Google Maps atteint.',
      mapsQuotaLink: 'Comment configurer votre propre clé gratuite',
      closeNotice: 'Fermer l’avis',
      waBannerTitle: 'Complétez votre profil (E-mail + WhatsApp)',
      waBannerDescPrefix: 'E-mail associé :',
      waBannerDefaultAccount: 'Compte connecté',
      waBannerDescSuffix: 'Enregistrez votre WhatsApp une fois pour envoyer fiches, factures et rappels en 1 clic.',
      waSaveBtn: 'Enregistrer WhatsApp',
      waLaterBtn: 'Plus tard',
      waInvalidError: 'Saisissez un numéro valide avec indicatif (ex. : +33 6 12 34 56 78).',
      waPlaceholder: 'Ex. : +33 6 12 34 56 78',
    },
    whatsapp: {
      buttonLabel: 'WhatsApp',
      buttonDefaultTitle: 'Envoyer vers le WhatsApp enregistré',
      invalidError: 'Saisissez un WhatsApp valide avec indicatif (ex. : +33 6 12 34 56 78).',
      connectTitle: 'Connecter WhatsApp',
      connectDesc: 'Enregistrez votre numéro une seule fois pour envoyer tout entretien, reçu ou rappel sur WhatsApp.',
      inputLabel: 'Numéro WhatsApp (avec indicatif pays)',
      inputPlaceholder: 'Ex. : +33 6 12 34 56 78',
      cancel: 'Annuler',
      saveOnly: 'Enregistrer',
      saveAndOpen: 'Enregistrer et Ouvrir',
      close: 'Fermer',
    },
    vehicleColors: {
      labels: {
        white: 'Blanc',
        black: 'Noir',
        silver: 'Argent',
        gray: 'Gris',
        red: 'Rouge',
        blue: 'Bleu',
        green: 'Vert',
        yellow: 'Jaune',
        brown: 'Marron',
        orange: 'Orange',
      },
      categoryLabels: {
        electric: 'Électrique / Hybride',
        motoTrail: 'Moto Trail / Routière',
        moto: 'Moto',
        suv: 'SUV / Utilitaire',
        sedan: 'Automobile',
      },
    },
    modals: {
      addTitle: 'Nouveau Véhicule',
      editTitle: 'Modifier le Véhicule',
      close: 'Fermer',
      cancel: 'Annuler',
      saveVehicle: 'Enregistrer le Véhicule',
      saveChanges: 'Enregistrer',
      saveLog: 'Enregistrer',
      scanBannerTitle: 'Remplir avec la photo du document (Optionnel)',
      scanBannerDesc: 'Importez la Carte Grise, certificat d’immatriculation ou titre de tout pays pour remplir marque, modèle, année, plaque et couleur automatiquement.',
      scanCameraBtn: 'Caméra',
      scanFileBtn: 'Photo / PDF',
      scanning: 'Lecture du document...',
      scanSuccess: 'Données extraites ! Vérifiez les champs avant d’enregistrer.',
      scanInvalidFile: 'Sélectionnez une image (JPG/PNG/WEBP) ou un PDF.',
      scanFailed: 'Lecture automatique impossible. Remplissez les champs manuellement.',
      planLimitReached: 'Limite de véhicules atteinte',
      planLimitExpiredPrefix: 'Votre abonnement a expiré. Vos véhicules restent accessibles, mais les ajouts sont bloqués.',
      planLimitActivePrefix: 'Votre offre actuelle permet jusqu’à',
      planLimitUpgradeBtn: 'Voir les Offres',
      vehicleKindLabel: 'Type de véhicule',
      vehicleKindCar: 'Voiture / SUV / Utilitaire',
      vehicleKindMoto: 'Moto / Scooter',
      brandLabel: 'Marque',
      brandPlaceholderCar: 'Ex. : Peugeot, Renault, Tesla',
      brandPlaceholderMoto: 'Ex. : Yamaha, Honda, BMW',
      modelLabel: 'Modèle',
      modelPlaceholderCar: 'Ex. : 3008, Model 3',
      modelPlaceholderMoto: 'Ex. : MT-07, CB 500X',
      yearLabel: 'Année',
      plateLabel: 'Immatriculation',
      colorLabel: 'Couleur du véhicule',
      colorSelectedNone: 'Non sélectionnée',
      colorCustomPlaceholder: 'Ou saisissez une couleur (ex. : Bleu Nuit)',
      powertrainLabel: 'Motorisation',
      displacementLabel: 'Cylindrée (cc)',
      odometerLabel: 'Kilométrage actuel',
      frontPsiLabel: 'PSI Avant',
      rearPsiLabel: 'PSI Arrière',
      singlePsiLabel: 'Pression Pneus (PSI)',
      weeklyKmLabel: 'Usage hebdo (km/sem)',
      fleetGroupLabel: 'Catégorie',
      personalGroup: 'Usage Personnel',
      fleetGroup: 'Flotte / Pro',
      licenseDateLabel: 'Contrôle Technique',
      insuranceDateLabel: 'Échéance Assurance',
      vinLabel: 'Numéro de série / VIN (optionnel)',
      attachDocLabel: 'Sauvegarder la photo dans le Coffre Privé (optionnel)',
      attachCamera: 'Caméra',
      attachFile: 'Fichier',
      deleteTitle: 'Supprimer le véhicule et l’historique ?',
      deleteConfirmBtn: 'Supprimer Définitivement',
      deleteDescPrefix: 'Cette action supprime définitivement ce véhicule et toutes ses données :',
      deleteLogsLabel: 'entrée(s) dans le Carnet Santé',
      deleteChargesLabel: 'recharge(s) électrique(s)',
      deleteItemsLabel: 'points d’entretien suivis',
      deleteDocsLabel: 'document(s) privés',
      deletePermanentNote: 'Supprime également les données synchronisées dans le cloud.',
      logVehicleLabel: 'Véhicule actif',
      logItemLabel: 'Composant / Entretien',
      logDateLabel: 'Date',
      logCostLabel: 'Montant payé',
      logSelfCheck: 'Contrôle Personnel',
    },
    healthUi: {
      emptyTitle: 'Aucun véhicule enregistré',
      emptyDesc: 'Ajoutez votre voiture ou moto pour activer les rappels intelligents et le carnet d’entretien complet.',
      emptyBtn: 'Ajouter Mon Véhicule',
      statusBadge: {
        pending: 'En attente de données',
        excellent: 'Excellent',
        good: 'Bon',
        attention: 'Attention',
        critical: 'Critique',
      },
      tabs: {
        checklist: 'Checklist & Rappels',
        guides: 'Guides Illustrés',
        finalReport: 'Rapport Final',
      },
      actions: {
        preTrip: 'Pré-Trajet 60s',
        odometer: 'Compteur',
        tirePsi: 'Pression',
        saveOdometer: 'Mettre à jour',
        clearFilters: 'Réinitialiser',
        registerNow: 'Enregistrer',
        schedule: 'Agenda',
        details: 'Détails',
      },
      hero: {
        title: 'Santé & Entretien',
        recordedOf: 'éléments suivis sur',
        summaryPending: 'Enregistrez un premier entretien pour activer les alertes de',
        summaryOverdue: 'Entretiens en retard pour',
        summaryAttention: 'Certains éléments arrivent à échéance sur',
        summaryHealthy: 'Tout est à jour pour',
        nextOilLabel: 'Vidange',
        nextRevisionLabel: 'Prochaine révision',
        dueToday: 'Aujourd’hui',
        overdueBy: 'en retard',
        remaining: 'restants',
      },
      starter: {
        title: 'Démarrez le suivi préventif',
        desc: 'Enregistrez votre dernière vidange ou révision pour calculer automatiquement les prochaines échéances.',
        cta: 'Enregistrer 1er Entretien',
      },
      nextSteps: {
        title: 'Prochaines Étapes Prioritaires',
        subtitle: 'Points à vérifier en priorité :',
        allGood: 'Aucune urgence pour le moment.',
      },
      groups: {
        safety: 'Sécurité',
        engine: 'Moteur & Systèmes',
        docs: 'Documents & Échéances',
      },
      card: {
        cycleDetails: 'Détails',
        cycleUsage: 'Cycle utilisé',
        everyDaysOrKm: 'Tous les',
        safetyNote: 'Alerte sécurité',
        intervalLabel: 'Cycle :',
        dueLabel: 'Prévu :',
        sendWhatsappTitle: 'Envoyer sur WhatsApp',
        addCalendarTitle: 'Télécharger rappel (.ics)',
        askMechanicTitle: 'Demander au Mécanicien IA',
      },
      guides: {
        scopeAll: 'Tous',
        scopeCar: 'Voiture',
        scopeMoto: 'Moto',
        emptyFilter: 'Aucun guide pour ce filtre.',
        tipPrefix: 'Règle de sécurité :',
      },
      preTrip: {
        title: 'Checklist Pré-Trajet 60s',
        subtitle: 'Contrôle visuel rapide avant de prendre la route.',
        distanceLabel: 'Distance du trajet',
        loadLabel: 'Charge / Passagers',
        soloOption: 'Pilote seul',
        heavyMotoOption: 'Passager / Top-case (+3 PSI arrière)',
        normalCarOption: 'Charge normale',
        heavyCarOption: 'Véhicule chargé (+3 PSI)',
        verifiedOf: 'vérifiés',
        sendWa: 'Envoyer sur WhatsApp',
        readyBtn: 'Prêt à Partir',
        items: {
          tires: 'Vérifier pression à froid (roue de secours incluse)',
          oil: 'Contrôler niveau d’huile sur sol plat',
          coolant: 'Vérifier le bocal de refroidissement à froid',
          lights: 'Tester feux, clignotants et feux stop',
          chainOrSpare: 'Vérifier tension/graissage chaîne (ou cric/kit)',
          brakes: 'Vérifier fermeté du frein et niveau DOT4',
          docs: 'Vérifier carte grise, assurance et gilet/casque',
        },
      },
      drivingProfiles: {
        city: 'Urbain / Trafic',
        highway: 'Autoroute',
        mixed: 'Usage Mixte',
        severe: 'Sévère / Pro',
      },
    },
    garageUi: {
      emptyTitle: 'Votre garage est vide',
      emptyDesc: 'Ajoutez votre premier véhicule pour gérer son carnet de santé numérique, ses documents, le TCO et son Passeport QR.',
      emptyBtn: 'Ajouter un Véhicule',
      bannerTitle: 'Véhicules, Documents & Passeport Numérique',
      bannerDesc: 'Sélectionnez un véhicule pour ouvrir sa Fiche Santé complète, générer un QR ou modifier les données.',
      kpi: {
        vehicles: 'Véhicules',
        weeklyKm: 'Trajet Hebdo',
        tco: 'Coût Total (TCO)',
        costPerKm: 'Coût Moyen / km',
        pendingDocs: 'Docs. à Renouveler',
      },
      actions: {
        medical: 'Fiche Santé',
        passport: 'Passeport + QR',
        edit: 'Modifier',
        remove: 'Supprimer',
      },
      fleet: {
        title: 'Flotte Pro & Multi-Véhicules',
        subtitle: 'Suivi centralisé par conducteur, profil d’usage, coûts et état préventif.',
        gateTitle: 'Console Flotte Entreprise',
        gateDesc: 'Gérez plusieurs véhicules, conducteurs avec droits et exports consolidés avec nos offres Flotte.',
        gateBtn: 'Voir les Offres Flotte',
        searchPlaceholder: 'Rechercher plaque, marque, modèle ou conducteur...',
        filterAll: 'Tous',
        filterCars: 'Voitures',
        filterMotos: 'Motos',
        filterPersonal: 'Personnels',
        filterFleet: 'Flotte',
        colVehicle: 'Véhicule',
        colPlateColor: 'Plaque & Couleur',
        colDriver: 'Conducteur',
        colProfile: 'Profil',
        colOdometer: 'Compteur',
        colStatus: 'État',
        colCosts: 'TCO Total',
        colActions: 'Actions',
        unassigned: 'Non attribué',
        noColor: 'Couleur non précisée',
        statusOk: 'À jour',
        statusAttention: 'Attention',
        statusOverdue: 'En retard',
        statusPending: 'Non renseigné',
        showingCount: 'affichés',
      },
      specs: {
        colorLabel: 'Couleur du véhicule',
        notInformed: 'Non précisée',
        profileLabel: 'Profil de Sévérité',
        weeklyAvgLabel: 'Moyenne hebdo',
        accumulatedTco: 'TCO cumulé',
        costPerKmLabel: 'Coût par km',
        vinLabel: 'VIN / Numéro de série',
        docsNotSet: 'Date non précisée',
      },
    },
    evUi: {
      emptyTitle: 'Aucun véhicule enregistré',
      emptyDesc: 'Ajoutez un véhicule électrique, hybride ou thermique pour planifier vos recharges.',
      emptyBtn: 'Ajouter un Véhicule',
      sendChargeWaTitle: 'Envoyer la recharge sur WhatsApp',
    },
    networkUi: {
      mapSearchTerms: {
        workshop: 'Garage mécanique automobile',
        ev_charger: 'Borne de recharge véhicule électrique',
        tires: 'Centre pneus géométrie',
        fuel: 'Station service carburant',
        dealership: 'Concessionnaire automobile',
      },
      geoUnsupported: 'Géolocalisation non prise en charge.',
      geoDenied: 'Autorisation de localisation refusée.',
      useLocation: 'Utiliser ma position',
      locActive: 'Position active',
      addPlace: 'Ajouter un Lieu',
      searchMapsBtn: 'Chercher sur Google Maps',
      emptyTitle: 'Aucun lieu enregistré',
      emptyDesc: 'Enregistrez vos garages de confiance ou recherchez directement sur Google Maps.',
      addModalTitle: 'Ajouter un Lieu de Confiance',
      placeName: 'Nom de l’établissement',
      placeCategory: 'Catégorie',
      placeCity: 'Ville / Région',
      placeAddress: 'Adresse',
      placePhone: 'Téléphone / WhatsApp',
      placeNotes: 'Notes (optionnel)',
      savePlace: 'Enregistrer',
      removePlace: 'Supprimer',
      openMaps: 'Maps',
      kmAway: 'de distance',
    },
    settingsUi: {
      accountTitle: 'Compte & Synchronisation Cloud',
      accountSubtitle: 'Synchronisez garage, historique, justificatifs privés et offres sur tous vos appareils.',
      connectedBadge: 'Connecté',
      localOnlyBadge: 'Local uniquement',
      syncGarageBtn: 'Synchroniser',
      syncingBtn: 'Synchronisation...',
      syncedMsg: 'Données synchronisées dans le cloud !',
      signOutBtn: 'Déconnexion',
      authOAuthHint: 'Connexion en 1 clic :',
      continueWith: 'Continuer avec',
      signInTab: 'Connexion',
      signUpTab: 'Créer un compte',
      emailLabel: 'E-mail',
      passwordLabel: 'Mot de passe',
      signInBtn: 'Se connecter',
      signUpBtn: 'Créer mon compte',
      authRequiredTitle: 'Connectez votre compte pour une synchro sécurisée',
      authSuccessSignIn: 'Connecté ! Chargement de vos véhicules...',
      authSuccessSignUp: 'Compte créé ! Vérifiez votre boîte mail si requis.',
      vehiclesTitle: 'Mes Véhicules',
      vehiclesPlanUsage: 'Offre :',
      upgradePlanBtn: 'Voir les Offres',
      addVehicleBtn: 'Ajouter',
      activeBadge: 'Actif',
      selectBtn: 'Sélectionner',
      removeBtn: 'Supprimer',
      whatsappTitle: 'WhatsApp Enregistré',
      whatsappDesc: 'Envoyez fiches techniques, alertes et rapports en 1 clic.',
      whatsappSavedBadge: 'Configuré',
      whatsappSaveBtn: 'Enregistrer',
      whatsappSavedMsg: 'WhatsApp enregistré !',
      whatsappInvalidMsg: 'Numéro invalide. Incluez l’indicatif pays (ex. : +33 6 12 34 56 78).',
      regionCountryLabel: 'Pays / Région de Facturation',
      regionCurrencyLabel: 'Devise Locale',
      regionAutoBtn: 'Automatique',
      regionAutoApplied: 'Langue, pays et devise ajustés automatiquement.',
      pushTitle: 'Notifications Push en Arrière-plan',
      pushDesc: 'Recevez les rappels même lorsque le navigateur est fermé.',
      pushSupported: 'Compatible',
      pushUnsupported: 'Push non supporté',
      pushEnableBtn: 'Activer les Push',
      pushDisableBtn: 'Désactiver Push',
      pushTestBtn: 'Tester Push',
      pushEnabledMsg: 'Notifications Push activées !',
      pushDisabledMsg: 'Notifications Push désactivées.',
      pushVapidActive: 'VAPID persistant actif',
      remindersSavedHint: 'Préférences enregistrées automatiquement en local et dans le cloud.',
    },
    medicalUi: {
      title: 'Carnet de Santé Numérique du Véhicule',
      subtitle: 'Historique complet des entretiens, révisions, pleins, factures et rappels intelligents.',
      addRecordBtn: 'Nouvel Entretien',
      exportPdfBtn: 'Rapport PDF',
      generatingPdf: 'Génération PDF...',
      summaryRecords: 'Entrées',
      summaryTotalInvested: 'Investi',
      summaryPhotos: 'Factures / Photos',
      radarTitle: 'Radar Intelligent d’Échéances',
      radarUrgentOnly: 'Urgents / À venir',
      radarAll: 'Tous',
      radarShow: 'Afficher radar',
      radarHide: 'Masquer',
      radarAllClear: 'Tout est à jour !',
      radarCompleteBtn: 'Valider',
      radarWaiting: 'En attente d’entrée',
      radarOverdue: 'En retard',
      radarDueSoon: 'Bientôt dû',
      radarOnTrack: 'À jour',
      radarNoDate: 'Date non saisie',
      radarNoDateHint: 'Ajoutez une échéance pour activer l’alerte',
      radarDueIn: 'Dans',
      radarOverdueByDays: 'de retard',
      radarOverdueByKm: 'dépassés',
      radarSuggestedCycle: 'Cycle conseillé :',
      radarImmediate: 'Contrôle immédiat conseillé',
      dossierTitle: 'Envoyer le Carnet & Rapport',
      dossierDesc: 'Partagez l’historique complet avec photos, coûts et factures avec garages ou assureurs.',
      dossierWhatsappBtn: 'Envoyer sur WhatsApp',
      dossierEmailBtn: 'Envoyer par E-mail',
      dossierCopyBtn: 'Copier Résumé',
      dossierCopied: 'Copié !',
      timelineSearchPlaceholder: 'Rechercher intervention, garage, note ou date...',
      filterAll: 'Tout',
      filterMaintenance: 'Entretien',
      filterFuel: 'Carburant',
      filterEv: 'Recharge EV',
      filterExpense: 'Frais / Docs',
      noTimelineEntries: 'Aucune entrée pour ce filtre.',
      workshopLabel: 'Garage / Lieu :',
      photoCameraBtn: 'Photo Facture',
      photoCameraTitle: 'Prendre une photo de la facture',
      photoGalleryTitle: 'Choisir depuis la galerie',
      viewBtn: 'Voir',
      downloadBtn: 'Télécharger',
      deleteAttAria: 'Supprimer facture',
      modalCreateTitle: 'Nouvelle Entrée au Carnet',
      modalCompleteReminderTitle: 'Valider Rappel & Enregistrer',
      modalAutoCycleNote: 'Met automatiquement à jour le prochain cycle',
      kindMaintenance: 'Entretien',
      kindRevision: 'Révision',
      kindFuel: 'Plein',
      kindEvCharge: 'Recharge',
      kindExpense: 'Dépense',
      categoryLabel: 'Système / Catégorie',
      dateLabel: 'Date',
      kmLabel: 'Km',
      energyKwhLabel: 'Énergie (kWh)',
      powerTypeLabel: 'Type',
      socStartLabel: 'Batterie Début %',
      socEndLabel: 'Batterie Fin %',
      whatWasDoneLabel: 'Intervention effectuée',
      placeholderFuel: 'Description du plein',
      placeholderRevision: 'Détails de la révision',
      placeholderExpense: 'Description de la dépense ou assurance',
      placeholderMaint: 'Détails de l’entretien réalisé',
      placeLabelStation: 'Station',
      placeLabelCharger: 'Borne / Station',
      placeLabelWorkshop: 'Garage / Établissement',
      placePhStation: 'Nom de la station',
      placePhCharger: 'Nom de la borne',
      placePhWorkshop: 'Nom du garage ou personnel',
      amountLabel: 'Montant',
      notesLabel: 'Notes',
      notesPlaceholder: 'Pièces changées, garantie, détails...',
      attachSectionTitle: 'Photo facture, reçu, assurance ou contrôle technique (JPG ≤ 2 Mo, privé)',
      takePhotoBtn: 'Prendre Photo',
      galleryBtn: 'Galerie',
      saveRecordBtn: 'Enregistrer',
      attachmentCategories: {
        receipt: 'Facture Garage / Reçu',
        insurance: 'Assurance',
        document: 'Contrôle Technique / Carte Grise',
        vehicle_photo: 'Photo du Véhicule',
        inspection: 'Contrôle / Pièce',
        diagnostic: 'Rapport / Valise',
      },
      monthNames: [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
      ],
      otherRecordsHeading: 'Autres entrées',
    },
    finalReportUi: {
      headerBadge: 'Rapport Final & Dossier Complet',
      headerSubtitle: 'Chronologie consolidée, justificatifs, état préventif et export PDF.',
      sortOldest: 'Plus anciens',
      sortNewest: 'Plus récents',
      downloadPdfBtn: 'Télécharger PDF Complet',
      sendWaPdfBtn: 'Envoyer sur WhatsApp',
      sendEmailBtn: 'Envoyer par E-mail',
      printBtn: 'Imprimer',
      kpiEvents: 'Événements',
      kpiMaintenances: 'Entretiens',
      kpiPhotosDocs: 'Photos & Docs',
      kpiTotalInvested: 'Total Investi',
      quickSendWaLabel: 'WhatsApp cible',
      quickSendEmailLabel: 'E-mail cible',
      timelineTitle: 'Chronologie Complète',
      timelineEmpty: 'Aucune entrée pour ce filtre.',
      galleryTitle: 'Galerie Privée : Factures & Photos',
      galleryEmpty: 'Aucune photo ou document importé.',
      galleryConnectHint: 'Connectez votre compte dans Préférences pour importer des photos privées.',
      uploadCategoryLabel: 'Catégorie',
      uploadNotesPlaceholder: 'Description optionnelle',
      snapshotTitle: 'État Préventif à l’Émission',
      snapshotColItem: 'Élément',
      snapshotColStatus: 'Statut',
      snapshotColLast: 'Dernier contrôle',
      snapshotColNext: 'Prochaine échéance',
      openBtn: 'Ouvrir',
      downloadBtn: 'Télécharger',
      deleteAria: 'Supprimer pièce jointe',
      pdfGeneratedMsg: 'PDF généré avec',
      pdfSharedMsg: 'PDF partagé avec',
      pdfErrorMsg: 'Impossible de générer le PDF complet.',
      photoSavedMsg: 'Pièce jointe enregistrée.',
    },
    passportUi: {
      badge: 'AutoLife World · Passeport Numérique du Véhicule',
      plateLabel: 'Plaque :',
      kpiOnTrack: 'Éléments à jour',
      kpiVerifiedLogs: 'Entrées vérifiées',
      kpiInvestment: 'Investissement',
      kpiIssuedAt: 'Émission',
      qrPublicLabel: 'QR Vérification Publique',
      qrAuthTitle: 'Partage Autorisé par QR Code',
      linkActiveRevoke: 'Lien Actif (Révoquer)',
      linkRevokedReactivate: 'Lien Révoqué (Réactiver)',
      includeExpenses: 'Afficher montants',
      includeDocuments: 'Afficher documents',
      copyBtn: 'Copier',
      copiedBtn: 'Copié',
      signInHint: 'Connectez-vous dans Préférences pour activer un lien public révocable instantanément.',
      updatingPassport: 'Mise à jour du Passeport...',
      odometerTitle: 'Historique Kilométrique Immuable',
      historyTitle: 'Historique Chronologique d’Entretien',
      emptyHistory: 'Aucun historique enregistré.',
      sendWaBtn: 'Envoyer Passeport sur WhatsApp',
      printPdfBtn: 'Imprimer / Enregistrer PDF',
      publicBadge: 'AutoLife World · Consultation Vérifiée',
      openAppBtn: 'Ouvrir l’Application',
      verifying: 'Vérification du Passeport Numérique...',
      unavailableTitle: 'Passeport Indisponible',
      unavailableDesc: 'Ce lien n’existe pas, a expiré ou a été révoqué par le propriétaire.',
      authenticatedBadge: 'Passeport Numérique Authentifié',
      currentOdometer: 'Kilométrage actuel :',
      preventiveHealth: 'Santé Préventive',
      onTrackSuffix: 'à jour',
      odometerMarksTitle: 'Relevés Kilométriques',
      marksSuffix: 'relevés',
      updatedAt: 'Mis à jour le',
      maintHistoryTitle: 'Historique d’Entretien',
      noPublicServices: 'Aucun entretien public enregistré.',
      verifiedDocsTitle: 'Documents Vérifiés',
    },
    vaultUi: {
      title: 'Factures, Reçus & Documents (Privé)',
      subtitlePrefix: 'Factures, assurance et contrôle technique de',
      subtitleSuffix: '· Compression JPG ≤ 2 Mo avec accès privé.',
      connectAccountBtn: 'Connecter Compte',
      unavailable: 'Coffre privé indisponible.',
      signInPromptPrefix: 'Connectez-vous dans',
      signInPromptBtn: 'Préférences → Compte & Cloud',
      signInPromptSuffix: 'pour stocker factures et documents en accès privé.',
      typeLabel: 'Type de document',
      dateLabel: 'Date',
      notesLabel: 'Note (optionnel)',
      notesPlaceholder: 'Détails du document',
      takePhotoBtn: 'Prendre Photo',
      galleryBtn: 'Galerie',
      loading: 'Chargement des fichiers privés...',
      empty: 'Aucun document enregistré. Photos compressées en JPG ≤ 2 Mo automatiquement.',
      expiredLink: 'Lien expiré',
      viewBtn: 'Voir',
      downloadBtn: 'Télécharger',
      sendWaTitle: 'Envoyer sur WhatsApp',
      deleteAria: 'Supprimer fichier',
      uploadSuccess: 'enregistré en privé.',
      uploadError: 'Échec de l’envoi.',
      loadError: 'Impossible de charger les fichiers privés.',
    },
    plansUi: {
      subtitle: 'Tarifs régionaux configurés par pays et devise locale',
      sourceDb: 'catalogue synchronisé',
      sourceFallback: 'tarif régional officiel',
      monthly: 'Mensuel',
      annualDiscount: 'Annuel (-20%)',
      currentHeader: 'Abonnement & Limite Actuels',
      vehicleUnit: 'véhicule(s)',
      neverDeletedNote: 'Vos véhicules et historiques ne sont jamais supprimés en cas d’expiration ou d’annulation.',
      dueLabel: 'Échéance :',
      autoRenewLabel: 'Renouvellement auto :',
      on: 'Activé',
      off: 'Désactivé',
      cancelSubBtn: 'Annuler l’abonnement',
      graceWarningPrefix: 'Abonnement en période de grâce jusqu’au',
      graceWarningSuffix: 'Régularisez le paiement pour ajouter de nouveaux véhicules.',
      paymentHistoryTitle: 'Historique des Paiements',
      currentPlanBadge: 'Offre actuelle',
      activeBadge: 'Actif',
      perMonth: '/ mois',
      estFee: 'Frais est.',
      upToVehicles: 'Jusqu’à',
      over100Vehicles: 'Plus de 100 véhicules',
      fromPrice: 'À partir de',
      renewSwitchCurrency: 'Renouveler / Devise',
      subscribePersonal: 'Choisir Particulier',
      contactB2b: 'Contacter Conseiller B2B',
      manageRenew: 'Gérer / Renouveler',
      subscribePlan: 'Souscrire',
      checkoutPixTitle: 'Paiement Instantané Pix',
      checkoutIntlTitle: 'Paiement Sécurisé International',
      scanPixPrompt: 'Scannez ce QR Code dans votre appli bancaire',
      pixCopyPasteLabel: 'Pix Copier-Coller',
      changeMethodBtn: 'Changer de moyen de paiement',
      doneBtn: 'Terminer',
      verifyPixBtn: 'Vérifier Paiement Pix',
      pixConfirmedMsg: 'Pix confirmé ! Abonnement activé.',
      pixPendingMsg: 'En attente de confirmation Pix.',
      localCurrencyLabel: 'Devise locale',
      billingCycleLabel: 'Cycle de facturation',
      monthlyLabel: 'Mensuel',
      annualLabel: 'Annuel (-20%)',
      paymentMethodsLabel: 'Moyens de paiement',
      receiptEmailLabel: 'E-mail pour reçu (optionnel)',
      subtotalLabel: 'Sous-total',
      regionalTaxesFallback: 'Taxes régionales',
      processingFeeLabel: 'Frais de traitement',
      finalTotalLabel: 'Total final',
      generatePixBtn: 'Générer QR Pix',
      payWithCardBtn: 'Payer par Carte',
      statusLabels: {
        active: 'Actif',
        trialing: 'Essai',
        past_due: 'Impayé',
        grace_period: 'Période de grâce (7j)',
        canceled: 'Annulé',
        expired: 'Expiré (lecture seule)',
      },
    },
    analyticsUi: {
      title: 'Analytique Flotte · Coûts & Recharges',
      subtitle: 'Comparatif voitures et motos : entretien, recharges et TCO en',
      scopeAll: 'Tous',
      scopeCars: 'Voitures',
      scopeMotos: 'Motos',
      scopeActive: 'Actif',
      kpiMaintenance: 'Total Entretien (Flotte)',
      kpiCharging: 'Total Recharges EV',
      kpiEnergy: 'Énergie Cumulée',
      chartVehicleTitle: 'Coût Total par Véhicule',
      chartTrendTitle: 'Tendance Chronologique : Coûts & Énergie (kWh)',
      emptyTrend: 'Aucune donnée pour ce filtre.',
      legendMaintenance: 'Entretien',
      legendCharging: 'Recharge EV',
      legendChargingCost: 'Coût Recharge',
      legendEnergy: 'Énergie (kWh)',
    },
    carbonUi: {
      title: 'Empreinte Carbone Mensuelle & Gain EV',
      subtitle: 'Estimation CO₂e basée sur le kilométrage et la motorisation',
      gridBrazil: 'Mix Renouvelable (95 gCO₂/kWh)',
      gridGlobal: 'Moyenne Mondiale (280 gCO₂/kWh)',
      kpiMonthlyCo2: 'Empreinte Mensuelle',
      kpiEstMonthDist: '/mois estimés',
      kpiAvoidedCo2: 'CO₂ Évité (EV / Hybride)',
      kpiAvoided6m: 'kg évités sur 6 mois',
      kpiReduction: 'Réduction vs Thermique',
      kpiTreesYear: 'arbres/an équivalents',
      kpiIntensity: 'Intensité Moyenne Flotte',
      kpiEvTarget: 'Référence EV : < 25 g/km',
      chartEvolutionTitle: 'Évolution 6 Mois : Émissions vs Gain EV (kg CO₂)',
      chartPerVehicleTitle: 'Empreinte vs Gain EV par Véhicule (kg CO₂/mois)',
      tooltipReal: 'Émission Réelle :',
      tooltipAvoided: 'CO₂ Évité :',
      tooltipBaseline: 'Base 100% Thermique :',
      tooltipMonthlyDist: 'Distance mensuelle :',
      legendReal: 'Émission (kg)',
      legendAvoided: 'Gain EV / Hybride (kg)',
      legendBaseline: 'Base 100% Thermique',
      legendActualVehicle: 'Émission (kg)',
      legendSavingsVehicle: 'Économie EV (kg)',
      simPrefix: 'Simulateur d’Électrification :',
      simMiddle: 'Remplacer',
      simMiddle2: 'par un modèle 100% électrique réduirait encore',
      simTrees: 'arbres/an équivalents',
      simAllEvTitle: 'Flotte 100% Électrique dans ce filtre :',
      simAllEvSuffix: 'de réduction par rapport à l’essence.',
      powertrainLabels: {
        electric: 'Électrique',
        hybrid: 'Hybride',
        diesel: 'Diesel',
        combustion: 'Thermique',
      },
    },
    teamUi: {
      disconnectedTitle: 'Entreprise & Équipe Conducteurs',
      disconnectedDesc: 'Connectez votre compte cloud pour configurer votre entreprise et inviter des conducteurs.',
      connectBtn: 'Connecter Compte Pro',
      title: 'Structure Entreprise & Responsables Flotte',
      isolatedNote: 'Données strictement isolées par entreprise.',
      teamCountLabel: 'Équipe :',
      companyNameLabel: 'Raison Sociale / Nom d’Entreprise',
      companyPlaceholder: 'Ex. : Transports Horizon SAS',
      taxIdLabel: 'SIRET / TVA / VAT',
      taxIdPlaceholder: 'Identifiant fiscal',
      saveBtn: 'Enregistrer',
      savedBtn: '✓ Enregistré',
      inviteTitle: 'Inviter un Collaborateur',
      namePlaceholder: 'Nom complet',
      emailPlaceholder: 'conducteur@entreprise.fr',
      inviteBtn: 'Inviter',
      statusActive: 'Actif',
      statusPending: 'En attente',
      statusRevoked: 'Révoqué',
      reactivateBtn: 'Réactiver',
      suspendBtn: 'Suspendre',
      removeMemberAria: 'Supprimer membre',
      limitReachedMsg: 'Limite atteinte pour votre offre actuelle.',
      inviteSuccessMsg: 'Invitation enregistrée.',
      roles: {
        admin: 'Administrateur',
        fleet_manager: 'Gestionnaire Flotte',
        driver: 'Conducteur',
        viewer: 'Auditeur / Lecture',
      },
      permissions: {
        canViewVehicles: 'Voir véhicules',
        canEditVehicles: 'Éditer flotte',
        canLogMaintenance: 'Saisir entretien',
        canViewExpenses: 'Voir coûts',
        canManageTeam: 'Gérer équipe',
      },
    },
    adminUi: {
      title: 'Panneau Admin — Gestion des Offres',
      subtitlePrefix: 'Accès réservé à',
      subtitleSuffix: 'Activez des offres VIP ou Flotte en 1 clic.',
      refreshBtn: 'Actualiser',
      sqlSetupTitle: 'Configuration SQL Supabase',
      sqlSetupDesc: 'Exécutez ce SQL une fois dans l’éditeur SQL Supabase.',
      copySqlBtn: 'Copier SQL',
      copiedSqlBtn: 'Copié',
      grantTitle: 'Activer ou Modifier une Offre',
      emailLabel: 'E-mail du compte',
      planLabel: 'Offre',
      durationLabel: 'Durée',
      grantHint: 'L’utilisateur doit s’être connecté au moins une fois.',
      grantBtn: 'Activer Maintenant',
      accountsTitle: 'Comptes Enregistrés',
      searchPlaceholder: 'Rechercher par e-mail ou nom...',
      loading: 'Chargement...',
      emptyNeedSql: 'Exécutez le SQL puis actualisez.',
      emptyNoMatch: 'Aucun compte trouvé.',
      noExpiry: 'Sans expiration',
      selectBtn: 'Sélectionner',
      grantEnterpriseBtn: 'Activer Enterprise (1 an)',
      planLabelPrefix: 'Offre :',
      statusLabelPrefix: 'Statut :',
      vehiclesLabel: 'véhicule(s)',
      expiryLabelPrefix: 'Expire :',
    },
    pdfUi: {
      headerSubtitle: 'Rapport Final Complet du Véhicule',
      footerRight: 'Document généré le',
      pageLabel: 'Page',
      ofLabel: 'sur',
      vehicleLabel: 'Véhicule',
      plateLabel: 'Immatriculation',
      yearLabel: 'Année',
      odometerLabel: 'Kilométrage',
      powertrainLabel: 'Motorisation',
      colorLabel: 'Couleur',
      ownerLabel: 'Propriétaire / Compte',
      issuedLabel: 'Émission',
      docExpiryLabel: 'Contrôle Technique',
      insExpiryLabel: 'Assurance',
      notInformed: 'Non précisé',
      summaryEvents: 'Événements',
      summaryMaintenances: 'Entretiens',
      summaryPhotos: 'Photos / Reçus',
      summaryTotal: 'Total Investi',
      timelineTitle: 'Chronologie Complète (Entretiens, Recharges & Reçus)',
      emptyTimeline: 'Aucun historique enregistré pour ce véhicule.',
      colDate: 'Date',
      colCategory: 'Type',
      colTitle: 'Description',
      colKm: 'Compteur',
      colWorkshop: 'Lieu',
      colCost: 'Montant',
      preventiveTitle: 'État Préventif Actuel',
      colItem: 'Élément',
      colStatus: 'Statut',
      colLastRecord: 'Dernier Contrôle',
      colNextDue: 'Prochaine Échéance',
      photosSectionTitle: 'Factures, Reçus & Documents Intégrés',
      filenamePrefix: 'Rapport-AutoLife',
      timelineBadges: {
        evCharge: 'Recharge EV',
        photoPrefix: 'Pièce jointe :',
      },
    },
  },
};

export function getUi(language: LanguageCode): UiBundle {
  return UI_BUNDLE[language] ?? UI_BUNDLE.en;
}
