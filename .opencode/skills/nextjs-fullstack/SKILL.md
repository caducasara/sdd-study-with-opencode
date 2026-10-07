---
name: nextjs-fullstack
description: Desenvolvimento full-stack com Next.js (App Router), NextAuth/Auth.js, TailwindCSS e MongoDB (driver nativo ou Mongoose). Use sempre que o usuário pedir para criar, depurar, revisar ou estender qualquer parte de uma aplicação com essa stack - páginas, layouts, Server Actions, Route Handlers, login/cadastro, sessões, proteção de rotas, middleware/proxy, roles, modelos e queries do MongoDB, conexão com Atlas, estilização com Tailwind, dark mode, componentes de UI, formulários e deploy na Vercel. Acione mesmo que o usuário cite só parte da stack (por exemplo "tela de login com Next", "salvar no Mongo", "NextAuth não cria sessão", "classe do Tailwind não aplica"), ou fale "next.js", "nextauth", "auth.js", "tailwind", "mongodb", "mongoose".
---

# Next.js + NextAuth + Tailwind + MongoDB

Skill para construir e manter aplicações full-stack nessa stack com código que funciona de primeira, é seguro por padrão e segue as convenções atuais de cada ferramenta. Responda no idioma do usuário; código, nomes de arquivos e identificadores ficam em inglês.

## Passo 0: descobrir as versões antes de escrever código

Essa stack mudou muito nos últimos anos, e código de uma versão quebra silenciosamente em outra. Antes de gerar qualquer coisa, olhe o `package.json` do projeto (se existir) ou pergunte ao usuário, e anote:

| Pacote | O que muda entre versões |
|---|---|
| `next` | 15+: `params`, `searchParams`, `cookies()`, `headers()` são assíncronos (`await`). 16: `middleware.ts` passou a se chamar `proxy.ts` e `fetch` não é cacheado por padrão. |
| `next-auth` | v4 (`getServerSession`, `NEXTAUTH_*`) vs v5/Auth.js (`auth()`, `AUTH_*`, arquivo `auth.ts` na raiz). |
| `tailwindcss` | v3 (`tailwind.config.js`, `@tailwind base`) vs v4 (`@import "tailwindcss"`, `@theme`, plugin `@tailwindcss/postcss`). |
| `mongoose` / `mongodb` | Escolha do driver define o padrão de conexão e de tipagem. |

Em projeto novo, use as versões estáveis mais recentes (confirme com `npm view <pacote> version`), App Router, TypeScript e Auth.js v5. Em projeto existente, **respeite a versão que já está instalada** em vez de migrar sem ser pedido.

## Estrutura de projeto recomendada

```
src/
├── app/
│   ├── (public)/            # login, cadastro, landing
│   ├── (protected)/         # rotas que exigem sessão (layout valida auth)
│   ├── api/auth/[...nextauth]/route.ts
│   ├── actions/             # Server Actions por domínio (users.ts, posts.ts)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # primitivos (Button, Input, Card)
│   └── ...                  # componentes de feature
├── lib/
│   ├── mongodb.ts           # conexão (singleton)
│   ├── data/                # camada de acesso a dados (queries)
│   ├── validations/         # schemas zod
│   └── utils.ts             # cn() e helpers
├── auth.ts                  # config completa do Auth.js (Node runtime)
├── auth.config.ts           # config leve, compatível com Edge
└── proxy.ts (ou middleware.ts)
```

## Princípios que guiam as decisões

**Server Components por padrão.** Busque dados no servidor, direto da camada `lib/data`, e passe só o necessário aos componentes. Use `"use client"` apenas nas folhas que precisam de estado, efeitos ou eventos. Isso reduz JS enviado ao navegador e mantém segredos e acesso ao banco fora do cliente.

**Mutações via Server Actions** (formulários, ações da UI) ou **Route Handlers** (webhooks, API pública, integrações externas). Toda Server Action é um endpoint HTTP público de fato, então trate-a como tal: autentique, autorize e valide a entrada dentro dela.

**Autorização na fonte do dado, não só no middleware.** O proxy/middleware serve para redirecionar cedo e dar boa UX, mas já houve bypass de middleware no Next.js (CVE-2025-29927). Chame `auth()` e cheque o papel/dono do recurso em cada Server Action, Route Handler e função de `lib/data` que toca dado sensível.

**Valide tudo que vem de fora com zod** (formulários, JSON, params, query string). Nunca passe `req.body` ou `FormData` direto para o Mongo: além de dados inválidos, isso abre espaço para injeção de operadores (`{ "$ne": null }`). Converta para tipos primitivos validados antes de montar o filtro.

**Nada de segredo ou hash saindo do servidor.** Projete campos explicitamente nas queries (`{ passwordHash: 0 }` ou lista de inclusão) e importe `server-only` nos módulos de `lib/data` e `lib/mongodb.ts` para o build falhar se alguém os importar num Client Component.

**ObjectId e Date não atravessam a fronteira servidor→cliente.** Converta `_id` para string e datas para ISO antes de passar como props.

## Fluxo de trabalho

1. **Entender o pedido** e identificar quais camadas ele toca (UI, auth, dados).
2. **Checar versões** (Passo 0).
3. **Ler a referência certa** antes de codar:
   - Login, cadastro, sessão, roles, proteção de rotas, OAuth → `auth.md`
   - Conexão, modelos, queries, índices, Mongoose vs driver nativo, serialização → `mongodb.md`
   - Estilização, tema, dark mode, `cn()`, formulários e componentes → `tailwind.md`
4. **Implementar de dentro para fora**: schema/validação → camada de dados → Server Action/handler → UI.
5. **Rodar a checklist** abaixo antes de entregar.

## Checklist antes de entregar

- [ ] Variáveis de ambiente novas estão documentadas em `.env.example` (sem valores reais) e `.env*.local` está no `.gitignore`.
- [ ] Toda Server Action/Route Handler: autentica, autoriza, valida com zod, trata erro e devolve resposta previsível.
- [ ] Nenhum `passwordHash`, token ou segredo chega ao cliente.
- [ ] `_id`/`Date` serializados antes de ir para Client Components.
- [ ] Conexão com Mongo reaproveitada (singleton), sem `connect()` a cada requisição.
- [ ] Queries frequentes têm índice; campos únicos (ex.: `email`) têm índice único.
- [ ] Classes Tailwind são strings completas (nada de `` `bg-${cor}-500` ``) e o `content`/fontes do Tailwind cobrem todos os arquivos.
- [ ] Rotas protegidas redirecionam não autenticados e estados de loading/erro existem (`loading.tsx`, `error.tsx`).
- [ ] Compila: `npm run build` e `npm run lint` sem erro, quando o ambiente permitir rodar.

## Erros comuns e diagnóstico rápido

| Sintoma | Causa provável |
|---|---|
| `Module not found: Can't resolve 'net'/'dns'` ao rodar proxy/middleware | O driver do Mongo foi importado no runtime Edge. Separe `auth.config.ts` (sem adapter/DB) e use só ele no proxy. Ver `auth.md`. |
| Login com Credentials "funciona" mas `auth()` volta `null` | Credentials exige `session: { strategy: "jwt" }`; com adapter, o padrão é `database` e a sessão não é gravada. |
| `session.user.id` ou `role` não existe no TypeScript | Falta a augmentation de tipos e/ou os callbacks `jwt` + `session`. |
| `MongoServerSelectionError` | IP não liberado no Atlas, senha com caractere especial sem URL-encode, ou URI errada. |
| Muitas conexões abertas em dev | `MongoClient`/`mongoose.connect` sendo recriado a cada hot reload; use o cache em `globalThis`. |
| `Only plain objects can be passed to Client Components` | `ObjectId`/`Date`/documento Mongoose passado como prop; serialize. |
| `params should be awaited` | Next 15+: `const { id } = await params`. |
| Classe Tailwind não aplica | Classe montada dinamicamente, arquivo fora do `content` (v3), ou `@import "tailwindcss"` ausente no CSS global (v4). |
| Hydration mismatch com dark mode | Tema lido do `localStorage` no render; use `next-themes` e `suppressHydrationWarning` no `<html>`. |

## Como responder ao usuário

Entregue o código completo dos arquivos tocados, com o caminho de cada um no topo do bloco, e liste ao final apenas o que o usuário precisa fazer manualmente (instalar pacotes, preencher `.env.local`, liberar IP no Atlas). Se houver uma decisão com trade-off real (Mongoose vs driver nativo, JWT vs sessão em banco), recomende uma opção em uma ou duas frases e siga em frente, em vez de devolver a pergunta.