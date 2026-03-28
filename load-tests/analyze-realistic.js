/**
 * Cenário 2 — Carga Realista: mix de tipos de conteúdo, usuários mistos
 *
 * Objetivo: Simular tráfego de produção real com:
 * - 70% requests de texto (mais baratos)
 * - 20% requests de imagem (pequena, base64 sintético)
 * - 10% requests com subdomínio de tenant (adiciona query de resolveTenant)
 * - Mix de usuários anônimos e autenticados
 *
 * Uso:
 *   BASE_URL=https://staging.mynutri.pro \
 *   TENANT_SUBDOMAIN=demo \
 *   k6 run load-tests/analyze-realistic.js
 *
 * Nota: para testar usuários autenticados, fornecer:
 *   SESSION_COOKIE="sb-[...]=...; sb-[...]=..."
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

const latencyText  = new Trend('latency_text_ms', true)
const latencyImage = new Trend('latency_image_ms', true)
const errorRate    = new Rate('server_errors')
const rateLimitCounter = new Counter('rate_limit_hits')

export const options = {
  stages: [
    { duration: '1m',  target: 10 },  // ramp-up gradual
    { duration: '5m',  target: 20 },  // carga sustentada (normal production)
    { duration: '1m',  target: 0  },  // ramp-down
  ],
  thresholds: {
    latency_text_ms:  ['p(95)<8000',  'p(99)<15000'],
    latency_image_ms: ['p(95)<15000', 'p(99)<25000'],
    server_errors:    ['rate<0.01'],
    http_req_failed:  ['rate<0.05'],
  },
}

const BASE_URL        = __ENV.BASE_URL        || 'http://localhost:3000'
const TENANT_SUBDOMAIN = __ENV.TENANT_SUBDOMAIN || null
const SESSION_COOKIE  = __ENV.SESSION_COOKIE   || null

// Imagem 1x1 PNG em base64 (mínima, para testar o pipeline sem consumir quota de imagem real)
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const TEXT_PROMPTS = [
  'Qual a diferença entre carboidratos simples e complexos?',
  'Quantas calorias tem 100g de frango grelhado?',
  'O que é proteína whey e para que serve?',
  'Quais são os benefícios do ômega 3?',
  'Posso comer macarrão e ainda perder peso?',
  'Quanto de proteína devo consumir por dia?',
  'O que é déficit calórico?',
]

export default function () {
  const roll = Math.random()
  const useTenant = TENANT_SUBDOMAIN && roll < 0.1
  const useImage  = roll >= 0.1 && roll < 0.3
  const useAuth   = SESSION_COOKIE && roll >= 0.5

  const headers = { 'Content-Type': 'application/json' }
  if (useAuth) headers['Cookie'] = SESSION_COOKIE

  let payload
  let contentType

  if (useImage) {
    contentType = 'image'
    payload = JSON.stringify({
      messages: [],
      newMessage: {
        contentType: 'image',
        content: TINY_PNG_BASE64,
        mimeType: 'image/png',
      },
      ...(useTenant ? { tenantSubdomain: TENANT_SUBDOMAIN } : {}),
    })
  } else {
    contentType = 'text'
    const prompt = TEXT_PROMPTS[Math.floor(Math.random() * TEXT_PROMPTS.length)]
    payload = JSON.stringify({
      messages: [],
      newMessage: { contentType: 'text', content: prompt },
      ...(useTenant ? { tenantSubdomain: TENANT_SUBDOMAIN } : {}),
    })
  }

  const res = http.post(`${BASE_URL}/api/analyze`, payload, {
    headers,
    timeout: '35s',
  })

  errorRate.add(res.status >= 500)
  if (res.status === 429) rateLimitCounter.add(1)

  if (contentType === 'image') {
    latencyImage.add(res.timings.duration)
  } else {
    latencyText.add(res.timings.duration)
  }

  check(res, {
    'sem 5xx': (r) => r.status < 500,
    'resposta válida': (r) => [200, 400, 429].includes(r.status),
  })

  sleep(1.5 + Math.random() * 3)
}

export function handleSummary(data) {
  const t = data.metrics.latency_text_ms
  const i = data.metrics.latency_image_ms
  console.log(`
=== Realístico ===
Texto  P95: ${t?.values['p(95)']?.toFixed(0) ?? 'n/a'}ms | P99: ${t?.values['p(99)']?.toFixed(0) ?? 'n/a'}ms
Imagem P95: ${i?.values['p(95)']?.toFixed(0) ?? 'n/a'}ms | P99: ${i?.values['p(99)']?.toFixed(0) ?? 'n/a'}ms
429s: ${data.metrics.rate_limit_hits?.values?.count ?? 0}
5xx:  ${((data.metrics.server_errors?.values?.rate ?? 0) * 100).toFixed(2)}%
`)
}
