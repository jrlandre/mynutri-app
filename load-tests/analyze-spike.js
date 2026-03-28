/**
 * Cenário 3 — Spike Test: tráfego repentino de 5→50 VUs
 *
 * Objetivo: Validar comportamento do rate limiting sob carga extrema:
 * - O rate limiter (proxy.ts + analyze/route.ts) DEVE disparar
 * - A taxa de 5xx deve permanecer < 10% (rate limiting retorna 429, não 5xx)
 * - O sistema deve se recuperar quando a carga cair
 *
 * Thresholds propositalmente mais frouxos aqui — 429s são esperados e corretos.
 *
 * Uso:
 *   BASE_URL=https://staging.mynutri.pro k6 run load-tests/analyze-spike.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Counter, Trend } from 'k6/metrics'

const errorRate      = new Rate('server_errors_5xx')
const rateLimitRate  = new Rate('rate_limited_429')
const latency200     = new Trend('latency_200_ms', true)

export const options = {
  stages: [
    { duration: '30s', target: 5  },   // warm-up — baseline antes do spike
    { duration: '30s', target: 50 },   // spike repentino
    { duration: '1m',  target: 50 },   // sustenta o spike
    { duration: '30s', target: 5  },   // recovery — validar que o sistema normaliza
    { duration: '30s', target: 5  },   // steady state pós-recovery
  ],
  thresholds: {
    // Erros reais (5xx) devem ser < 10% mesmo no pico
    server_errors_5xx: ['rate<0.10'],
    // P95 das respostas 200 (as que passaram pelo rate limit) deve ser aceitável
    latency_200_ms: ['p(95)<12000'],
    // Não testar http_req_failed globalmente aqui — esperamos muitos 429
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const payload = JSON.stringify({
    messages: [],
    newMessage: {
      contentType: 'text',
      content: 'Quantas calorias tem um ovo?',
    },
  })

  const res = http.post(`${BASE_URL}/api/analyze`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  })

  const is5xx = res.status >= 500
  const is429 = res.status === 429
  const is200 = res.status === 200

  errorRate.add(is5xx)
  rateLimitRate.add(is429)
  if (is200) latency200.add(res.timings.duration)

  check(res, {
    'não é 5xx (erros reais)': (r) => r.status < 500,
    // 429 é resposta CORRETA durante o spike — não é falha
    '200 ou 429 ou 400': (r) => [200, 400, 429].includes(r.status),
  })

  // Sem sleep intencional — queremos hammer máximo para estressar o rate limit
  sleep(0.1)
}

export function handleSummary(data) {
  const rl = data.metrics.rate_limited_429
  const err = data.metrics.server_errors_5xx
  const lat = data.metrics.latency_200_ms
  const total = data.metrics.http_reqs?.values?.count ?? 0

  const rlCount  = Math.round((rl?.values?.rate ?? 0) * total)
  const errCount = Math.round((err?.values?.rate ?? 0) * total)

  console.log(`
=== Spike Test ===
Total requests:  ${total}
429 (rate limit): ${rlCount} (${((rl?.values?.rate ?? 0) * 100).toFixed(1)}%) ← esperado durante spike
5xx (erros reais): ${errCount} (${((err?.values?.rate ?? 0) * 100).toFixed(1)}%) ← deve ser < 10%
P95 latência (200s): ${lat?.values['p(95)']?.toFixed(0) ?? 'n/a'}ms
P99 latência (200s): ${lat?.values['p(99)']?.toFixed(0) ?? 'n/a'}ms
`)
}
