# Observabilidade — Logs Estruturados

**Status atual:** `lib/logger.ts` implementado e todos os `console.*` migrados.
Os logs já saem como JSON estruturado em produção — falta apenas um destino para recebê-los.

---

## O que está pronto

O logger serializa para JSON em produção:

```json
{
  "ts": "2026-03-28T14:32:01.123Z",
  "level": "error",
  "context": "stripe/webhook",
  "message": "Falha na verificação de assinatura",
  "requestId": "a1b2c3d4-...",
  "error": "No signatures found matching the expected signature for payload"
}
```

Campos disponíveis por contexto:

| Campo | Presente em |
|-------|-------------|
| `ts`, `level`, `context`, `message` | todos os logs |
| `requestId` | API routes (via header `x-request-id` injetado no `proxy.ts`) |
| `userId` | logs de analyze, invite, e outros autenticados |
| `ip` | rate limit hits, erros de analyze |
| `tenant` | quando relevante para multi-tenant |
| `error` | logs de nível `error` |
| `source`, `lineno`, `stack` | erros de client-side via `/api/log-client-error` |

---

## Opção A — Vercel Log Drain (requer plano Pro)

Quando o projeto fizer upgrade para Vercel Pro:

1. Vercel Dashboard → projeto → **Settings → Log Drains**
2. Clicar em **Add Drain**
3. Escolher destino: **Axiom** (tem integração nativa no Vercel, zero config adicional)
4. Selecionar sources: `Lambda` + `Edge` + `Static`
5. Salvar — os logs JSON do `logger.ts` começam a aparecer no Axiom imediatamente

**Nenhuma mudança de código necessária.** O `logger.ts` já emite o formato correto.

Axiom free tier: 500 GB/mês de ingestão, 30 dias de retenção.
Alternativa: **Better Stack (Logtail)** — mesma integração nativa no Vercel.

---

## Opção B — SDK do Axiom direto no projeto (sem plano Pro) ✅ Implementado

Instala o SDK e substitui o `console.log` interno do `logger.ts` pelo cliente Axiom.
Os logs são enviados diretamente da Vercel Function para o Axiom, sem passar pelo Log Drain.

A integração está ativa. O `lib/axiom.ts` implementa um micro-buffer customizado
(sem SDK em runtime) compatível com Edge Runtime e Node.js Lambda.

### Arquitetura implementada

- **`lib/axiom.ts`** — buffer singleton + `flushLogs()` + `ingestEventEdge()` para Edge
- **`lib/logger.ts`** — chama `ingestEvent()` (Node.js) ou `ingestEventEdge()` (Edge) automaticamente
- **`/api/analyze`** e **`/api/stripe/webhook`** — `after(flushLogs())` garante envio pós-resposta
- **`proxy.ts`** (Edge Runtime) — eventos enviados fire-and-forget via `ingestEventEdge()`

### Setup (único passo necessário)

```bash
# .env.local (e Vercel → Environment Variables)
NEXT_AXIOM_TOKEN=xaat-...      # app.axiom.co → Settings → API Tokens (permissão: ingest)
NEXT_AXIOM_DATASET=mynutri-prod  # app.axiom.co → Datasets → New Dataset
```

Se as variáveis não estiverem configuradas, a integração é silenciosamente desativada
(graceful degradation) — os logs continuam aparecendo no Vercel Runtime Logs normalmente.

---

## Opção C — Manter apenas Vercel Runtime Logs (zero custo, zero config)

Sem Log Drain e sem SDK, os logs JSON já aparecem em:

**Vercel Dashboard → projeto → Logs** (retenção de 1 hora no free tier, 1 dia no Pro)

Para debugging pontual isso é suficiente. Para produção com histórico e alertas, uma das opções acima é necessária.

---

## Decisão Recomendada

| Situação | Recomendação |
|----------|--------------|
| Plano Free agora, sem urgência | Opção C — aguardar Pro |
| Precisa de logs históricos agora | Opção B — instalar `@axiomhq/nextjs` (~30min) |
| Upgrade para Pro planejado | Opção A — Log Drain é o caminho de menor manutenção |
