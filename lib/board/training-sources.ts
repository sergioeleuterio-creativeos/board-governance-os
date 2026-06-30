import type { AdvisorKey } from '@/lib/shadow-board/domain'

export type AdvisorSourceReference = {
  name: string
  url: string
  use: string
  advisorFit: AdvisorKey[]
}

export type CompanyTrainingPack = {
  id: string
  companyName: string
  caseTitle: string
  geography: string
  sector: string
  companyArchetype: string
  sourceInstitutions: string[]
  sourceUrls: string[]
  boardProblem: string
  companySeed: {
    businessModel: string
    governanceStage: string
    strategicContext: string
    decisionPressure: string
    knownUnknowns: string[]
  }
  advisorStress: AdvisorKey[]
  boardQuestions: string[]
  trainingUse: string[]
}

export const ADVISOR_SOURCE_REFERENCES: AdvisorSourceReference[] = [
  {
    name: 'IBGC governance training map',
    url: 'docs/IBGC_AGENT_TRAINING.md',
    use: 'Primary Brazilian governance baseline: board boundary, advisory-board transition, minutes, risk, people governance, and decision discipline.',
    advisorFit: ['board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent'],
  },
  {
    name: 'OECD/G20 Principles of Corporate Governance 2023',
    url: 'https://www.oecd.org/en/publications/g20-oecd-principles-of-corporate-governance-2023_ed750b30-en.html',
    use: 'Global baseline for governance frameworks, disclosure, board responsibilities, sustainability, stakeholders, and capital-market trust.',
    advisorFit: ['board_brain', 'risk', 'finance'],
  },
  {
    name: 'COSO Enterprise Risk Management',
    url: 'https://www.coso.org/',
    use: 'Risk appetite, control environment, enterprise risk language, mitigation ownership, and escalation discipline.',
    advisorFit: ['risk', 'finance', 'operator'],
  },
  {
    name: 'UK FRC Corporate Governance Code 2024',
    url: 'https://www.frc.org.uk/library/standards-codes-policy/corporate-governance/uk-corporate-governance-code/',
    use: 'Board leadership, division of responsibilities, succession, audit/risk/internal controls, remuneration, and comply-or-explain discipline.',
    advisorFit: ['board_brain', 'risk', 'talent', 'finance'],
  },
  {
    name: 'NACD Directorship Certification',
    url: 'https://www.nacdonline.org/directorship-certification/',
    use: 'Director certification posture for strategy, risk oversight, governance operations, fiduciary discipline, and board professionalism.',
    advisorFit: ['board_brain', 'risk', 'finance', 'talent'],
  },
  {
    name: 'INSEAD International Directors Programme',
    url: 'https://www.insead.edu/executive-education/corporate-governance/international-directors-programme',
    use: 'International board education: board effectiveness, decision-making, oversight, director development, financial acumen, sustainability, and constructive challenge of executives.',
    advisorFit: ['board_brain', 'finance', 'risk', 'talent'],
  },
  {
    name: 'Institute of Directors Chartered Director Programme',
    url: 'https://www.iod.com/professional-development/chartered-director-programme/',
    use: 'Director qualification pathway focused on company direction, board performance, director competence, and boardroom practice.',
    advisorFit: ['board_brain', 'operator', 'talent', 'risk'],
  },
  {
    name: 'Fundacao Dom Cabral executive governance context',
    url: 'https://www.fdc.org.br/',
    use: 'Brazilian executive-education context for strategy, leadership, governance maturity, family/company transitions, and implementation discipline.',
    advisorFit: ['board_brain', 'growth', 'operator', 'talent'],
  },
]

export const TRAINING_COMPANY_PACKS: CompanyTrainingPack[] = [
  {
    id: 'lance-owned-audience',
    companyName: 'LANCE!',
    caseTitle: 'Sports media reach to owned audience and paid relationship',
    geography: 'Brazil',
    sector: 'Digital sports media',
    companyArchetype: 'Legacy media brand rebuilding monetization and direct audience ownership',
    sourceInstitutions: ['Creative OS source pack', 'LANCE public pages', 'Board Governance OS synthesis'],
    sourceUrls: [
      'https://www.lance.com.br/',
      'https://lp.lance.com.br/socio-lance-v5',
      'https://lncimg.lance.com.br/uploads/2026/02/Lance-Midia-Kit-2026-.pdf',
    ],
    boardProblem: 'A large sports media brand must turn anonymous reach into identifiable audience, product habit, CRM, recurring revenue, and higher-quality advertiser economics.',
    companySeed: {
      businessModel: 'Advertising-led sports media with emerging membership/subscription and audience data opportunities.',
      governanceStage: 'Founder/owner-led transformation with limited formal board discipline.',
      strategicContext: 'High cultural relevance but pressure to prove owned-audience economics and subscription habit.',
      decisionPressure: 'Prioritize CRM, Socio LANCE!, content/product cadence, commercial packages, and data infrastructure without overbuilding.',
      knownUnknowns: ['Subscriber economics', 'CRM quality', 'media margin by product', 'OCF impact', 'team capacity', 'advertiser concentration'],
    },
    advisorStress: ['finance', 'growth', 'risk', 'customer', 'operator'],
    boardQuestions: [
      'Which audience relationship should be owned first: registration, newsletter, community, or paid Socio LANCE!?',
      'What financial gate proves this is not only engagement but a repeatable revenue engine?',
      'What operating cadence keeps editorial, product, CRM, and commercial teams aligned?',
    ],
    trainingUse: ['showcase seed', 'media transformation', 'customer economics', 'board pack demo'],
  },
  {
    id: 'nyt-subscription-transformation',
    companyName: 'The New York Times Company',
    caseTitle: 'Digital subscription and newsroom/product transformation',
    geography: 'United States',
    sector: 'News media and subscription products',
    companyArchetype: 'Public legacy media company shifting from print/advertising dependence to digital subscription scale',
    sourceInstitutions: ['NYTCo investor materials', 'public innovation-report discussion', 'public company reporting'],
    sourceUrls: [
      'https://www.nytco.com/investors/',
      'https://www.nytimes.com/projects/2020-report/index.html',
    ],
    boardProblem: 'A legacy media company must convert trust, editorial authority, and product depth into durable paid relationships while protecting mission and newsroom credibility.',
    companySeed: {
      businessModel: 'Digital and print subscriptions, advertising, licensing, and adjacent products.',
      governanceStage: 'Public-company governance with long-term owner influence and product/newsroom transformation.',
      strategicContext: 'Subscription growth creates new operating demands across product, data, editorial, customer experience, and bundle strategy.',
      decisionPressure: 'Balance investment in digital products and newsroom excellence with margin, retention, and brand trust.',
      knownUnknowns: ['Retention by cohort', 'bundle profitability', 'newsroom/product capacity', 'subscriber acquisition cost', 'brand trust risk'],
    },
    advisorStress: ['growth', 'customer', 'finance', 'operator', 'talent'],
    boardQuestions: [
      'Which subscriber behaviors show durable habit rather than promotional acquisition?',
      'How should the board evaluate product investment against journalism mission and margin?',
      'Where does leadership need new operating capabilities to sustain the model?',
    ],
    trainingUse: ['subscription strategy', 'mission/economics tradeoff', 'public-company reporting'],
  },
  {
    id: 'netflix-content-cash-culture',
    companyName: 'Netflix',
    caseTitle: 'Content investment, cash discipline, culture, and global scale',
    geography: 'United States / global',
    sector: 'Streaming entertainment',
    companyArchetype: 'Founder-influenced global platform balancing growth, content spend, culture, and cash generation',
    sourceInstitutions: ['Netflix investor materials', 'Netflix culture memo', 'public company reporting'],
    sourceUrls: [
      'https://ir.netflix.net/financials/annual-reports-and-proxies/default.aspx',
      'https://jobs.netflix.com/culture',
    ],
    boardProblem: 'A global streaming company must govern content investment, member growth, pricing, cash flow, leadership culture, and market saturation in a volatile competitive field.',
    companySeed: {
      businessModel: 'Subscription streaming, advertising tier, content licensing, and global entertainment IP.',
      governanceStage: 'Mature public company with founder-era culture and high strategic reinvention pressure.',
      strategicContext: 'Growth strategy depends on pricing, content portfolio quality, retention, regional execution, and cash conversion.',
      decisionPressure: 'Decide when to invest, slow content spend, raise price, push ads, or prioritize cash.',
      knownUnknowns: ['Content ROI', 'regional retention', 'ad-tier economics', 'cash conversion', 'talent/culture scalability'],
    },
    advisorStress: ['finance', 'growth', 'customer', 'talent', 'risk'],
    boardQuestions: [
      'Which content and product bets have board-level investment gates?',
      'How should culture be protected without becoming an excuse for weak controls?',
      'What risk appetite is acceptable for pricing and ad-tier expansion?',
    ],
    trainingUse: ['platform economics', 'culture governance', 'cash vs growth'],
  },
  {
    id: 'boeing-737max-safety-governance',
    companyName: 'Boeing',
    caseTitle: '737 MAX safety, incentives, controls, and board oversight',
    geography: 'United States / global',
    sector: 'Aerospace manufacturing',
    companyArchetype: 'Complex industrial public company with safety-critical operations and regulatory dependence',
    sourceInstitutions: ['US House Transportation Committee public investigation', 'public regulatory reporting'],
    sourceUrls: [
      'https://democrats-transportation.house.gov/committee-activity/boeing-737-max-investigation',
    ],
    boardProblem: 'A company must reconcile commercial pressure, engineering quality, safety oversight, regulatory delegation, executive incentives, and risk escalation.',
    companySeed: {
      businessModel: 'Commercial aircraft manufacturing, defense/aerospace, services, and long-cycle industrial programs.',
      governanceStage: 'Mature public company with high-control, high-regulation governance needs.',
      strategicContext: 'Schedule, certification, safety culture, engineering tradeoffs, and regulatory trust collide.',
      decisionPressure: 'Reset risk oversight, safety reporting, engineering authority, board committee structure, and incentive design.',
      knownUnknowns: ['Safety escalation quality', 'engineering dissent', 'incentive alignment', 'regulatory trust', 'program-level control gaps'],
    },
    advisorStress: ['risk', 'operator', 'talent', 'finance'],
    boardQuestions: [
      'What safety risk should never be traded for schedule or margin?',
      'Which controls prove engineering dissent reaches the board before crisis?',
      'How should incentives change when operational risk is existential?',
    ],
    trainingUse: ['risk governance', 'safety-critical operations', 'board oversight failure'],
  },
  {
    id: 'wework-governance-ipo-readiness',
    companyName: 'WeWork / The We Company',
    caseTitle: 'Founder control, unit economics, governance rights, and IPO readiness',
    geography: 'United States / global',
    sector: 'Flexible office and real estate services',
    companyArchetype: 'Founder-led hypergrowth company facing capital-market discipline',
    sourceInstitutions: ['SEC filings', 'public market analysis', 'business school case-catalog target'],
    sourceUrls: [
      'https://www.sec.gov/edgar/browse/?CIK=1813756',
    ],
    boardProblem: 'A high-growth company must separate founder narrative from controls, governance rights, unit economics, cash burn, related-party risk, and capital-market readiness.',
    companySeed: {
      businessModel: 'Long-term lease obligations converted into short-term flexible workspace memberships and enterprise services.',
      governanceStage: 'Founder-controlled late-stage private company attempting public-market transition.',
      strategicContext: 'Growth optics and valuation narrative exceed evidence quality around controls, margins, governance, and resilience.',
      decisionPressure: 'Decide whether to pause IPO, reset governance, remove conflicts, cut burn, and prove unit economics.',
      knownUnknowns: ['True contribution margin', 'lease obligation stress', 'related-party exposure', 'governance rights', 'cash runway'],
    },
    advisorStress: ['finance', 'risk', 'talent', 'growth'],
    boardQuestions: [
      'Which founder protections or conflicts make the company uninvestable?',
      'What unit economics evidence must precede growth approval?',
      'Where does capital efficiency override expansion ambition?',
    ],
    trainingUse: ['founder governance', 'IPO readiness', 'capital discipline'],
  },
  {
    id: 'uber-culture-controls',
    companyName: 'Uber',
    caseTitle: 'Culture, leadership, platform risk, and control reset',
    geography: 'United States / global',
    sector: 'Mobility platform',
    companyArchetype: 'Founder-led platform company transitioning from aggressive growth to institutional governance',
    sourceInstitutions: ['Public board/culture recommendations', 'company newsroom/source materials'],
    sourceUrls: [
      'https://www.uber.com/newsroom/holder-recommendations/',
    ],
    boardProblem: 'A scaling platform company must turn culture issues into governance, accountability, leadership behavior, controls, risk management, and stakeholder trust.',
    companySeed: {
      businessModel: 'Marketplace/platform economics across mobility, delivery, logistics, and advertising.',
      governanceStage: 'High-growth company moving from founder-era culture to professional management and public-company governance.',
      strategicContext: 'Commercial growth is constrained by culture, legal risk, regulatory pressure, and trust with workers, users, and cities.',
      decisionPressure: 'Reset leadership, management systems, ethics reporting, compliance, and growth guardrails.',
      knownUnknowns: ['Employee trust', 'regulatory exposure', 'incident reporting quality', 'leadership accountability', 'city-level profitability'],
    },
    advisorStress: ['talent', 'risk', 'operator', 'customer'],
    boardQuestions: [
      'Which leadership behaviors are now governance risks, not HR issues?',
      'What controls must exist before entering or scaling a market?',
      'How should board oversight measure trust with drivers, riders, cities, and employees?',
    ],
    trainingUse: ['culture governance', 'platform risk', 'leadership reset'],
  },
  {
    id: 'meta-data-trust',
    companyName: 'Meta / Facebook',
    caseTitle: 'Data trust, platform governance, and stakeholder risk',
    geography: 'United States / global',
    sector: 'Social platform and digital advertising',
    companyArchetype: 'Founder-controlled global platform with data, trust, content, and regulatory risk',
    sourceInstitutions: ['UK Parliament public report', 'regulatory/public reporting', 'public company materials'],
    sourceUrls: [
      'https://publications.parliament.uk/pa/cm201719/cmselect/cmcumeds/1791/1791.pdf',
      'https://investor.fb.com/financials/default.aspx',
    ],
    boardProblem: 'A platform company must govern data practices, content consequences, reputation, market power, public trust, and commercial model externalities.',
    companySeed: {
      businessModel: 'Advertising-driven social platform, messaging, commerce, AI, VR/AR, and creator ecosystems.',
      governanceStage: 'Founder-controlled public company with global regulatory and stakeholder scrutiny.',
      strategicContext: 'Growth and engagement can conflict with privacy, trust, information integrity, and long-term legitimacy.',
      decisionPressure: 'Define risk appetite for data use, AI/content systems, advertising targeting, and product launches.',
      knownUnknowns: ['Data consent quality', 'trust erosion', 'regulatory exposure', 'AI/content control gaps', 'board independence'],
    },
    advisorStress: ['risk', 'customer', 'growth', 'operator'],
    boardQuestions: [
      'Which product metrics should be constrained by trust and societal risk?',
      'What evidence should the board require before approving data-intensive growth?',
      'How should governance work when founder control limits traditional board leverage?',
    ],
    trainingUse: ['data governance', 'stakeholder risk', 'platform trust'],
  },
  {
    id: 'natura-sustainability-growth',
    companyName: 'Natura &Co',
    caseTitle: 'Sustainable growth, stakeholder model, portfolio complexity, and cash discipline',
    geography: 'Brazil / global',
    sector: 'Beauty, personal care, direct selling and retail',
    companyArchetype: 'Values-led Brazilian company facing international growth and portfolio simplification',
    sourceInstitutions: ['Company integrated reports', 'Brazilian governance references', 'public investor materials'],
    sourceUrls: [
      'https://ri.naturaeco.com/en/',
    ],
    boardProblem: 'A values-led company must govern growth, stakeholder trust, ESG commitments, portfolio complexity, channel change, and financial discipline.',
    companySeed: {
      businessModel: 'Beauty and personal care across direct selling, retail, ecommerce, and international brands.',
      governanceStage: 'Public company with stakeholder/ESG identity and international portfolio complexity.',
      strategicContext: 'Purpose and sustainability commitments must coexist with cash, margin, simplification, and growth focus.',
      decisionPressure: 'Prioritize portfolio, channels, debt/cash discipline, ESG proof, and operating focus.',
      knownUnknowns: ['Brand portfolio ROI', 'channel economics', 'working capital', 'ESG proof metrics', 'leadership capacity'],
    },
    advisorStress: ['growth', 'finance', 'risk', 'customer', 'talent'],
    boardQuestions: [
      'Which sustainability commitments are strategic assets versus unfunded promises?',
      'What portfolio choices simplify execution and cash conversion?',
      'How should the board measure stakeholder trust alongside financial recovery?',
    ],
    trainingUse: ['ESG/stakeholder governance', 'portfolio complexity', 'Brazilian public company'],
  },
  {
    id: 'magalu-digital-marketplace',
    companyName: 'Magazine Luiza / Magalu',
    caseTitle: 'Retail digital transformation, marketplace expansion, and profitability discipline',
    geography: 'Brazil',
    sector: 'Retail, ecommerce, marketplace, fintech/services',
    companyArchetype: 'Brazilian retailer transforming into a digital commerce ecosystem',
    sourceInstitutions: ['Company investor materials', 'Brazilian business-school case target', 'public market reporting'],
    sourceUrls: [
      'https://ri.magazineluiza.com.br/',
    ],
    boardProblem: 'A retailer must govern the tradeoff between digital growth, marketplace scale, logistics, fintech/services, working capital, and profitability in a volatile market.',
    companySeed: {
      businessModel: 'Omnichannel retail, ecommerce, marketplace, logistics, advertising, fintech/services, and physical stores.',
      governanceStage: 'Public Brazilian company with family/founder legacy, professional management, and ecosystem strategy.',
      strategicContext: 'Digital transformation increases growth optionality but also complexity, capital needs, and margin pressure.',
      decisionPressure: 'Set capital allocation gates across marketplace, logistics, services, store network, technology, and working capital.',
      knownUnknowns: ['Marketplace unit economics', 'working capital cycle', 'logistics cost-to-serve', 'credit risk', 'category concentration'],
    },
    advisorStress: ['finance', 'operator', 'growth', 'customer', 'risk'],
    boardQuestions: [
      'Which growth initiatives deserve capital during margin pressure?',
      'How should the board separate strategic ecosystem value from operational complexity?',
      'What working-capital and credit-risk gates should constrain expansion?',
    ],
    trainingUse: ['Brazil digital transformation', 'marketplace economics', 'working capital'],
  },
  {
    id: 'petrobras-pasadena-governance',
    companyName: 'Petrobras',
    caseTitle: 'Pasadena capital allocation, information quality, controls, and accountability',
    geography: 'Brazil / United States',
    sector: 'Oil, gas, energy and state-owned enterprise governance',
    companyArchetype: 'Large strategic enterprise with state ownership, political exposure, and capital-intensive decisions',
    sourceInstitutions: ['IBGC training references', 'public investor materials', 'public oversight/audit discussion'],
    sourceUrls: [
      'https://www.petrobras.com.br/en/investors',
    ],
    boardProblem: 'A large capital allocation decision exposes diligence quality, controls, political influence, accountability, information asymmetry, and board challenge discipline.',
    companySeed: {
      businessModel: 'Integrated oil, gas, refining, distribution, and energy infrastructure.',
      governanceStage: 'Public company with state ownership, strategic national relevance, and high integrity/risk exposure.',
      strategicContext: 'Capital allocation decisions can be distorted by incomplete information, political context, and weak challenge.',
      decisionPressure: 'Define board information standards, investment gates, dissent recording, related-party controls, and post-investment review.',
      knownUnknowns: ['Due diligence quality', 'valuation assumptions', 'control weaknesses', 'political pressure', 'accountability chain'],
    },
    advisorStress: ['finance', 'risk', 'board_brain', 'operator'],
    boardQuestions: [
      'What information must be mandatory before a large irreversible investment?',
      'How should dissent and conditions be recorded before approval?',
      'Which post-decision review would reveal whether governance worked?',
    ],
    trainingUse: ['capital allocation', 'SOE governance', 'investment controls'],
  },
]

export const BOARD_CASE_LIBRARY = TRAINING_COMPANY_PACKS.map((pack) => ({
  id: pack.id,
  title: `${pack.companyName} - ${pack.caseTitle}`,
  sourceInstitution: pack.sourceInstitutions.join(' / '),
  publicSources: pack.sourceUrls,
  boardProblem: pack.boardProblem,
  advisorStress: pack.advisorStress,
  companySeed: pack.companySeed,
  boardQuestions: pack.boardQuestions,
  trainingUse: pack.trainingUse,
}))
