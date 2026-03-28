/**
 * Cenário 4 — Sustained Load: 10 VUs por 8 minutos
 *
 * Objetivo: Identificar degradação ao longo do tempo:
 * - Esgotamento do connection pool do Supabase (Free: 15 conns)
 * - Memory leaks nas Vercel Functions
 * - Latência crescente indicando conexões em fila
 * - Comportamento do Gemini API com requests paralelos sustentados
 *
 * Monitorar durante a execução:
 * - Supabase Dashboard → Database → Reports → Connections
 * - Vercel Dashboard → Functions → P99 duration over time
 * - Upstash Console → Operations/sec
 *
 * Uso:
 *   BASE_URL=https://staging.mynutri.pro k6 run load-tests/analyze-sustained.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

// Janelas de 2 minutos para detectar degradação ao longo do tempo
const latencyWindow1 = new Trend('latency_min0_2',  true)
const latencyWindow2 = new Trend('latency_min2_4',  true)
const latencyWindow3 = new Trend('latency_min4_6',  true)
const latencyWindow4 = new Trend('latency_min6_8',  true)
const errorRate      = new Rate('server_errors')
const rateLimitCount = new Counter('rate_limit_hits')

export const options = {
  vus: 10,
  duration: '8m',
  thresholds: {
    // A latência P95 NÃO deve degradar mais de 50% do início ao fim
    latency_min0_2: ['p(95)<8000'],
    latency_min6_8: ['p(95)<12000'],   // tolerância maior ao final, mas controlada
    server_errors:  ['rate<0.02'],
    http_req_failed: ['rate<0.10'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Timestamps para dividir em janelas
let testStartTime = null

export function setup() {
  return { startTime: Date.now() }
}

const TEXT_PROMPTS = [
  'O que é proteína?',
  'Quais são os macronutrientes?',
  'O que é vitamina D?',
  'Posso tomar whey antes de dormir?',
  'Qual a diferença entre dieta e reeducação alimentar?',
]

export default function (data) {
  if (!testStartTime) testStartTime = data.startTime

  const payload = JSON.stringify({
    messages: [],
    newMessage: {
      contentType: 'text',
      content: TEXT_PROMPTS[Math.floor(Math.random() * TEXT_PROMPTS.length)],
    },
  })

  const res = http.post(`${BASE_URL}/api/analyze`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '35s',
  })

  const elapsed = (Date.now() - (testStartTime || Date.now())) / 1000 / 60 // minutos

  // Distribuir em janelas de 2 minutos para detectar degradação progressiva
  if (res.status === 200) {
    if      (elapsed < 2) latencyWindow1.add(res.timings.duration)
    else if (elapsed < 4) latencyWindow2.add(res.timings.duration)
    else if (elapsed < 6) latencyWindow3.add(res.timings.duration)
    else                  latencyWindow4.add(res.timings.duration)
  }

  errorRate.add(res.status >= 500)
  if (res.status === 429) rateLimitCount.add(1)

  check(res, {
    'sem 5xx': (r) => r.status < 500,
    'resposta válida': (r) => [200, 400, 429].includes(r.status),
  })

  sleep(1 + Math.random() * 1.5)
}

export function handleSummary(data) {
  const w1 = data.metrics.latency_min0_2
  const w2 = data.metrics.latency_min2_4
  const w3 = data.metrics.latency_min4_6
  const w4 = data.metrics.latency_min6_8

  const p95 = (m) => m?.values['p(95)']?.toFixed(0) ?? 'n/a'

  const degradation = w1 && w4
    ? (((w4.values['p(95)'] - w1.values['p(95)']) / w1.values['p(95)']) * 100).toFixed(1)
    : 'n/a'

  console.log(`
=== Sustained Load (10 VUs × 8 min) ===
P95 por janela de 2 min:
  0–2 min:  ${p95(w1)}ms
  2–4 min:  ${p95(w2)}ms
  4–6 min:  ${p95(w3)}ms
  6–8 min:  ${p95(w4)}ms

Degradação de P95 (início → fim): ${degradation}%
  ✓ Saudável: < 30%
  ⚠ Atenção:  30–50%
  ✗ Problema: > 50% → investigar connection pool, memory leak ou quota Gemini

429s: ${data.metrics.rate_limit_hits?.values?.count ?? 0}
5xx:  ${((data.metrics.server_errors?.values?.rate ?? 0) * 100).toFixed(2)}%
Total reqs: ${data.metrics.http_reqs?.values?.count ?? 0}
`)
}
