#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const SEED_KEY = 'lance-media-kit-2026'
const SOURCE_URL = 'https://lncimg.lance.com.br/uploads/2026/02/Lance-Midia-Kit-2026-.pdf'
const DEFAULT_PDF_PATH = '/tmp/lance-midia-kit-2026.pdf'
const DEFAULT_TEXT_PATH = '/tmp/lance-midia-kit-2026.txt'
const MARKETING_PLAN_SOURCE_NAME = 'LANCE Proposed Marketing Plan - Creative OS'
const DEFAULT_MARKETING_PLAN_PATH = '/Users/Sergio/Documents/Business/Z&E/Creative OS/Leads/Resenha/Dreamboard/LANCE/LANCE Proposed Marketing Plan_ Creative OS — Brand Strategy & Campaign Operating System.pdf'
const DEFAULT_MARKETING_PLAN_TEXT_PATH = '/tmp/lance-creative-os-marketing-plan.txt'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue
    const value = rawValue
      .replace(/^['"]|['"]$/g, '')
      .replace(/\\n/g, '\n')
    process.env[key] = value
  }
}

loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(ROOT, '.env'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace'
}

function humanNameFromEmail(email) {
  if (!email) return null
  const local = email.split('@')[0]
  const parts = local
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return null
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function addDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function must(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

function adminEmails() {
  return [
    process.env.BOARD_GOVERNANCE_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

async function resolveTargetUser() {
  const emails = adminEmails()
  let profile = null

  if (emails.length) {
    const { data, error } = await service
      .from('user_profiles')
      .select('id, email, full_name, is_super_admin, status')
      .in('email', emails)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`target profile: ${error.message}`)
    profile = data?.[0] ?? null
  }

  if (!profile) {
    const { data, error } = await service
      .from('user_profiles')
      .select('id, email, full_name, is_super_admin, status')
      .eq('is_super_admin', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`super admin profile: ${error.message}`)
    profile = data ?? null
  }

  if (!profile) {
    const { data, error } = await service
      .from('user_profiles')
      .select('id, email, full_name, is_super_admin, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`fallback profile: ${error.message}`)
    profile = data ?? null
  }

  let authUser = null
  if (!profile && emails.length) {
    const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw new Error(`auth users: ${error.message}`)
    authUser = data.users.find((user) => emails.includes(user.email?.toLowerCase() ?? '')) ?? null
  }

  if (!profile && !authUser) {
    throw new Error('No Board Governance OS user profile found. Sign in once before running this seed.')
  }

  const id = profile?.id ?? authUser.id
  const email = (profile?.email ?? authUser?.email ?? emails[0] ?? '').toLowerCase()
  const fullName = profile?.full_name?.trim() || humanNameFromEmail(email) || 'Sergio Eleuterio'

  await must('upsert user profile', service
    .from('user_profiles')
    .upsert({
      id,
      email,
      full_name: fullName,
      locale: 'pt-BR',
      timezone: process.env.BOARD_GOVERNANCE_DEFAULT_TIMEZONE || 'America/Sao_Paulo',
      is_super_admin: profile?.is_super_admin ?? emails.includes(email),
      status: 'active',
    }, { onConflict: 'id' }))

  return { id, email, fullName }
}

async function ensureOrganization(user) {
  const { data: membership, error: membershipError } = await service
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (membershipError) throw new Error(`organization membership: ${membershipError.message}`)

  if (membership?.organization_id) {
    const organization = await must('load organization', service
      .from('organizations')
      .select('id, name, slug, default_locale, status')
      .eq('id', membership.organization_id)
      .maybeSingle())
    return organization
  }

  const slug = `board-governance-os-${user.id.slice(0, 8)}`
  const organization = await must('create organization', service
    .from('organizations')
    .upsert({
      name: `${user.fullName}'s workspace`,
      slug,
      public_product_name: 'Board Governance OS',
      default_locale: 'pt-BR',
      owner_user_id: user.id,
      status: 'active',
      metadata: { seed: SEED_KEY },
    }, { onConflict: 'slug' })
    .select('id, name, slug, default_locale, status')
    .single())

  await must('create organization membership', service
    .from('organization_memberships')
    .upsert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,user_id' }))

  return organization
}

async function ensureCompany(organization, user) {
  const company = await must('upsert LANCE company', service
    .from('companies')
    .upsert({
      organization_id: organization.id,
      user_id: user.id,
      name: 'LANCE!',
      slug: 'lance',
      industry: 'Midia esportiva digital',
      business_model: [
        'Publisher esportivo multiplataforma com jornalismo, audiencia proprietaria, video, social, branded content, publicidade, creators, app, assinaturas e experiencias.',
        'O desafio de governanca e transformar alcance massivo em receita recorrente, dados first-party e cadencia de decisao.',
      ].join(' '),
      revenue_range: 'Nao informado no midia kit publico',
      employee_count: null,
      stage: 'Transformacao digital e escala de audiencia propria',
      jurisdiction: 'Brasil',
      default_locale: 'pt-BR',
      goals: [
        'Consolidar o LANCE! App como camada proprietaria de relacionamento e dados first-party.',
        'Elevar monetizacao direta, branded content, creators, CRM e formatos premium.',
        'Reduzir dependencia de busca organica, plataformas sociais e categorias concentradas.',
        'Criar cadencia executiva para alinhar editorial, produto, tecnologia, vendas e dados.',
      ].join('\n'),
      main_challenge: 'Converter grande alcance mensal em audiencia identificada, retida e monetizavel sem comprometer credibilidade editorial, qualidade comercial e governanca de dados.',
      status: 'active',
      metadata: {
        seed: SEED_KEY,
        source_url: SOURCE_URL,
        source_name: 'LANCE! Midia Kit 2026',
      },
    }, { onConflict: 'organization_id,slug' })
    .select('id, organization_id, name, slug, stage')
    .single())

  await must('upsert LANCE company membership', service
    .from('company_memberships')
    .upsert({
      company_id: company.id,
      user_id: user.id,
      role: 'founder',
      status: 'active',
      created_at: new Date().toISOString(),
    }, { onConflict: 'company_id,user_id' }))

  return company
}

async function cleanupSeed(company) {
  const { data: priorDocs, error: priorDocsError } = await service
    .from('uploaded_documents')
    .select('id, storage_bucket, storage_path')
    .eq('company_id', company.id)
    .contains('metadata', { seed: SEED_KEY })

  if (priorDocsError) throw new Error(`prior docs: ${priorDocsError.message}`)

  const priorDocIds = (priorDocs ?? []).map((doc) => doc.id)
  if (priorDocIds.length) {
    await must('delete seed document extractions', service.from('document_extractions').delete().in('document_id', priorDocIds))
    await must('delete seed document brain entries', service.from('company_brain_entries').delete().in('source_document_id', priorDocIds))
    await must('delete seed uploaded documents', service.from('uploaded_documents').delete().in('id', priorDocIds))

    const byBucket = new Map()
    for (const doc of priorDocs) {
      const list = byBucket.get(doc.storage_bucket) ?? []
      list.push(doc.storage_path)
      byBucket.set(doc.storage_bucket, list)
    }

    for (const [bucket, paths] of byBucket.entries()) {
      await service.storage.from(bucket).remove(paths)
    }
  }

  await must('delete seed brain entries', service
    .from('company_brain_entries')
    .delete()
    .eq('company_id', company.id)
    .contains('metadata', { seed: SEED_KEY }))

  const { data: priorCycles, error: cyclesError } = await service
    .from('governance_cycles')
    .select('id')
    .eq('company_id', company.id)
    .contains('metadata', { seed: SEED_KEY })

  if (cyclesError) throw new Error(`prior cycles: ${cyclesError.message}`)
  const cycleIds = (priorCycles ?? []).map((cycle) => cycle.id)
  if (!cycleIds.length) {
    await service.from('governance_runs').delete().eq('company_id', company.id).ilike('title', 'LANCE%')
    return
  }

  const deleteByCycle = async (table) => {
    await must(`delete ${table}`, service.from(table).delete().in('governance_cycle_id', cycleIds))
  }

  await deleteByCycle('referral_requests')
  await deleteByCycle('follow_ups')
  await deleteByCycle('decisions')
  await deleteByCycle('meeting_minutes')
  await deleteByCycle('board_meetings')
  await deleteByCycle('agent_conversations')
  await deleteByCycle('agent_reviews')
  await deleteByCycle('board_sessions')
  await deleteByCycle('board_packs')
  await deleteByCycle('business_plans')
  await deleteByCycle('governance_inputs')
  await must('delete seed governance cycles', service.from('governance_cycles').delete().in('id', cycleIds))
  await service.from('governance_runs').delete().eq('company_id', company.id).ilike('title', 'LANCE%')
}

const metrics = {
  alcance_mensal: '+25m fas impactados por mes',
  site_2025: '+420m page views e +95m usuarios unicos',
  busca_organica: '+46% usuarios via busca organica',
  social_2025: '+11m seguidores e +5b views',
  tv_2025: '525k inscritos, +30m views e +170m reach',
  whatsapp: '+1.5m base em 20+ canais; +1.2m canal principal',
  newsletter: '+200k base cadastrada',
  push: '+900k base de push notifications',
  app: 'Lancamento em maio para integrar conteudo, livescore, midia e experiencias',
}

const marketingMetrics = {
  direct_branded_search_18_32: '+25% em 12 meses',
  owned_social_following_saves_shares: '+40% ano contra ano em 12 meses',
  unaided_awareness_18_32: '35%+ em 18 meses',
  media_buyer_perception_25_35: 'mudanca positiva mensuravel em 12 meses',
  digital_ad_revenue_18_32: '+20% em 12 meses',
  match_day_owned_channel_share: 'top-3 sports publisher em TikTok e Reels por volume em 12 meses',
  aggregator_brand_consistency: '95% de links com nome, logo e preview corretos em 6 meses',
}

const sourceReferences = [
  {
    title: 'LANCE! Midia Kit 2026',
    url: SOURCE_URL,
    trust: 'official',
  },
  {
    title: MARKETING_PLAN_SOURCE_NAME,
    url: 'local-pdf',
    trust: 'internal-plan',
  },
]

async function uploadMediaKit(organization, company, user) {
  const pdfPath = process.env.LANCE_MEDIA_KIT_PATH || DEFAULT_PDF_PATH
  if (!fs.existsSync(pdfPath)) return null

  const bucket = process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS || 'company-documents'
  const storagePath = `${organization.id}/${company.id}/sources/Lance-Midia-Kit-2026.pdf`
  const pdfBuffer = fs.readFileSync(pdfPath)

  const { error: uploadError } = await service.storage
    .from(bucket)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.warn(`Skipping media kit storage upload: ${uploadError.message}`)
    return null
  }

  const document = await must('insert media kit document', service
    .from('uploaded_documents')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      uploaded_by: user.id,
      storage_bucket: bucket,
      storage_path: storagePath,
      original_filename: 'Lance-Midia-Kit-2026.pdf',
      mime_type: 'application/pdf',
      file_ext: 'pdf',
      file_size_bytes: pdfBuffer.byteLength,
      document_type: 'midia_kit',
      status: 'processed',
      summary: 'Midia Kit oficial LANCE! 2026 usado como fonte primaria para o seed de governanca.',
      metadata: {
        seed: SEED_KEY,
        source_url: SOURCE_URL,
        source_name: 'LANCE! Midia Kit 2026',
      },
    })
    .select('id')
    .single())

  const textPath = process.env.LANCE_MEDIA_KIT_TEXT_PATH || DEFAULT_TEXT_PATH
  const extractedText = fs.existsSync(textPath)
    ? fs.readFileSync(textPath, 'utf8')
    : Object.entries(metrics).map(([key, value]) => `${key}: ${value}`).join('\n')

  await must('insert media kit extraction', service
    .from('document_extractions')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      document_id: document.id,
      extraction_type: 'summary',
      content: extractedText.slice(0, 30000),
      structured_data: {
        seed: SEED_KEY,
        metrics,
        audience: {
          mobile_social: '91%',
          female: '28%',
          classe_abc: '94%',
          regions: '87% Sudeste, Sul e Nordeste',
          age_18_44: '64%',
          interests: ['Esportes 95%', 'Tecnologia 75%', 'Lifestyle 71%', 'Viagem 69%', 'Apostas 58%'],
        },
        products: ['LANCE! App', 'lance.com.br', 'LANCE!TV', 'Cria Lab', 'Arquiba', 'Socio LANCE!', 'LANCE! Educacao', 'Newsletter', 'WhatsApp', 'Push notifications'],
        commercial_formats: ['conteudo customizado', 'videos', 'artigos SEO/branded content', 'display', 'video', 'patrocinio', 'social media', 'talentos e creators'],
        cases_2025: [
          { brand: 'Superbet', result: '+8m reach / +7.5m views' },
          { brand: 'BetMGM', result: '+10m impressions / +15k clicks' },
          { brand: 'HiperBet', result: '+3.4m views / +28m impressions' },
          { brand: 'Perdigao', result: '+2m views / +55m impressions' },
          { brand: 'Visa', result: '+17m impressions / +47k clicks' },
          { brand: 'Assai', result: '+30m impressions / +47k clicks' },
        ],
      },
      confidence_score: 92,
      source_locations: {
        source_url: SOURCE_URL,
        pages: 27,
      },
      status: 'processed',
    }))

  return document.id
}

async function uploadMarketingPlan(organization, company, user) {
  const pdfPath = process.env.LANCE_MARKETING_PLAN_PATH || DEFAULT_MARKETING_PLAN_PATH
  if (!fs.existsSync(pdfPath)) return null

  const bucket = process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS || 'company-documents'
  const storagePath = `${organization.id}/${company.id}/sources/LANCE-Creative-OS-Marketing-Plan.pdf`
  const pdfBuffer = fs.readFileSync(pdfPath)

  const { error: uploadError } = await service.storage
    .from(bucket)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.warn(`Skipping marketing plan storage upload: ${uploadError.message}`)
    return null
  }

  const document = await must('insert marketing plan document', service
    .from('uploaded_documents')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      uploaded_by: user.id,
      storage_bucket: bucket,
      storage_path: storagePath,
      original_filename: 'LANCE Proposed Marketing Plan - Creative OS.pdf',
      mime_type: 'application/pdf',
      file_ext: 'pdf',
      file_size_bytes: pdfBuffer.byteLength,
      document_type: 'marketing_plan',
      status: 'processed',
      summary: 'Plano Creative OS para reposicionamento, reconhecimento de marca, audiencia 18-32, workstreams e KPIs de marketing do LANCE!.',
      metadata: {
        seed: SEED_KEY,
        source_name: MARKETING_PLAN_SOURCE_NAME,
      },
    })
    .select('id')
    .single())

  const textPath = process.env.LANCE_MARKETING_PLAN_TEXT_PATH || DEFAULT_MARKETING_PLAN_TEXT_PATH
  const extractedText = fs.existsSync(textPath)
    ? fs.readFileSync(textPath, 'utf8')
    : [
      'Brand invisible at point of sale.',
      'Marketing objective: make 18-32 Brazilian sports fans choose LANCE by name.',
      JSON.stringify(marketingMetrics),
    ].join('\n')

  await must('insert marketing plan extraction', service
    .from('document_extractions')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      document_id: document.id,
      extraction_type: 'summary',
      content: extractedText.slice(0, 30000),
      structured_data: {
        seed: SEED_KEY,
        marketing_metrics: marketingMetrics,
        primary_audience: 'Brazilian sports fans aged 18-32 who consume football content constantly but have no brand relationship with where it comes from.',
        media_buyer_problem: 'Younger coordinators and managers do not carry memory of LANCE! as a category-defining brand, reducing advertising salience despite audience scale.',
        strategic_direction: 'Penetration',
        workstreams: [
          'Break-News Habit Loop',
          'Creator and Athlete Voice Layer',
          'Brand Moment Campaign',
          'Physical Availability Audit',
          'Advertising Proposition Rebuild',
        ],
      },
      confidence_score: 90,
      source_locations: {
        source_name: MARKETING_PLAN_SOURCE_NAME,
        pages: 5,
      },
      status: 'processed',
    }))

  return document.id
}

function brainEntries(organization, company, user, sourceDocumentIds) {
  const base = {
    organization_id: organization.id,
    company_id: company.id,
    source_document_id: sourceDocumentIds.mediaKit ?? sourceDocumentIds.marketingPlan ?? null,
    created_by: user.id,
    source_type: 'file',
    confidence_score: 88,
    status: 'active',
    metadata: {
      seed: SEED_KEY,
      source_url: SOURCE_URL,
      source_name: 'LANCE! Midia Kit 2026',
    },
  }
  const marketingBase = {
    ...base,
    source_document_id: sourceDocumentIds.marketingPlan ?? base.source_document_id,
    confidence_score: 90,
    metadata: {
      seed: SEED_KEY,
      source_name: MARKETING_PLAN_SOURCE_NAME,
    },
  }

  return [
    {
      ...base,
      category: 'fact',
      title: 'LANCE! e um ecossistema esportivo multiplataforma',
      content: 'O midia kit posiciona o LANCE! como ecossistema 360 de esporte, com app, site, social, video, creators, newsletter, WhatsApp, push e produtos de experiencia.',
    },
    {
      ...base,
      category: 'fact',
      title: 'Origem e autoridade historica',
      content: 'O LANCE! declara ter sido fundado em 1997 e se posiciona como o primeiro portal especializado em esportes no Brasil.',
    },
    {
      ...base,
      category: 'customer',
      title: 'Escala mensal de audiencia',
      content: 'O midia kit informa mais de 25 milhoes de fas impactados por mes, com audiencia majoritariamente mobile/social, classe ABC e concentrada em Sudeste, Sul e Nordeste.',
    },
    {
      ...base,
      category: 'customer',
      title: 'Site como maquina de alcance e busca',
      content: 'Em 2025, lance.com.br reporta mais de 420 milhoes de page views, mais de 95 milhoes de usuarios unicos e 46% de usuarios via busca organica.',
    },
    {
      ...base,
      category: 'operations',
      title: 'LANCE! App como camada proprietaria',
      content: 'O app e apresentado como lancamento de maio para integrar conteudo, livescore, midia e experiencias, alem de identificar usuario, jornada e preferencias.',
    },
    {
      ...base,
      category: 'goal',
      title: 'Prioridade 2026: dados first-party',
      content: 'A prioridade estrategica inferida e transformar alcance em audiencia identificada, consentida e segmentavel para elevar retencao e monetizacao.',
    },
    {
      ...base,
      category: 'financial',
      title: 'Modelo comercial diversificado, mas sem DRE publica',
      content: 'O midia kit mostra formatos de receita em branded content, SEO, display, video, patrocinio, social media, creators, newsletter e WhatsApp, mas nao traz DRE/P&L, OCF, margem, caixa ou concentracao por cliente.',
    },
    {
      ...base,
      category: 'risk',
      title: 'Risco de dependencia de plataformas e busca',
      content: 'O peso de busca organica, redes sociais e canais de terceiros cria risco de distribuicao, mudancas de algoritmo e volatilidade de inventario.',
    },
    {
      ...base,
      category: 'risk',
      title: 'Risco comercial e reputacional em apostas',
      content: 'Casos relevantes de marcas de betting sugerem potencial concentracao comercial e necessidade de governanca editorial, compliance e reputacao.',
    },
    {
      ...base,
      category: 'operations',
      title: 'Produtos adjacentes de comunidade e experiencia',
      content: 'Arquiba, Socio LANCE!, LANCE! Educacao, LANCE!TV e Cria Lab ampliam a tese de ecossistema, mas exigem prioridades e KPIs comuns.',
    },
    {
      ...base,
      category: 'plan',
      title: 'Plano precisa unir editorial, produto, tecnologia e vendas',
      content: 'A tese de governanca e criar uma cadencia unica para app, CRM, dados, inventario comercial, conteudo e creators, evitando otimizar cada frente separadamente.',
    },
    {
      ...base,
      category: 'question',
      title: 'Qual porcentagem da audiencia vira usuario identificado?',
      content: 'Pergunta board-level: que parte dos mais de 25 milhoes de fas impactados por mes entra em uma base first-party com consentimento, preferencia de time e recorrencia?',
    },
    {
      ...base,
      category: 'question',
      title: 'Qual e a concentracao de receita por categoria e anunciante?',
      content: 'Sem DRE e sales mix, o board nao consegue avaliar dependencia de betting, dependencia de poucos anunciantes, margem por formato e qualidade de receita.',
    },
    {
      ...base,
      category: 'question',
      title: 'Quais gates provam que o app aumenta valor comercial?',
      content: 'O app precisa provar retencao D7/D30, usuarios logados, opt-in, segmentacao, lift de campanha, recorrencia e impacto em receita direta.',
    },
    {
      ...marketingBase,
      category: 'fact',
      title: 'Problema central: alcance maior que reconhecimento',
      content: 'O plano Creative OS diagnostica o LANCE! como uma marca maior em audiencia real do que em percepcao, especialmente nos ambientes onde verbas de publicidade sao decididas.',
    },
    {
      ...marketingBase,
      category: 'customer',
      title: 'Publico 18-32 consome esporte sem relacao com fonte',
      content: 'O publico primario definido e o torcedor brasileiro de 18 a 32 anos que consome futebol constantemente, mas trata noticia esportiva como commodity descoberta por algoritmo.',
    },
    {
      ...marketingBase,
      category: 'customer',
      title: 'Media buyers jovens sao um gargalo comercial',
      content: 'O plano aponta que coordenadores e gerentes de marketing mais jovens nao viveram o auge do LANCE!, o que reduz lembranca espontanea e inclusao em planos de midia.',
    },
    {
      ...marketingBase,
      category: 'goal',
      title: 'Objetivo de marketing: escolher LANCE! pelo nome',
      content: 'Fazer torcedores brasileiros de 18 a 32 anos escolherem LANCE! pelo nome, nao apenas cairem no conteudo por algoritmo, associando a marca a match-day moments rapidos e citaveis.',
    },
    {
      ...marketingBase,
      category: 'plan',
      title: 'Workstreams de marketing definidos',
      content: 'Break-News Habit Loop, Creator and Athlete Voice Layer, Brand Moment Campaign, Physical Availability Audit e Advertising Proposition Rebuild.',
    },
    {
      ...marketingBase,
      category: 'financial',
      title: 'Meta de receita publicitaria ligada ao publico 18-32',
      content: 'O plano define meta de +20% de receita de publicidade digital de marcas mirando audiencias 18-32 em 12 meses, com baseline atual desconhecido.',
    },
    {
      ...marketingBase,
      category: 'risk',
      title: 'Risco de virar distribuidor generico de noticias',
      content: 'O plano explicita que o LANCE! nao deve competir apenas por velocidade, nem deixar a reportagem desaparecer no algoritmo sem credito e atribuicao de marca.',
    },
    {
      ...marketingBase,
      category: 'question',
      title: 'A marca aparece no ponto de venda?',
      content: 'Pergunta board-level: media buyers 25-35 reconhecem LANCE! espontaneamente como publisher esportivo relevante para campanhas 18-32?',
    },
  ]
}

const priorities = [
  {
    rank: 1,
    priority: 'Converter audiencia anonima em escolha consciente por LANCE!',
    title: 'Reconhecimento de marca 18-32',
    rationale: 'O plano Creative OS mostra que LANCE! tem trafego, mas perde valor quando o torcedor le a noticia sem registrar a fonte.',
    owner_suggestion: 'Marca + Editorial + Growth',
    proof_point: '+25% direct/branded search 18-32 e 35%+ unaided awareness em 18 meses.',
  },
  {
    rank: 2,
    priority: 'Fazer do LANCE! App o eixo de audiencia propria',
    title: 'App e CRM first-party',
    rationale: 'O alcance ja existe; a criacao de valor depende de identificar, reter e segmentar torcedores sem depender so de busca e redes.',
    owner_suggestion: 'Produto + Dados + Editorial',
    proof_point: 'Usuarios logados, opt-in, preferencias de clubes, D7/D30 retention e receita por usuario identificado.',
  },
  {
    rank: 3,
    priority: 'Criar governanca de receita e concentracao comercial',
    title: 'Receita de qualidade',
    rationale: 'O midia kit prova capacidade comercial, mas nao traz mix de receita, margem, dependencia por anunciante/categoria nem DRE.',
    owner_suggestion: 'CRO + Financeiro',
    proof_point: 'Dashboard mensal por categoria, anunciante, formato, margem e recorrencia.',
  },
  {
    rank: 4,
    priority: 'Unificar operacao editorial-produto-vendas',
    title: 'Cadencia semanal de performance',
    rationale: 'O ecossistema e amplo; sem cadencia unica, app, creators, social, site e vendas podem otimizar metas locais.',
    owner_suggestion: 'CEO/COO',
    proof_point: 'Ritual semanal com KPIs, decisoes, owners e follow-ups por frente.',
  },
  {
    rank: 5,
    priority: 'Instalar guardrails de reputacao, dados e betting',
    title: 'Governanca editorial e compliance',
    rationale: 'A monetizacao esportiva com betting, dados e creators exige limites claros para proteger marca e confianca.',
    owner_suggestion: 'Jur/Compliance + Editorial + Risk',
    proof_point: 'Politica aprovada, matriz de riscos, criterios de campanha e revisao mensal.',
  },
]

const kpis = [
  { metric: 'Direct and branded search traffic 18-32', target: marketingMetrics.direct_branded_search_18_32, owner: 'Marca/Growth' },
  { metric: 'Social following, saves e shares em canais LANCE!', target: marketingMetrics.owned_social_following_saves_shares, owner: 'Social/Editorial' },
  { metric: 'Unaided brand awareness 18-32', target: marketingMetrics.unaided_awareness_18_32, owner: 'Marca' },
  { metric: 'Media buyer perception score 25-35', target: marketingMetrics.media_buyer_perception_25_35, owner: 'Comercial/Marketing' },
  { metric: 'Receita publicitaria digital para marcas 18-32', target: marketingMetrics.digital_ad_revenue_18_32, owner: 'Comercial/Financeiro' },
  { metric: 'Brand consistency em aggregators/news feeds', target: marketingMetrics.aggregator_brand_consistency, owner: 'SEO/Produto' },
  { metric: 'Usuarios identificados no app', target: 'Definir baseline em 30 dias', owner: 'Produto/Dados' },
  { metric: 'Retencao D7/D30 do app', target: 'D7 e D30 por cohort de torcedor', owner: 'Produto' },
  { metric: 'Receita por usuario identificado', target: 'Criar baseline por CRM/campanha', owner: 'Comercial/Dados' },
  { metric: 'Mix de receita por categoria', target: 'Nenhuma categoria critica sem limite e plano de mitigacao', owner: 'Financeiro/Comercial' },
  { metric: 'Share de receita direta/premium', target: 'Separar direta, programatica, branded, creators e CRM', owner: 'CRO' },
  { metric: 'Performance editorial que sustenta monetizacao', target: 'PV, usuarios unicos, social views, newsletter, push e WhatsApp com qualidade', owner: 'Editorial/Audiencia' },
]

const risks = [
  {
    risk: 'Dependencia de busca organica e plataformas sociais',
    severity: 'high',
    mitigation: 'Acelerar base first-party via app, newsletter, WhatsApp, push e CRM com metas de usuario identificado.',
  },
  {
    risk: 'Marca invisivel no ponto de venda',
    severity: 'high',
    mitigation: 'Reconstruir proposta comercial com dados 18-32, prova de recencia, brand lift e percepcao de media buyers 25-35.',
  },
  {
    risk: 'Conteudo atribuido ao algoritmo, nao ao LANCE!',
    severity: 'high',
    mitigation: 'Auditar Google News, Apple News, WhatsApp previews e aggregators para garantir nome, logo e preview corretos em 95% dos links.',
  },
  {
    risk: 'Concentracao comercial em betting ou poucos anunciantes',
    severity: 'high',
    mitigation: 'Criar painel de receita por categoria/anunciante/formato e limites de exposicao aprovados pelo board.',
  },
  {
    risk: 'App vira canal de alcance, mas nao de retencao',
    severity: 'medium',
    mitigation: 'Definir gates de D7/D30, preferencias, opt-in, personalizacao e lift de campanha antes de escalar investimentos.',
  },
  {
    risk: 'Conflito entre monetizacao e credibilidade editorial',
    severity: 'high',
    mitigation: 'Formalizar guardrails de branded content, betting, creators e uso de dados.',
  },
]

const financialReport = {
  'DRE / P&L para revisao do board': [
    { line_item: 'Receita publicitaria display/video', value: 'Nao informado', board_note: 'Separar direta vs programatica e margem por formato.', context: 'Fonte publica mostra formatos, nao DRE.' },
    { line_item: 'Branded content / SEO / social media', value: 'Nao informado', board_note: 'Medir receita, margem, recorrencia e capacidade de entrega.', context: 'Casos 2025 provam demanda comercial.' },
    { line_item: 'Creators / Cria Lab', value: '+90m impressions / +5.7m interactions em 2025', board_note: 'Avaliar margem, dependencia de talentos e previsibilidade.', context: 'Midia kit 2026.' },
    { line_item: 'Assinaturas e beneficios / Socio LANCE!', value: '+25k subscribers', board_note: 'Separar receita recorrente, churn e CAC.', context: 'Produto adjacente com potencial de recorrencia.' },
  ],
  'OCF / caixa / capital de giro': [
    { line_item: 'Operating Cash Flow / OCF', value: 'Nao informado', board_note: 'Solicitar OCF mensal e ponte EBITDA-caixa.', context: 'Necessario para governanca de investimento no app.' },
    { line_item: 'Runway / caixa disponivel', value: 'Nao informado', board_note: 'Definir capacidade de investimento antes de ampliar produto e CRM.', context: 'Falta de fonte financeira limita confianca.' },
    { line_item: 'Ciclo de recebiveis e inadimplencia', value: 'Nao informado', board_note: 'Avaliar risco em campanhas, agencias e patrocinadores.', context: 'Relevante para midia e publicidade.' },
  ],
  'Metricas comerciais e unit economics': [
    { metric: 'Page views 2025', value: '+420m', board_note: 'Converter alcance em yield por sessao e receita por usuario.', context: 'lance.com.br' },
    { metric: 'Usuarios unicos 2025', value: '+95m', board_note: 'Medir conversao para usuario identificado.', context: 'lance.com.br' },
    { metric: 'Social views 2025', value: '+5b', board_note: 'Separar alcance alugado de base proprietaria.', context: 'redes sociais' },
    { metric: 'Newsletter / WhatsApp / Push', value: '+200k / +1.5m / +900k', board_note: 'Criar funil CRM e consentimento.', context: 'canais proprietarios/semiproprietarios' },
  ],
  'Marketing scorecard Creative OS': [
    { metric: 'Direct/branded search 18-32', value: marketingMetrics.direct_branded_search_18_32, board_note: 'Prova se torcedores escolhem LANCE! pelo nome.', context: 'Marketing plan' },
    { metric: 'Owned social saves/shares/following', value: marketingMetrics.owned_social_following_saves_shares, board_note: 'Mede habito e atribuicao em Reels, Shorts e TikTok.', context: 'Marketing plan' },
    { metric: 'Unaided awareness 18-32', value: marketingMetrics.unaided_awareness_18_32, board_note: 'Leitura de saliencia de marca no publico prioritario.', context: 'Marketing plan' },
    { metric: 'Media buyer perception 25-35', value: marketingMetrics.media_buyer_perception_25_35, board_note: 'Conecta marca a venda publicitaria.', context: 'Marketing plan' },
    { metric: 'Digital ad revenue 18-32', value: marketingMetrics.digital_ad_revenue_18_32, board_note: 'Resultado de negocio esperado da estrategia de marca.', context: 'Marketing plan' },
    { metric: 'Aggregator brand consistency', value: marketingMetrics.aggregator_brand_consistency, board_note: 'Corrige perda de atribuicao em discovery algoritimico.', context: 'Marketing plan' },
  ],
}

function advisorReports() {
  return [
    {
      advisor_key: 'finance',
      advisor_name: 'Finance Advisor',
      stance: 'support_with_conditions',
      risk_score: 72,
      confidence_score: 68,
      perspective: 'A tese de owned audience e correta, mas o plano agora depende tambem de provar que reconhecimento de marca 18-32 vira receita publicitaria. O board nao deveria aprovar investimento incremental sem DRE por produto, OCF, margem por formato, concentracao por anunciante/categoria e baseline de receita 18-32.',
      strategic_questions: [
        'Qual receita e margem por display, video, branded content, creators, app, CRM, assinaturas e eventos?',
        'Qual o payback esperado para investimento em app, dados first-party e campanha de reconhecimento 18-32?',
        'Qual percentual de receita depende de betting ou de poucos anunciantes?',
      ],
      recommendations: [
        { title: 'Criar DRE gerencial por produto', detail: 'Separar receitas, custos diretos, margem e OCF por linha de negocio.', priority: 'urgent' },
        { title: 'Definir investment gate de marca/app', detail: 'Aprovar investimento por milestones de branded search, awareness, usuario identificado e receita incremental.', priority: 'high' },
      ],
      closure_recommendation: 'commit_with_conditions',
    },
    {
      advisor_key: 'operator',
      advisor_name: 'Operator Advisor',
      stance: 'support_with_conditions',
      risk_score: 64,
      confidence_score: 76,
      perspective: 'O ecossistema tem muitas frentes simultaneas. A prioridade operacional e instalar uma cadencia semanal que una editorial, produto, tecnologia, dados, social e comercial para capturar match-day moments e transformar atribuicao de marca em rotina.',
      strategic_questions: [
        'Quem decide tradeoffs entre alcance editorial, experiencia do app e demanda comercial?',
        'Qual ritual semanal transforma aprendizados em owners e prazos?',
        'Quais tres KPIs semanais fecham a semana: velocidade, atribuicao, saves/shares, branded search ou receita?',
      ],
      recommendations: [
        { title: 'War room de 13 semanas', detail: 'Reuniao semanal com KPI tree de break-news, social, app, CRM, marca, inventario e vendas.', priority: 'urgent' },
        { title: 'RACI do app', detail: 'Nomear um owner por produto, dados, editorial, vendas e tecnologia.', priority: 'high' },
      ],
      closure_recommendation: 'commit_with_conditions',
    },
    {
      advisor_key: 'growth',
      advisor_name: 'Growth Advisor',
      stance: 'support',
      risk_score: 58,
      confidence_score: 78,
      perspective: 'LANCE! ja tem massa critica, mas o plano Creative OS mostra que alcance anonimo nao basta. O maior upside esta em transformar match-day discovery em habito, shareability e lembranca espontanea entre torcedores 18-32 e media buyers 25-35.',
      strategic_questions: [
        'Quais match-day formats geram saves, shares, branded search e follows deliberados?',
        'Como o app aumenta frequencia e inventario premium para anunciantes?',
        'Quais produtos viram ofertas comerciais defensaveis para 2026?',
      ],
      recommendations: [
        { title: 'Break-News Habit Loop', detail: 'Criar formato repetivel em Reels, Shorts e TikTok para micro-momentos de jogo, com atribuicao forte de LANCE!.', priority: 'urgent' },
        { title: 'Advertising Proposition Rebuild', detail: 'Reposicionar a venda com prova de audiencia 18-32, recencia, reconhecimento e performance.', priority: 'high' },
        { title: 'CRM como produto de venda', detail: 'Transformar newsletter, push, WhatsApp e app em ofertas integradas.', priority: 'high' },
      ],
      closure_recommendation: 'commit',
    },
    {
      advisor_key: 'risk',
      advisor_name: 'Risk Advisor',
      stance: 'needs_more_data',
      risk_score: 82,
      confidence_score: 70,
      perspective: 'O board precisa ver guardrails de betting, dados pessoais, branded content, creators e separacao editorial-comercial antes de escalar monetizacao baseada em dados.',
      strategic_questions: [
        'Quais categorias exigem revisao reputacional antes da venda?',
        'Como consentimento, LGPD e preferencias serao governados no app?',
        'Quais limites protegem independencia editorial em campanhas patrocinadas?',
      ],
      recommendations: [
        { title: 'Matriz de risco reputacional', detail: 'Classificar campanhas e categorias por risco, aprovacao e monitoramento.', priority: 'urgent' },
        { title: 'Governanca de dados do app', detail: 'Definir consentimento, retencao, acesso e uso comercial de dados.', priority: 'urgent' },
      ],
      closure_recommendation: 'commit_with_conditions',
    },
    {
      advisor_key: 'customer',
      advisor_name: 'Customer Advisor',
      stance: 'support_with_conditions',
      risk_score: 60,
      confidence_score: 77,
      perspective: 'A marca tem uma vantagem rara: memoria institucional e autoridade no futebol. O desafio e dar permissao para o jovem torcedor voltar a se importar com quem conta a historia, nao apenas com a velocidade da noticia.',
      strategic_questions: [
        'Qual promessa faz o torcedor 18-32 citar LANCE! pelo nome na conversa?',
        'Como clubes, idols e competicoes personalizam a experiencia?',
        'Como medir valor de marca alem de views e impressions?',
      ],
      recommendations: [
        { title: 'Brand Moment Campaign', detail: 'Escolher um evento de alta tensao e plantar LANCE! como nome que o jovem torcedor abre primeiro.', priority: 'high' },
        { title: 'NPS/retencao por cohort', detail: 'Medir satisfacao e recorrencia por perfil de torcedor.', priority: 'medium' },
      ],
      closure_recommendation: 'commit_with_conditions',
    },
    {
      advisor_key: 'talent',
      advisor_name: 'Talent Advisor',
      stance: 'neutral',
      risk_score: 62,
      confidence_score: 66,
      perspective: 'A estrategia exige capacidade senior em produto, dados, CRM, receita e governanca editorial. O risco e pedir que times editoriais e comerciais absorvam a transformacao sem novos papels.',
      strategic_questions: [
        'Quem e o owner executivo de dados first-party?',
        'Existe lideranca clara para CRM/app monetization?',
        'Quais capacidades precisam ser contratadas ou realocadas?',
      ],
      recommendations: [
        { title: 'Mapa de capacidades 2026', detail: 'Definir lacunas em dados, CRM, produto, analytics comercial e compliance.', priority: 'high' },
        { title: 'Squad app/CRM', detail: 'Criar squad com metas e autoridade transversal.', priority: 'medium' },
      ],
      closure_recommendation: 'commit_with_conditions',
    },
  ]
}

async function seedGovernanceChain(organization, company, user, sourceDocumentIds) {
  const diagnosis = [
    'LANCE! parte de uma posicao forte de alcance e autoridade esportiva, com mais de 25 milhoes de fas impactados por mes e um ecossistema que combina site, social, video, creators, app, WhatsApp, newsletter, push e produtos adjacentes.',
    'O plano Creative OS acrescenta a tensao central de marca: LANCE! tem audiencia real, mas parte dessa audiencia e anonima, source-agnostic e pouco atribuida ao nome LANCE!, especialmente entre torcedores 18-32 e media buyers 25-35.',
    'A questao de board nao e gerar mais audiencia; e transformar alcance em escolha consciente, relacionamento proprietario, dados first-party, receita de qualidade e cadencia de decisao entre editorial, marca, produto, tecnologia, social e comercial.',
    'A confianca do plano e limitada pela ausencia de DRE, P&L, OCF, caixa, margem por produto e concentracao por anunciante/categoria nos materiais publicos.',
  ].join(' ')

  const governanceCycle = await must('insert governance cycle', service
    .from('governance_cycles')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      title: 'LANCE! 2026 - audiencia propria e monetizacao governada',
      cycle_type: 'diagnostic',
      period_start: '2026-01-01',
      period_end: '2026-12-31',
      status: 'board_pack',
      current_stage: 'board_pack',
      data_quality_score: 88,
      metadata: {
        seed: SEED_KEY,
        source_url: SOURCE_URL,
        source_name: 'LANCE! media kit + Creative OS marketing plan',
      },
    })
    .select('id')
    .single())

  await must('insert governance input', service
    .from('governance_inputs')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      source_document_id: sourceDocumentIds.marketingPlan ?? sourceDocumentIds.mediaKit,
      created_by: user.id,
      mode: 'file',
      prompt: 'Board Governance OS research seed for LANCE!',
      content: diagnosis,
      structured_data: {
        seed: SEED_KEY,
        metrics,
        marketing_metrics: marketingMetrics,
        source_references: sourceReferences,
      },
      metadata: { seed: SEED_KEY },
    }))

  const businessPlan = await must('insert business plan', service
    .from('business_plans')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      status: 'ready_for_review',
      diagnosis,
      priorities,
      kpis,
      workstreams: [
        { workstream: 'Break-news habit loop e atribuicao LANCE!', owner_suggestion: 'Marca + Editorial + Social', cadence: 'Semanal', proof_point: 'Branded search, saves/shares, follows e match-day owned-channel share.' },
        { workstream: 'App, CRM e dados first-party', owner_suggestion: 'Produto + Dados', cadence: 'Semanal', proof_point: 'Usuarios identificados, D7/D30, opt-in e receita por usuario.' },
        { workstream: 'DRE gerencial e receita de qualidade', owner_suggestion: 'Financeiro + CRO', cadence: 'Mensal', proof_point: 'DRE por linha, OCF, margem e concentracao.' },
        { workstream: 'Governanca editorial-comercial', owner_suggestion: 'Editorial + Juridico + Comercial', cadence: 'Mensal', proof_point: 'Politica de categorias, branded content, creators, betting e dados.' },
        { workstream: 'Pacotes premium e CRM comercial', owner_suggestion: 'Growth + Comercial', cadence: 'Quinzenal', proof_point: 'Receita direta, lift de campanha e recorrencia por segmento.' },
      ],
      timeline: {
        next_13_weeks: [
          'Semana 1-2: validar DRE gerencial, KPI tree e matriz de riscos.',
          'Semana 3-5: fechar gates de app/CRM, consentimento e segmentos comercializaveis.',
          'Semana 6-9: testar pacotes integrados app + CRM + social + creators.',
          'Semana 10-13: review board com resultados de retencao, receita e risco.',
        ],
        first_review_date: addDays(30),
      },
      risks,
      assumptions: [
        { title: 'Fontes primarias', detail: 'Diagnostico baseado no Midia Kit oficial LANCE! 2026 e no plano Creative OS de marketing, sem acesso a DRE/OCF internos.' },
        { title: 'Plano de governanca', detail: 'Recomendacoes devem ser revistas com dados financeiros e operacionais internos antes de aprovacao.' },
      ],
      completeness_score: 88,
      quality_score: 82,
    })
    .select('id')
    .single())

  const decisionCandidates = [
    {
      title: 'Aprovar reposicionamento para tornar LANCE! a fonte nomeada do torcedor 18-32',
      decision: 'proceed_with_conditions',
      rationale: 'O plano Creative OS mostra que LANCE! precisa fechar o gap entre trafego anonimo e reconhecimento de marca, criando razoes funcionais e sociais para ser escolhido pelo nome.',
      risk_level: 'high',
      confidence_score: 82,
      conditions: [
        { title: 'Baseline de marca', detail: 'Medir direct/branded search, awareness 18-32 e media buyer perception 25-35 antes da campanha.' },
        { title: 'Formato proprietario', detail: 'Definir break-news habit loop e brand moment campaign com atribuicao visivel de LANCE!.' },
      ],
      tradeoffs: [
        { title: 'Menos foco em alcance commodity', detail: 'Aceitar que nem todo volume sem atribuicao cria valor comercial defensavel.' },
      ],
    },
    {
      title: 'Priorizar LANCE! App e CRM first-party como eixo 2026',
      decision: 'proceed_with_conditions',
      rationale: 'A escala de audiencia cria opcao estrategica clara, mas o investimento deve ser governado por gates de retencao, dados e receita incremental.',
      risk_level: 'high',
      confidence_score: 78,
      conditions: [
        { title: 'Gate de dados', detail: 'Definir baseline de usuarios identificados, opt-in e preferencias.' },
        { title: 'Gate financeiro', detail: 'Aprovar investimento com DRE gerencial e OCF.' },
      ],
      tradeoffs: [
        { title: 'Mais foco em produto pode reduzir atencao a alcance de curto prazo.', detail: 'Aceitavel se gerar audiencia proprietaria e maior yield.' },
      ],
    },
    {
      title: 'Implantar DRE gerencial por produto e categoria comercial',
      decision: 'proceed',
      rationale: 'Sem visao financeira por linha, o board nao distingue crescimento saudavel de volume com margem baixa ou risco concentrado.',
      risk_level: 'medium',
      confidence_score: 82,
      conditions: [
        { title: 'Periodicidade', detail: 'Revisao mensal no board pack.' },
      ],
      tradeoffs: [
        { title: 'Mais disciplina comercial antes de escalar vendas.', detail: 'Aumenta qualidade de receita.' },
      ],
    },
    {
      title: 'Criar guardrails para betting, branded content, creators e dados',
      decision: 'proceed_with_conditions',
      rationale: 'A monetizacao esportiva pode criar risco reputacional e regulatorio se crescer sem criterios claros.',
      risk_level: 'high',
      confidence_score: 74,
      conditions: [
        { title: 'Politica aprovada', detail: 'Categorias, aprovadores e limites editoriais definidos.' },
      ],
      tradeoffs: [
        { title: 'Algumas receitas podem ser recusadas.', detail: 'Protege marca e confianca editorial.' },
      ],
    },
  ]

  const boardPack = await must('insert board pack', service
    .from('board_packs')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      business_plan_id: businessPlan.id,
      version: 1,
      status: 'ready',
      executive_summary: diagnosis,
      strategic_questions: [
        'Como LANCE! fecha o gap entre trafego anonimo e reconhecimento consciente entre torcedores 18-32?',
        'Qual porcentagem dos +25m fas impactados por mes deve virar audiencia identificada e recorrente?',
        'Que score prova que media buyers 25-35 voltaram a considerar LANCE! em planos de midia esportiva?',
        'Que DRE gerencial prova que app, CRM e dados first-party melhoram qualidade de receita?',
        'Qual limite de concentracao por anunciante, categoria e betting o board aceita?',
        'Quais guardrails protegem credibilidade editorial em branded content, creators e uso de dados?',
        'Qual cadencia semanal evita que editorial, produto e comercial otimizem objetivos conflitantes?',
      ],
      risk_map: risks,
      priority_ranking: priorities,
      meeting_agenda: [
        'Confirmar tese: alcance anonimo vs escolha consciente por LANCE!.',
        'Revisar plano Creative OS: break-news habit loop, creator layer, brand moment campaign e advertising proposition rebuild.',
        'Revisar lacunas financeiras: DRE, P&L, OCF, caixa, margem e concentracao.',
        'Aprovar KPI tree do app/CRM e gates de investimento.',
        'Debater guardrails de betting, branded content, creators e dados.',
        'Definir decisoes, owners e review dates dos proximos 30 dias.',
      ],
      decision_candidates: decisionCandidates,
      export_payload: {
        seed: SEED_KEY,
        source_references: sourceReferences,
        metrics,
        marketing_metrics: marketingMetrics,
        financial_report: financialReport,
        advisor_reports: advisorReports(),
      },
    })
    .select('id')
    .single())

  const boardSession = await must('insert board session', service
    .from('board_sessions')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      board_pack_id: boardPack.id,
      started_by: user.id,
      session_type: 'diagnostic',
      status: 'awaiting_founder',
      opened_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      closure_recommendation: 'commit_with_conditions',
      closure_summary: 'Prosseguir com reposicionamento Creative OS, LANCE! App/CRM e audiencia propria como eixos estrategicos, condicionados a baseline de marca 18-32, DRE gerencial, gates de retencao/dados, guardrails reputacionais e cadencia semanal de execucao.',
      usage_units_consumed: 1,
      metadata: { seed: SEED_KEY, source_url: SOURCE_URL },
    })
    .select('id')
    .single())

  const reviews = [
    {
      advisor_key: 'board_brain',
      advisor_name: 'Board Brain',
      stance: 'support_with_conditions',
      risk_score: 70,
      confidence_score: 82,
      perspective: 'A recomendacao sintetizada e comprometer com a tese Creative OS de tornar LANCE! a fonte nomeada do jovem torcedor, conectando reconhecimento 18-32, media buyer salience, app/CRM e receita de qualidade. Condicionar aceleracao a baselines de marca, evidencias financeiras, dados first-party, guardrails e cadencia de decisao.',
      strategic_questions: [
        'Quais evidencias internas faltam para transformar esse plano em decisao aprovada?',
        'Quem e responsavel por fechar cada gate antes da proxima review?',
        'Qual decisao deve ser registrada hoje para evitar drift estrategico?',
      ],
      recommendations: [
        { title: 'Commit with conditions', detail: 'Aprovar direcao estrategica e travar gates de marca, dados, caixa, receita e risco.', priority: 'urgent' },
        { title: 'Registrar decisao e follow-ups', detail: 'Criar owners e datas de revisao para os proximos 30 dias.', priority: 'urgent' },
      ],
      closure_recommendation: 'commit_with_conditions',
    },
    ...advisorReports(),
  ].map((review) => ({
    organization_id: organization.id,
    company_id: company.id,
    governance_cycle_id: governanceCycle.id,
    board_pack_id: boardPack.id,
    board_session_id: boardSession.id,
    advisor_key: review.advisor_key,
    advisor_name: review.advisor_name,
    status: 'complete',
    stance: review.stance,
    risk_score: review.risk_score,
    confidence_score: review.confidence_score,
    perspective: review.perspective,
    strategic_questions: review.strategic_questions,
    source_references: sourceReferences,
    recommendations: review.recommendations,
    closure_recommendation: review.closure_recommendation,
    raw_output: { seed: SEED_KEY, ...review },
  }))

  await must('insert agent reviews', service.from('agent_reviews').insert(reviews))

  await must('insert agent conversations', service.from('agent_conversations').insert([
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      board_session_id: boardSession.id,
      from_advisor_key: 'growth',
      to_advisor_key: 'risk',
      relationship: 'opposition',
      transcript: [
        { speaker: 'Growth Advisor', note: 'Acelerar app/CRM cria vantagem comercial defensavel.' },
        { speaker: 'Risk Advisor', note: 'Aceleracao sem guardrails de dados e betting pode ferir confianca.' },
      ],
      summary: 'Growth apoia aceleracao do break-news habit loop e app/CRM; Risk exige controles antes de escalar monetizacao e dados.',
      conflicts: ['Velocidade comercial e social vs guardrails de reputacao, dados e branded content.'],
      agreements: ['Ambos concordam que escolha consciente por LANCE! e owned audience sao eixos estrategicos.'],
    },
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      board_session_id: boardSession.id,
      from_advisor_key: 'finance',
      to_advisor_key: 'operator',
      relationship: 'agreement',
      transcript: [
        { speaker: 'Finance Advisor', note: 'DRE gerencial e OCF precisam entrar no board pack.' },
        { speaker: 'Operator Advisor', note: 'A cadencia semanal deve produzir esses dados e decisions owners.' },
      ],
      summary: 'Finance e Operator concordam que governanca financeira e ritual operacional precisam nascer juntos.',
      conflicts: [],
      agreements: ['DRE gerencial, owners e review dates sao pre-condicoes.'],
    },
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      board_session_id: boardSession.id,
      from_advisor_key: 'customer',
      to_advisor_key: 'talent',
      relationship: 'neutrality',
      transcript: [
        { speaker: 'Customer Advisor', note: 'A proposta de valor do torcedor precisa vir antes da oferta comercial.' },
        { speaker: 'Talent Advisor', note: 'Isso exige squad com capacidade de produto, dados e CRM.' },
      ],
      summary: 'Customer e Talent conectam experiencia do torcedor com capacidade organizacional.',
      conflicts: [],
      agreements: ['Sem capacidade dedicada, app tende a virar apenas outro canal de alcance.'],
    },
  ]))

  const boardMeeting = await must('insert board meeting', service
    .from('board_meetings')
    .insert({
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      board_session_id: boardSession.id,
      scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
      agenda: [
        'Reposicionamento Creative OS e baseline de marca',
        'App/CRM first-party',
        'DRE gerencial e receita de qualidade',
        'Guardrails de reputacao, betting e dados',
      ],
      attendees: ['Board Brain', 'Finance Advisor', 'Operator Advisor', 'Growth Advisor', 'Risk Advisor', 'Customer Advisor', 'Talent Advisor'],
    orchestrator_summary: 'Reuniao preparada para decidir commit with conditions sobre reposicionamento, app/CRM e receita de qualidade.',
    })
    .select('id')
    .single())

  const decisions = await must('insert decisions', service.from('decisions').insert(decisionCandidates.map((decision, index) => ({
    organization_id: organization.id,
    company_id: company.id,
    governance_cycle_id: governanceCycle.id,
    board_session_id: boardSession.id,
    created_by: user.id,
    user_id: user.id,
    title: decision.title,
    decision: decision.decision,
    status: 'candidate',
    closure_recommendation: decision.decision === 'proceed' ? 'commit' : 'commit_with_conditions',
    rationale: decision.rationale,
    risks: decision.risk_level,
    expected_outcome: decision.conditions.map((condition) => `${condition.title}: ${condition.detail}`).join('\n'),
    tradeoffs: decision.tradeoffs,
    risk_level: decision.risk_level,
    confidence_score: decision.confidence_score,
    conditions: decision.conditions,
    owner_label: ['Marca + Editorial + Growth', 'Produto + Dados', 'Financeiro + CRO', 'Editorial + Juridico'][index] ?? 'Board Brain',
    owner: ['Marca + Editorial + Growth', 'Produto + Dados', 'Financeiro + CRO', 'Editorial + Juridico'][index] ?? 'Board Brain',
    review_date: addDays(30 + index * 7),
    metadata: { seed: SEED_KEY, board_pack_id: boardPack.id },
  }))).select('id, title'))

  await must('insert meeting minutes', service.from('meeting_minutes').insert({
    organization_id: organization.id,
    company_id: company.id,
    governance_cycle_id: governanceCycle.id,
    board_meeting_id: boardMeeting.id,
    board_session_id: boardSession.id,
    minutes: 'Pre-minuta gerada pelo Board Brain: o board converge na tese de tornar LANCE! a fonte nomeada do jovem torcedor e construir owned audience, mas recomenda commit with conditions com gates de marca, financeiros, operacionais, reputacionais e de dados.',
    decisions_presented: decisionCandidates,
    conflicts_identified: [
      'Growth quer acelerar match-day formats, marca e monetizacao via app/CRM; Risk exige guardrails de dados, betting e editorial.',
      'Finance pede DRE/OCF antes de aprovar investimento; Operator pede cadencia semanal para produzir os dados.',
    ],
    final_recommendation: 'Aprovar direcao estrategica com condicoes e revisao em 30 dias.',
    closure_recommendation: 'commit_with_conditions',
  }))

  const brandDecisionId = decisions[0]?.id ?? null
  const appDecisionId = decisions[1]?.id ?? null
  const financeDecisionId = decisions[2]?.id ?? null
  const guardrailsDecisionId = decisions[3]?.id ?? null
  await must('insert follow ups', service.from('follow_ups').insert([
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      decision_id: brandDecisionId,
      source_agent_key: 'growth',
      user_id: user.id,
      owner_label: 'Marca + Editorial + Growth',
      owner: 'Marca + Editorial + Growth',
      title: 'Criar baseline de marca 18-32 e media buyers 25-35',
      action: 'Medir direct/branded search, unaided awareness, media buyer perception, owned social saves/shares e aggregator brand consistency.',
      description: 'Primeiro gate para aprovar o reposicionamento Creative OS.',
      priority: 'urgent',
      status: 'open',
      due_date: addDays(7),
    },
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      decision_id: appDecisionId,
      source_agent_key: 'operator',
      user_id: user.id,
      owner_label: 'Produto + Dados',
      owner: 'Produto + Dados',
      title: 'Fechar KPI tree do LANCE! App e CRM first-party',
      action: 'Definir North Star, D7/D30, usuarios identificados, opt-in, preferencias e receita por usuario.',
      description: 'Usar como primeiro gate da decisao sobre app/CRM.',
      priority: 'urgent',
      status: 'open',
      due_date: addDays(7),
    },
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      decision_id: financeDecisionId,
      source_agent_key: 'finance',
      user_id: user.id,
      owner_label: 'Financeiro + CRO',
      owner: 'Financeiro + CRO',
      title: 'Montar DRE gerencial e OCF por linha de negocio',
      action: 'Separar display/video, branded, creators, CRM, app, assinaturas, eventos e produtos adjacentes.',
      description: 'Base financeira para o proximo Board Pack.',
      priority: 'urgent',
      status: 'open',
      due_date: addDays(10),
    },
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      decision_id: guardrailsDecisionId,
      source_agent_key: 'risk',
      user_id: user.id,
      owner_label: 'Editorial + Juridico',
      owner: 'Editorial + Juridico',
      title: 'Aprovar guardrails de betting, branded content, creators e dados',
      action: 'Criar matriz de categorias, aprovadores, limites editoriais, consentimento e uso comercial de dados.',
      description: 'Condicao de risco para acelerar monetizacao.',
      priority: 'high',
      status: 'open',
      due_date: addDays(14),
    },
    {
      organization_id: organization.id,
      company_id: company.id,
      governance_cycle_id: governanceCycle.id,
      decision_id: brandDecisionId,
      source_agent_key: 'growth',
      user_id: user.id,
      owner_label: 'Growth + Comercial',
      owner: 'Growth + Comercial',
      title: 'Desenhar pacotes premium baseados em segmentos de torcedor',
      action: 'Combinar app, CRM, social, creators, newsletter, WhatsApp e push em ofertas mensuraveis.',
      description: 'Transformar dados first-party em produto comercial.',
      priority: 'high',
      status: 'open',
      due_date: addDays(21),
    },
  ]))

  await must('insert compatibility governance run', service.from('governance_runs').insert({
    company_id: company.id,
    user_id: user.id,
    title: 'LANCE! 2026 governance review',
    period: '2026-06',
    input_data: {
      seed: SEED_KEY,
      source_url: SOURCE_URL,
      kpis,
      priorities,
      risks,
      marketing_metrics: marketingMetrics,
    },
    raw_output: {
      seed: SEED_KEY,
      run: {
        title: 'LANCE! 2026 governance review',
        summary: diagnosis,
        risk_score: 70,
        confidence_score: 82,
      },
      board_pack: {
        executive_summary: diagnosis,
        strategic_questions: [
          'Como LANCE! vira escolha consciente entre torcedores 18-32?',
          'Qual parte da audiencia vira base first-party?',
          'Que DRE prova qualidade de receita?',
          'Quais guardrails protegem marca e dados?',
        ],
        risk_map: risks,
        priority_ranking: priorities,
        meeting_agenda: [
          'Reposicionamento Creative OS e baseline de marca',
          'App/CRM first-party',
          'DRE gerencial',
          'Guardrails de reputacao e dados',
        ],
      },
      decision: decisionCandidates[0],
      follow_ups_created: 5,
    },
    model_provider: 'research_seed',
    model_name: 'official-media-kit-plus-creative-os-marketing-plan',
    risk_score: 70,
    confidence_score: 82,
    executive_summary: diagnosis,
    board_pack: {
      executive_summary: diagnosis,
      strategic_questions: [
        'Como LANCE! vira escolha consciente entre torcedores 18-32?',
        'Qual parte da audiencia vira base first-party?',
        'Que DRE prova qualidade de receita?',
        'Quais guardrails protegem marca e dados?',
      ],
      risk_map: risks,
      priority_ranking: priorities,
      meeting_agenda: [
        'Reposicionamento Creative OS e baseline de marca',
        'App/CRM first-party',
        'DRE gerencial',
        'Guardrails de reputacao e dados',
      ],
    },
    strategic_questions: [
      'Como LANCE! vira escolha consciente entre torcedores 18-32?',
      'Qual parte da audiencia vira base first-party?',
      'Que DRE prova qualidade de receita?',
      'Quais guardrails protegem marca e dados?',
    ],
    risk_map: risks,
    priority_ranking: priorities,
    governance_score: {
      total: 88,
      explanation: 'Forte base publica de audiencia/produto e plano de marketing com KPIs; lacunas financeiras e operacionais internas ainda limitam confianca.',
    },
    meeting_agenda: [
      'Reposicionamento Creative OS e baseline de marca',
      'App/CRM first-party',
      'DRE gerencial',
      'Guardrails de reputacao e dados',
    ],
    follow_up_tracker: [
      'Criar baseline de marca 18-32 e media buyers 25-35',
      'Fechar KPI tree do app e CRM',
      'Montar DRE gerencial e OCF',
      'Aprovar guardrails',
      'Desenhar pacotes premium',
    ],
    status: 'complete',
  }))

  await must('insert audit event', service.from('audit_events').insert({
    organization_id: organization.id,
    company_id: company.id,
    actor_user_id: user.id,
    event_type: 'seed.lance_governance_cycle_created',
    entity_type: 'governance_cycle',
    entity_id: governanceCycle.id,
    metadata: {
      seed: SEED_KEY,
      source_url: SOURCE_URL,
      board_pack_id: boardPack.id,
      board_session_id: boardSession.id,
      decisions_created: decisions.length,
    },
  }))

  return {
    governanceCycleId: governanceCycle.id,
    boardPackId: boardPack.id,
    boardSessionId: boardSession.id,
    decisionsCreated: decisions.length,
  }
}

async function main() {
  const user = await resolveTargetUser()
  const organization = await ensureOrganization(user)
  const company = await ensureCompany(organization, user)
  await cleanupSeed(company)

  const sourceDocumentIds = {
    mediaKit: await uploadMediaKit(organization, company, user),
    marketingPlan: await uploadMarketingPlan(organization, company, user),
  }
  await must('insert company brain entries', service.from('company_brain_entries').insert(brainEntries(organization, company, user, sourceDocumentIds)))
  const chain = await seedGovernanceChain(organization, company, user, sourceDocumentIds)

  console.log(JSON.stringify({
    seeded: true,
    seed: SEED_KEY,
    user: { id: user.id, email: user.email, fullName: user.fullName },
    organization,
    company,
    sourceDocumentIds,
    ...chain,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
