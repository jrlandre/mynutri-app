/**
 * Cenário 1 — Baseline: texto anônimo, carga mínima
 *
 * Objetivo: Estabelecer P50/P95/P99 de referência para requests de texto
 * sem autenticação. É sempre o primeiro teste a rodar — sem referência não
 * há como interpretar os outros cenários.
 *
 * Uso:
 *   BASE_URL=https://staging.mynutri.pro k6 run load-tests/analyze-baseline.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

const latencyTrend = new Trend('req_duration_ms', true)
const errorRate = new Rate('server_errors')
const rateLimitCounter = new Counter('rate_limit_hits')

export const options = {
  vus: 5,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<8000', 'p(99)<15000'],
    server_errors: ['rate<0.01'],       // < 1% de 5xx
    http_req_failed: ['rate<0.05'],     // < 5% de falhas HTTP totais (inclui 429)
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const TEXT_PROMPTS = [
  'O que tem de nutritivo em uma banana?',
  'Quantas calorias tem um ovo cozido?',
  'É saudável comer aveia todos os dias?',
  'Quais alimentos têm mais proteína?',
  'O que é índice glicêmico?',
]

export default function () {
  const prompt = TEXT_PROMPTS[Math.floor(Math.random() * TEXT_PROMPTS.length)]

  const payload = JSON.stringify({
    messages: [],
    newMessage: {
      contentType: 'text',
      content: prompt,
    },
  })

  const res = http.post(`${BASE_URL}/api/analyze`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  })

  latencyTrend.add(res.timings.duration)
  errorRate.add(res.status >= 500)
  if (res.status === 429) rateLimitCounter.add(1)

  check(res, {
    'resposta válida (200 ou 429)': (r) => r.status === 200 || r.status === 429,
    'latência < 30s': (r) => r.timings.duration < 30000,
    'sem 5xx': (r) => r.status < 500,
  })

  // Intervalo entre requests para simular usuário real (não hammer test)
  sleep(2 + Math.random() * 2)
}

export function handleSummary(data) {
  return {
    stdout: formatSummary('Baseline', data),
  }
}

function formatSummary(name, data) {
  const d = data.metrics.http_req_duration
  if (!d) return `[${name}] Sem dados de latência.\n`
  return `
=== ${name} ===
P50:  ${d.values['p(50)']?.toFixed(0) ?? 'n/a'}ms
P95:  ${d.values['p(95)']?.toFixed(0) ?? 'n/a'}ms
P99:  ${d.values['p(99)']?.toFixed(0) ?? 'n/a'}ms
Reqs: ${data.metrics.http_reqs?.values?.count ?? 'n/a'}
429s: ${data.metrics.rate_limit_hits?.values?.count ?? 0}
5xx:  ${(data.metrics.server_errors?.values?.rate * 100)?.toFixed(2) ?? '0'}%
`
}
