# Tasks — HabitTrack (baseado em `PRD.md`)

Lista de tarefas em ordem de execução para implementar o aplicativo de acompanhamento de hábitos.

**Diretrizes gerais:**
- **Mobile-first**: todos os layouts começam para telas pequenas (`320px+`) e escalam com `sm:`, `md:`, `lg:` do Tailwind.
- **UI**: interface moderna, amigável, com paleta de cores consistente, sombras suaves, cantos arredondados e microinterações (transições/animations do Tailwind).
- **Qualidade**: cobertura mínima de **90%** em linhas e ramos para testes unitários e de integração (jest + testing-library + mongodb-memory-server).
- Cada tarefa é um passo verificável (define um "Concluído quando").

---

## 📊 Status da execução

| Fase | Status | Observação |
|---|---|---|
| 1 — Fundação | ✅ Concluída | Scaffold Next 16.4 + Tailwind v4 + Jest threshold 90% |
| 2 — Dados (MongoDB) | ✅ Concluída | Models, índices e repositórios testados |
| 3 — Streaks | ✅ Concluída | `streakService` (UTC) e `habitService` testados |
| 4 — Backend (API) | ✅ Concluída | 8 rotas + 22 testes de integração (MongoMemoryServer) |
| 5 — UI base | ✅ Concluída | Tokens, componentes e hooks testados |
| 6 — Telas | ✅ Concluída | Login/registro, dashboard, modal, detalhe, proxy guard |
| 7 — Integração E2E | ✅ Concluída | 199 testes, cobertura global: lines 98.66% / branches 91.85% / functions 96.63% / statements 98.66% |
| 8 — Polish e entrega | ⏳ Parcial | Lint + build + acessibilidade OK; **deploy (8.4) pendente** |

**Notas de desvio do plano original:**
- Autenticação por **cookie HMAC-SHA256** (`src/lib/auth/session.ts`) em vez de `next-auth`; env vars são `SESSION_SECRET`/`SESSION_COOKIE` (não `NEXTAUTH_*`).
- `src/types/**` excluído da cobertura (apenas tipos, sem runtime) — conforme previsto na Tarefa 1.3.
- App não é repositório git (nada commitado).

---

## Fase 1 — Fundação do projeto ✅

### Tarefa 1.1 — Inicializar o projeto Next.js
- Criar app com `create-next-app` (App Router, TypeScript, Tailwind CSS, ESLint).
- Estruturar pastas: `src/app`, `src/components`, `src/lib`, `src/types`.
- **Concluído quando:** `npm run dev` sobe o app e `npm run lint` passa sem erros.

### Tarefa 1.2 — Configurar variáveis de ambiente e estrutura de config
- Criar `.env.local` e `.env.example` com `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Criar `.gitignore` adequado.
- **Concluído quando:** o app lê as env vars sem erro em development.

### Tarefa 1.3 — Configurar o tooling de testes
- Instalar `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`, `ts-jest`/`babel-jest`.
- Criar `jest.config.ts` com `collectCoverageFrom` apontando para `src/**/*.{ts,tsx}` (excluindo `*.d.ts`, `types`).
- Definir `coverageThreshold: { global: { branches: 90, functions: 90, lines: 90, statements: 90 } }`.
- Adicionar scripts: `npm test` e `npm run test:coverage`.
- **Concluído quando:** `npm run test:coverage` roda (com um smoke test) e o threshold de 90% é aplicado.

---

## Fase 2 — Camada de dados (MongoDB) ✅

### Tarefa 2.1 — Conectar ao MongoDB
- Instalar `mongoose`.
- Criar `src/lib/db.ts` com cache do client/mongoose para evitar novas conexões a cada request (padrão Next.js).
- Exportar função `connectDB()`.
- **Concluído quando:** existe teste unitário do `connectDB` (mock do mongoose) cobrindo sucesso e falha de conexão.

### Tarefa 2.2 — Criar os models (users, habits, completions)
- `User`: `name`, `email` (unique), `passwordHash`, `createdAt`.
- `Habit`: `userId` (ref User, índice), `name`, `description`, `streakAtual`, `melhorStreak`, `ultimaConclusao`, `createdAt`.
- `Completion`: `habitId`, `userId`, `date` (`YYYY-MM-DD`), `createdAt`, índice único composto `{ habitId: 1, date: 1 }`.
- **Concluído quando:** testes unitários validam schemas, índices e o índice único (inserção duplicada lança erro).

### Tarefa 2.3 — Implementar repositórios (camada de acesso a dados)
- `src/lib/repositories/habitRepository.ts`: `create`, `listByUser`, `findById`, `deleteById`.
- `src/lib/repositories/completionRepository.ts`: `complete`, `uncomplete`, `findByHabitAndDate`, `listByHabit`.
- `src/lib/repositories/userRepository.ts`: `create`, `findByEmail`.
- **Concluído quando:** cada função tem teste unitário (mock do model) cobrindo caminho de sucesso e erro.

---

## Fase 3 — Lógica de negócio (streaks) ✅

### Tarefa 3.1 — Implementar serviço de streaks
- `src/lib/services/streakService.ts` com função pura `calculateStreaks(completions, today)` que retorna `{ streakAtual, melhorStreak }`.
- Regras do PRD: incrementa em dias consecutivos, zera se houver dia pulado, `melhorStreak` só cresce.
- **Concluído quando:** testes unitários cobrem: primeiro dia, dias consecutivos, dia pulado (reset), melhorStreak preservado, datas em virada de mês/ano, entrada vazia.

### Tarefa 3.2 — Implementar serviço de hábitos (orquestração)
- `src/lib/services/habitService.ts`: `createHabit`, `listHabits`, `deleteHabit`, `completeToday`, `uncompleteToday`, `getStats`.
- `completeToday`: cria `completion`, recalcula e persiste `streakAtual`/`melhorStreak`/`ultimaConclusao`; é idempotente (marcar 2x no mesmo dia não duplica streak).
- `uncompleteToday`: remove completion e recalcula os streaks.
- `getStats`: combina hábito + histórico de completions via `streakService`.
- **Concluído quando:** testes unitários cobrem todos os caminhos (mock dos repositórios) com ≥90% de cobertura no diretório `services`.

---

## Fase 4 — Backend (API Routes) ✅

### Tarefa 4.1 — Implementar autenticação (registro e login)
- Instalar `next-auth` (ou solução com cookie) + `bcryptjs` para hash de senha.
- Rotas: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`.
- Criar middleware/helper `getSessionUser(req)` usado pelas rotas protegidas.
- **Concluído quando:** testes de integração cobrem registro válido/inválido, login com senha errada, sessão ausente → `401`.

### Tarefa 4.2 — Rotas de hábitos (CRUD)
- `POST /api/habits` — cria hábito do usuário autenticado (valida `name` obrigatório, `description` opcional).
- `GET /api/habits` — lista hábitos do usuário (com status `concluidoHoje` calculado).
- `DELETE /api/habits/[id]` — exclui hábito (e suas completions); `404` se não encontrado; `403` se não for do usuário.
- **Concluído quando:** testes de integração (supertest/mocks de session) cobrem 200/201/400/401/403/404.

### Tarefa 4.3 — Rotas de conclusão e stats
- `POST /api/habits/[id]/complete` — marca conclusão de hoje e retorna streaks atualizados.
- `DELETE /api/habits/[id]/complete` — desmarca conclusão de hoje.
- `GET /api/habits/[id]/stats` — retorna `streakAtual`, `melhorStreak` e histórico de completions (calendário).
- **Concluído quando:** testes de integração cobrem conclusão, desconclusão, idempotência (2ª conclusão no mesmo dia), stats com histórico vazio e com dados.

### Tarefa 4.4 — Validar e padronizar respostas da API
- Criar `src/lib/api.ts` com helpers `success()` / `error()` e tratamento centralizado de erros (`400` validação, `401` não autenticado, `403` proibido, `404` não encontrado, `500` inesperado).
- Aplicar em todas as rotas.
- **Concluído quando:** todos os handlers usam os helpers e há teste unitário do helper de resposta.

### Tarefa 4.5 — Coverage checkpoint do backend
- Rodar `npm run test:coverage` e garantir ≥90% em `src/lib/**` e `src/app/api/**`.
- **Concluído quando:** o relatório mostra ≥90% (lines/branches/functions/statements) no backend.

---

## Fase 5 — Fundação de UI (mobile-first) ✅

### Tarefa 5.1 — Design tokens e layout base no Tailwind
- Definir paleta de cores, tipografia e sombras no `tailwind.config` (ex.: accent para conclusão, tons de cinza para superfícies).
- Criar `src/app/layout.tsx` com viewport mobile (`width=device-width`), fonte do Google e container responsivo.
- **Concluído quando:** página raiz renderiza bem em 320px, 768px e 1280px (teste visual/manual).

### Tarefa 5.2 — Componentes de UI reutilizáveis
- `Button` (variantes primary/secondary/danger, estados loading/disabled).
- `Input` e `Textarea` com label, erro e foco acessível.
- `Card` (superfície com sombra e cantos arredondados).
- `Modal`/`Sheet` para ações (criar hábito, confirmar exclusão) — deve ser usável com uma mão no mobile.
- `Toast` para feedbacks ("Hábito concluído! 🔥").
- **Concluído quando:** cada componente tem teste unitário (render, interações, estados) com ≥90% de cobertura em `src/components`.

### Tarefa 5.3 — Cliente HTTP e hook de dados
- `src/lib/apiClient.ts`: wrapper de `fetch` com tratamento de erro e JSON.
- Hooks: `useHabits()`, `useCompleteHabit()` com estados de loading/erro/otimista (optimistic UI ao marcar hábito).
- **Concluído quando:** testes unitários dos hooks cobrem sucesso, erro e atualização otimista.

---

## Fase 6 — Telas do aplicativo ✅

### Tarefa 6.1 — Tela de autenticação (login/registro)
- Rota `/login` e `/register` com formulário validado, alternando entre os dois modos.
- Mobile-first: campos em pilha vertical, botão full-width, feedback de erro inline.
- **Concluído quando:** testes de componente cobrem preenchimento, validação e envio (sucesso e falha).

### Tarefa 6.2 — Dashboard (página inicial `/`)
- Header com saudação e resumo: total de hábitos, concluídos hoje, maior streak.
- Lista de hábitos do dia em cards mobile-first: nome, streak atual (ícone de fogo), botão circular de conclusão com animação.
- Botão flutuante (FAB) "+ Novo hábito" fixo no canto inferior direito.
- Estados: loading (skeleton), vazio (CTA "Crie seu primeiro hábito"), erro (retry).
- **Concluído quando:** testes de componente cobrem os 4 estados, marcar/desmarcar atualiza a UI e o resumo.

### Tarefa 6.3 — Modal de criação de hábito
- Formulário com nome (obrigatório) e descrição (opcional), validação client-side e envio para `POST /api/habits`.
- Fecha no sucesso + toast + atualização da lista; mostra erro da API.
- **Concluído quando:** testes cobrem validação, envio bem-sucedido e falha da API.

### Tarefa 6.4 — Tela de detalhe do hábito `/habits/[id]`
- Cabeçalho com nome, descrição, `streakAtual` (destaque grande) e `melhorStreak`.
- Calendário do mês mobile-first mostrando dias concluídos (fetch de `/stats`), navegação mês anterior/próximo.
- Botão de excluir hábito com confirmação em modal.
- **Concluído quando:** testes cobrem render com dados, navegação de meses, confirmação de exclusão e estados de loading/erro/vazio.

### Tarefa 6.5 — Fluxo completo protegido
- Middleware/rota guard: usuário sem sessão em `/` ou `/habits/*` redireciona para `/login`.
- Após login, redireciona ao dashboard.
- **Concluído quando:** testes de integração cobrem redirecionamento sem sessão e acesso autenticado.

---

## Fase 7 — Testes de integração E2E da ponta a ponta ✅

### Tarefa 7.1 — Ambiente de teste de integração com MongoDB real
- Configurar `mongodb-memory-server` no `jest.setup` para testes de integração (rota + service + model reais).
- Separar suítes: `unit` (jsdom) e `integration` (node + mongodb-memory-server).
- **Concluído quando:** os dois comandos rodam (`test:unit`, `test:integration`) e o coverage combinado é gerado.

### Tarefa 7.2 — Testes de integração do fluxo principal
- Cenário feliz completo: registrar → login → criar hábito → concluir hoje → verificar streak=1 → simular dia seguinte → concluir → streak=2 → pular dia → streak=0, `melhorStreak=2`.
- Cenário de desconclusão: concluir → desconcluir → streak recalculado.
- Cenário de isolamento: usuário A não vê/edita hábitos do usuário B.
- **Concluído quando:** todos os cenários passam com dados reais no MongoDB em memória.

### Tarefa 7.3 — Gate de cobertura final (≥90%)
- Rodar `npm run test:coverage` com as duas suítes.
- Investigar lacunas e cobrir branches restantes (erros de API, estados de loading/erro).
- **Concluído quando:** relatório final ≥90% em branches, functions, lines e statements globalmente.

---

## Fase 8 — Polish e entrega ⏳ (8.1–8.3 concluídas; deploy pendente)

### Tarefa 8.1 — Acessibilidade e usabilidade mobile
- Labels associados, foco visível, contraste AA, `aria-*` em botões de conclusão e modais, área de toque ≥44px.
- Prevenir scroll do body quando modal aberto.
- **Concluído quando:** checklist de acessibilidade revisado nos componentes principais.

### Tarefa 8.2 — Feedback e estados de erro globais
- Página `not-found.tsx` e `error.tsx` estilizados.
- Toasts de sucesso/erro consistentes em todas as mutações.
- **Concluído quando:** testes cobrem `error.tsx` e exibição de toast.

### Tarefa 8.3 — Revisão final, lint e build de produção
- `npm run lint`, `npm run test:coverage`, `npm run build` sem erros.
- Revisar responsividade em 320px / 768px / 1280px.
- **Concluído quando:** os 3 comandos passam e o coverage mantém ≥90%.

### Tarefa 8.4 — Deploy
- Configurar MongoDB Atlas, variáveis de ambiente na Vercel, fazer deploy.
- Smoke test manual do fluxo completo em produção.
- **Concluído quando:** app publicado e fluxo principal funcionando em produção.

---

## Resumo da ordem de execução

| # | Fase | Entrega principal | Status |
|---|---|---|---|
| 1 | Fundação do projeto | Next.js + Tailwind + Jest configurado (threshold 90%) | ✅ |
| 2 | Dados (MongoDB) | Conexão, models e repositórios testados | ✅ |
| 3 | Lógica de negócio | Serviço de streaks e hábitos com testes unitários | ✅ |
| 4 | Backend (API) | Auth + endpoints CRUD/complete/stats testados | ✅ |
| 5 | UI base | Design tokens, componentes e hooks testados | ✅ |
| 6 | Telas | Login, dashboard, modal, detalhe do hábito | ✅ |
| 7 | Integração | Fluxo E2E com mongodb-memory-server, coverage ≥90% | ✅ |
| 8 | Polish e entrega | A11y, build, deploy | ⏳ (falta deploy) |
