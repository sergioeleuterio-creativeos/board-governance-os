#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'https://www.board-os.ai').replace(/\/$/, '')
const mobileHeaders = {
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}

const publicRoutes = ['/', '/login', '/reset-password', '/privacy', '/terms']
const protectedRoutes = [
  '/dashboard',
  '/company',
  '/governance-run',
  '/board-pack',
  '/board-pack/presentation',
  '/shadow-board',
  '/decisions',
  '/follow-ups',
  '/admin',
  '/admin/training-packs',
  '/admin/ai',
  '/demo/lance',
]

async function checkPublic(route) {
  const response = await fetch(`${baseUrl}${route}`, { headers: mobileHeaders, redirect: 'manual' })
  if (response.status !== 200) {
    throw new Error(`Expected ${route} to return 200 for mobile UA, got ${response.status}`)
  }
  console.log(`OK public mobile ${route}`)
}

async function checkProtected(route) {
  const response = await fetch(`${baseUrl}${route}`, { headers: mobileHeaders, redirect: 'manual' })
  const location = response.headers.get('location') || ''
  if (![302, 303, 307, 308].includes(response.status) || !location.includes('/login')) {
    throw new Error(`Expected ${route} to redirect mobile visitor to login, got ${response.status} ${location}`)
  }
  console.log(`OK protected mobile redirect ${route}`)
}

console.log(`Mobile route QA: ${baseUrl}`)
for (const route of publicRoutes) await checkPublic(route)
for (const route of protectedRoutes) await checkProtected(route)
