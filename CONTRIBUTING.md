# Contributing to MyNutri

## Como rodar localmente

```bash
# Pré-requisitos: Node.js 20+, pnpm

git clone https://github.com/seu-usuario/mynutri.git
cd mynutri

pnpm install

# Copie o arquivo de variáveis de ambiente e preencha as chaves
cp .env.example .env.local

pnpm dev
```

Acesse `http://localhost:3000`.

## Como abrir uma issue

1. Verifique se a issue já existe na aba [Issues](../../issues)
2. Abra uma nova issue descrevendo o problema ou sugestão
3. Inclua passos para reproduzir (se for bug) ou contexto de uso (se for feature)

## Como submeter um PR

1. Faça um fork do repositório
2. Crie uma branch a partir de `main`: `git checkout -b feat/minha-feature`
3. Implemente a mudança com commits descritivos
4. Abra um Pull Request com descrição clara do que foi feito e por quê
5. Aguarde revisão

## Licença

Este projeto está licenciado sob [AGPL-3.0](./LICENSE).
Contribuições submetidas via PR são automaticamente licenciadas sob os mesmos termos.
