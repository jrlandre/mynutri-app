# Supabase — Runbook Operacional

**Projeto:** MyNutri
**Plano atual:** verificar em [app.supabase.com](https://app.supabase.com) → Settings → Billing
**Atualizado em:** 2026-03-28

---

## 1. Checklist de Verificação Inicial

Execute esse checklist ao provisionar um novo ambiente ou após mudança de plano.

```
□ Database → Backups
    Confirmar que o schedule está ativo e que o último backup foi bem-sucedido.
    Free: diário, 7 dias de retenção.  Pro: diário, 30 dias de retenção.

□ Database → Extensions
    Verificar que pg_stat_statements está HABILITADO.
    Se não estiver: SQL Editor → "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

□ Database → Connection Pooling
    Anotar: Pool Mode (transaction), Pool Size.
    Free: 15 conexões. Pro: 25 conexões.
    Referência para o threshold de alerta no monitoramento.

□ Authentication → Policies (RLS)
    Confirmar que TODAS as tabelas abaixo têm Row Level Security HABILITADA:
      - experts
      - clients
      - usage
      - chat_sessions
      - chat_messages
      - referrals
      - commissions
    Comando de verificação:
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;

□ Storage → Usage
    Verificar crescimento. Configurar alerta de 80% no dashboard se disponível.

□ Settings → API
    Confirmar que SUPABASE_SERVICE_ROLE_KEY está no Vercel e não exposta em .env.local commitado.
```

---

## 2. Queries de Diagnóstico

Execute no **SQL Editor** do Supabase Dashboard.

### 2.1 Queries mais lentas (top 10)

```sql
SELECT
  calls,
  round(mean_exec_time::numeric, 2)  AS mean_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(stddev_exec_time::numeric, 2) AS stddev_ms,
  left(query, 150) AS query_snippet
FROM pg_stat_statements
WHERE mean_exec_time > 100   -- alterar para 1000 para ver apenas >1s
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2.2 Crescimento de tabelas críticas

```sql
SELECT
  relname                                         AS table_name,
  pg_size_pretty(pg_total_relation_size(relid))   AS total_size,
  pg_size_pretty(pg_relation_size(relid))         AS table_size,
  pg_size_pretty(pg_indexes_size(relid))          AS index_size,
  n_live_tup                                      AS row_count,
  n_dead_tup                                      AS dead_rows
FROM pg_stat_user_tables
WHERE relname IN ('usage', 'chat_messages', 'chat_sessions', 'referrals', 'clients', 'experts')
ORDER BY pg_total_relation_size(relid) DESC;
```

### 2.3 Conexões ativas ao banco

```sql
SELECT
  count(*)                    AS total_connections,
  state,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, wait_event_type, wait_event
ORDER BY total_connections DESC;
```

### 2.4 Verificar idempotência — usage por IP hoje

```sql
SELECT ip, user_id, analysis_count, date
FROM usage
WHERE date = current_date
ORDER BY analysis_count DESC
LIMIT 20;
```

### 2.5 Referrals com status pendente há mais de 35 dias (possível problema no cron)

```sql
SELECT id, promoter_id, referred_expert_id, status, clears_at, created_at
FROM referrals
WHERE status = 'pending'
  AND clears_at < now() - interval '5 days'
ORDER BY clears_at;
```

---

## 3. Índices Recomendados

Verificar se os índices abaixo existem antes de ir para produção com carga.

```sql
-- Verificar índices existentes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Índices críticos para as queries mais frequentes:

```sql
-- usage: consultada em todo request /api/analyze (check_and_increment_usage RPC)
CREATE INDEX IF NOT EXISTS idx_usage_user_date  ON usage (user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_ip_date    ON usage (ip, date) WHERE ip IS NOT NULL;

-- chat_messages: carregada em cada sessão de chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at DESC);

-- chat_sessions: listagem do histórico do usuário
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions (user_id, updated_at DESC);

-- referrals: consultada nos webhooks Stripe e no cron de comissões
CREATE INDEX IF NOT EXISTS idx_referrals_subscription ON referrals (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invoice       ON referrals (stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status_clears ON referrals (status, clears_at) WHERE status = 'pending';

-- clients: consultada em todo request /api/analyze (checkAndIncrementUsage)
CREATE INDEX IF NOT EXISTS idx_clients_user_active ON clients (user_id, active) WHERE active = true;

-- experts: consultada no proxy.ts em todo request (resolveTenant)
CREATE INDEX IF NOT EXISTS idx_experts_subdomain_active ON experts (subdomain) WHERE active = true;
```

---

## 4. Procedimento de Restore

### 4.1 Restore via Dashboard (ponto-no-tempo — apenas Pro + PITR)

1. Acessar **Database → Backups** no dashboard do projeto
2. Selecionar o backup pelo timestamp desejado
3. Clicar em **Restore** — confirmar que entende que o banco será sobrescrito
4. Aguardar conclusão (pode levar 5–30 minutos dependendo do tamanho)
5. Após restore: executar queries de verificação da seção 2 para confirmar integridade
6. Avisar equipe — **todas as sessões ativas serão encerradas**

### 4.2 Restore para ambiente staging (recomendado antes de aplicar em prod)

1. Criar novo projeto Supabase (staging)
2. Em Database → Backups do projeto de produção: **Download** o backup desejado
3. Restaurar no projeto staging via `psql` ou Supabase CLI:
   ```bash
   supabase db push --db-url "postgresql://postgres:[senha]@[host-staging]:5432/postgres" < backup.sql
   ```
4. Validar dados no staging antes de proceder com produção

### 4.3 Checklist pós-restore

```
□ Executar query 2.3 — confirmar que conexões estão estabilizando
□ Verificar tabela 'experts' — todos os experts esperados estão presentes e ativos
□ Verificar tabela 'usage' — contagem de hoje está razoável
□ Testar endpoint /api/analyze com usuário real
□ Confirmar que webhooks do Stripe continuam funcionando (verificar Stripe Dashboard → Webhooks → eventos recentes)
□ Confirmar que cron jobs rodaram no horário esperado (verificar Vercel → Cron)
```

---

## 5. Monitoramento Ativo

### 5.1 Uptime externo (configurar uma vez)

Usar **UptimeRobot** (free) ou **Better Stack**:

- **URL monitorada:** `https://[SUPABASE_URL]/rest/v1/`
- **Method:** GET
- **Header:** `apikey: [SUPABASE_ANON_KEY]`
- **Alerta:** se HTTP != 200 por 2+ minutos consecutivos
- **Notificação:** Slack/email/PagerDuty da equipe

### 5.2 Supabase Edge Function para alertas de slow queries (opcional)

Criar uma Edge Function agendada (cron diário) no Supabase:

```typescript
// supabase/functions/monitor-slow-queries/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data } = await supabase.rpc('get_slow_queries') // ou query direta

  const slowQueries = (data ?? []).filter((r: { mean_ms: number }) => r.mean_ms > 1000)

  if (slowQueries.length > 0) {
    // Enviar alerta via webhook (Slack, PagerDuty, etc.)
    await fetch(Deno.env.get('ALERT_WEBHOOK_URL')!, {
      method: 'POST',
      body: JSON.stringify({
        text: `⚠️ MyNutri — ${slowQueries.length} queries lentas detectadas`,
        attachments: slowQueries.slice(0, 5).map((q: { mean_ms: number; query_snippet: string }) => ({
          text: `${q.mean_ms}ms: ${q.query_snippet}`
        }))
      })
    })
  }

  return new Response('ok')
})
```

Agendar no `supabase/functions/monitor-slow-queries/config.toml`:
```toml
[cron]
schedule = "0 9 * * *"  # diário às 9h UTC
```

### 5.3 Alertas de uso do plano

No dashboard Supabase → Settings → Usage Alerts:
- **Database size:** alerta em 80% do limite do plano
- **Storage:** alerta em 80%
- **Bandwidth:** alerta em 80%
- **API requests:** verificar se o volume está dentro do esperado

---

## 6. Limites do Plano e Thresholds de Alerta

| Recurso | Free Plan | Pro Plan | Alerta em |
|---------|-----------|----------|-----------|
| Banco de dados | 500 MB | 8 GB | 80% |
| Storage | 1 GB | 100 GB | 80% |
| Bandwidth | 5 GB/mês | 250 GB/mês | 80% |
| API requests | 50.000/mês | ilimitado | — |
| Conexões DB | 15 (pooled) | 25 (pooled) | > 80% simultâneas |
| Backups | 7 dias | 30 dias | verificar semanalmente |
| PITR | ❌ | Add-on ($100/mês) | — |

---

## 7. Checklist de Resposta a Incidente

### DB fora / timeout em todas as requests

```
1. Verificar status em status.supabase.com
2. Verificar Vercel logs — confirmar que o erro é de DB e não da app
3. Se DB up mas requests falhando: verificar connection pool (query 2.3)
4. Se pool esgotado: identificar queries longas no pg_stat_activity e encerrar se necessário:
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'active' AND query_start < now() - interval '60 seconds'
   AND pid <> pg_backend_pid();
5. Se DB down: aguardar resolução pela Supabase ou iniciar procedimento de restore
```

### Queries lentas detectadas

```
1. Executar query 2.1 para identificar as queries problemáticas
2. Verificar se os índices recomendados na seção 3 existem
3. Se índice faltando: criar com CREATE INDEX CONCURRENTLY (não bloqueia o banco)
4. Se query tem full scan: analisar com EXPLAIN ANALYZE para plano de execução
5. Resetar estatísticas após correção: SELECT pg_stat_statements_reset();
```

### Dados corrompidos / precisando rollback

```
1. NÃO fazer nada no banco até entender o escopo
2. Acessar Database → Backups → identificar último backup anterior ao problema
3. Executar procedimento de restore para staging primeiro (seção 4.2)
4. Validar dados no staging
5. Agendar janela de manutenção para produção (comunicar usuários afetados)
6. Executar restore em produção (seção 4.1)
```
