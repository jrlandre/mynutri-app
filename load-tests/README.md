# Load Tests — /api/analyze

Scripts k6 para validar o comportamento do endpoint principal de IA sob carga.

## Pré-requisitos

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Docker (qualquer plataforma)
docker run --rm -i grafana/k6 run - <script.js

# Verificar instalação
k6 version
```

> **Importante:** Rodar contra ambiente **staging**, nunca produção.
> O staging deve ter sua própria Gemini API Key e Supabase project.

---

## Sequência de Execução Recomendada

Sempre rodar nesta ordem — cada cenário assume que você conhece o resultado do anterior.

### 1. Baseline (sempre primeiro)

Estabelece os números de referência. Sem baseline, nenhum outro resultado tem contexto.

```bash
BASE_URL=https://staging.mynutri.pro \
  k6 run load-tests/analyze-baseline.js
```

**O que verificar:**
- P95 < 8s para texto ✓
- Taxa de 5xx < 1% ✓
- Se P95 > 8s já no baseline, o problema está na Gemini API ou na cadeia de DB — não no load

---

### 2. Carga Realista

Simula tráfego de produção com mix de tipos de conteúdo e usuários.

```bash
BASE_URL=https://staging.mynutri.pro \
  TENANT_SUBDOMAIN=demo \
  k6 run load-tests/analyze-realistic.js
```

**Variáveis de ambiente:**
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BASE_URL` | Sim | URL base do ambiente de staging |
| `TENANT_SUBDOMAIN` | Não | Subdomínio de expert para testar multi-tenant (10% dos requests) |
| `SESSION_COOKIE` | Não | Cookie de sessão para testar usuários autenticados (50% dos requests se fornecido) |

**Para obter SESSION_COOKIE:**
1. Logar em staging no browser
2. DevTools → Application → Cookies → copiar os cookies `sb-*`
3. Passar como string: `SESSION_COOKIE="sb-xxx=abc; sb-yyy=def"`

**O que verificar:**
- P95 texto < 8s ✓
- P95 imagem < 15s ✓
- Sem 5xx ✓
- Se 429s > 10% com 20 VUs: revisar thresholds do rate limiting

---

### 3. Spike Test

Valida que o rate limiting funciona e que o sistema se recupera após pico.

```bash
BASE_URL=https://staging.mynutri.pro \
  k6 run load-tests/analyze-spike.js
```

**O que verificar:**
- 429s DEVEM aparecer durante o spike — é o comportamento correto ✓
- 5xx DEVEM ser < 10% — se for mais, rate limiting não está segurando ✗
- P95 das respostas 200 < 12s ✓
- Latência deve voltar ao normal após recovery (últimos 30s do teste)

**Atenção:** Este teste tem `sleep(0.1)` — hammer intencional. Não rodar por mais de 3 minutos.

---

### 4. Sustained Load

Detecta degradação ao longo do tempo (connection pool, memory leaks).

```bash
BASE_URL=https://staging.mynutri.pro \
  k6 run load-tests/analyze-sustained.js
```

**Monitorar em paralelo durante o teste:**
- **Supabase Dashboard** → Database → Reports → Connections (verificar se chega perto do limite)
- **Vercel Dashboard** → Functions → `/api/analyze` → P99 duration over time
- **Upstash Console** → Operations/sec (verificar padrão do rate limiting)
- **Gemini Console** → Quota usage

**O que verificar:**
- Degradação de P95 do início ao fim < 30% ✓
- 30–50%: atenção — investigar
- > 50%: problema real — connection pool esgotado ou quota Gemini atingida

---

## Thresholds de Aceitação

| Métrica | Carga Normal (20 VUs) | Spike (50 VUs) | Sustained (10 VUs × 8min) |
|---------|-----------------------|----------------|--------------------------|
| P50 texto | < 4s | < 6s | < 5s |
| P95 texto | < 8s | < 12s | < 10s |
| P95 imagem | < 15s | < 20s | < 18s |
| Taxa 5xx | < 1% | < 10% | < 2% |
| Taxa 429 | < 5% (normal) | até 80% (esperado) | < 5% |
| Degradação P95 | — | — | < 30% |

---

## Interpretando Resultados

### P95 acima do threshold

1. **Sempre alto mesmo com 5 VUs (baseline):** problema na Gemini API (latência intrínseca ou quota esgotada). Verificar Gemini Console.
2. **Cresce com o número de VUs:** connection pool do Supabase sendo saturado. Verificar Supabase Dashboard → Connections. Considerar upgrade de plano ou otimizar queries.
3. **Alto apenas para imagens:** compressão de imagem + Gemini multimodal é mais lento por design. Considerar retornar streaming response.

### Taxa de 5xx > 1%

1. Verificar Vercel logs para identificar qual erro está ocorrendo
2. Se `checkAndIncrementUsage` falha: Supabase RPC com erro — verificar connection pool
3. Se `analyzeMessage` falha: quota Gemini esgotada ou timeout de 60s atingido
4. Se ambos falham: provavelmente connection pool esgotado

### Rate limiting não dispara no spike test

Verificar se as variáveis de ambiente do KV estão configuradas no staging:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Sem essas variáveis, o rate limiting está desativado por design (graceful degradation).

### Degradação no sustained test > 50%

1. Verificar Supabase Connections — se próximo de 15 (Free) ou 25 (Pro): upgrade necessário
2. Verificar se há queries sem índice (seção 3 do `docs/supabase-ops.md`)
3. Verificar Gemini quota no Google AI Studio Console

---

## Configuração Mínima de Staging

Para resultados válidos, o ambiente de staging deve ter:

```env
# Vercel project staging
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]
GOOGLE_AI_API_KEY=[staging-gemini-key]   # quota separada de produção
KV_REST_API_URL=[staging-kv-url]         # Upstash KV dedicado
KV_REST_API_TOKEN=[staging-kv-token]
NEXT_PUBLIC_APP_URL=https://staging.mynutri.pro
```

**Por que quota separada para o Gemini?** O load test vai consumir muitas requisições. Se usar a mesma API Key de produção, você pode esgotar a quota e afetar usuários reais.

---

## Otimizações Identificadas Antes do Teste

Com base na análise estática do código, as seguintes otimizações têm maior impacto esperado (confirmar com os dados reais após rodar os testes):

1. **Cache `resolveTenant()` no proxy.ts** — hoje faz 1 query ao Supabase em CADA request para `/api/*`, mesmo sem subdomínio. Cache com TTL de 5 minutos elimina essa query na maioria dos requests.

2. **Paralelizar `auth.getUser()` com `buildIpRatelimit()`** — hoje são sequenciais em `app/api/analyze/route.ts`. Rodar em `Promise.all()` economiza ~30–50ms por request.

3. **Otimizar `checkAndIncrementUsage()`** — faz 2 queries sequenciais para usuários autenticados (clients → experts) antes de chegar na RPC. Consolidar em uma única RPC que retorna o tier elimina 1–2 round-trips.

> Implementar essas otimizações **após** rodar os testes — os dados reais podem revelar gargalo diferente do esperado.
