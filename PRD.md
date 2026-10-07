# PRD — Aplicativo de Acompanhamento de Hábitos

## 1. Visão Geral do Produto

O **HabitTrack** é um aplicativo web simples que ajuda os usuários a criarem hábitos diários, marcarem sua conclusão e acompanharem a sequência de dias consecutivos (*streaks*) em que o hábito foi cumprido.

O foco é na simplicidade: cadastro rápido, marcação com um clique e visualização clara do progresso.

**Stack técnica:**

| Camada | Tecnologia |
|---|---|
| Frontend / Backend | Next.js (App Router, API Routes) |
| Banco de dados | MongoDB (via Mongoose ou driver nativo) |
| Autenticação | NextAuth.js |
| Estilos | Tailwind CSS |
| Hospedagem | Vercel + MongoDB Atlas |

---

## 2. Principais Funcionalidades

1. **Cadastro de hábitos**
   - Criar hábito com nome e descrição opcional.
   - Excluir hábitos existentes.

2. **Marcação diária**
   - Marcar/desmarcar um hábito como concluído no dia atual.
   - Visualizar quais dias do mês já foram concluídos (calendário simples).

3. **Acompanhamento de streaks**
   - Exibir a sequência atual de dias consecutivos por hábito.
   - Exibir a melhor sequência (*best streak*) já alcançada.

4. **Dashboard**
   - Listar todos os hábitos do dia com status (concluído / pendente).
   - Resumo geral: total de hábitos, concluídos hoje, maior streak.

---

## 3. Fluxo Básico do Usuário

```
1. Usuário acessa o app e faz login/registro.
2. Cria seu primeiro hábito (ex.: "Beber 2L de água").
3. Na página inicial (dashboard), vê os hábitos do dia.
4. Ao concluir um hábito, marca como concluído → streak incrementa.
5. No dia seguinte, o hábito volta a ficar pendente.
   - Se concluído novamente → streak +1.
   - Se não concluído → streak zera.
6. Ao acessar o detalhe do hábito, vê histórico e melhores sequências.
```

**Regra de streak:**
- `streak_atual` incrementa quando o hábito é concluído na data esperada.
- Reseta para `0` se um dia for pulado.
- `melhor_streak` só é atualizado quando `streak_atual` o supera.

---

## 4. Sugestão de Modelo de Data

### Coleção `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "passwordHash": "string",
  "createdAt": "Date"
}
```

### Coleção `habits`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "name": "string",
  "description": "string",
  "streakAtual": 0,
  "melhorStreak": 0,
  "ultimaConclusao": "Date | null",
  "createdAt": "Date"
}
```

### Coleção `completions`
```json
{
  "_id": "ObjectId",
  "habitId": "ObjectId (ref: habits)",
  "userId": "ObjectId (ref: users)",
  "date": "2026-10-06",        // formato YYYY-MM-DD, unique com habitId
  "createdAt": "Date"
}
```

**Índices recomendados:**
- `users.email` → unique
- `completions.habitId + date` → unique (evita marcação duplicada no mesmo dia)
- `habits.userId` → índice simples para busca por usuário

---

## 5. Endpoints Principais (API)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/habits` | Criar hábito |
| `GET` | `/api/habits` | Listar hábitos do usuário |
| `DELETE` | `/api/habits/[id]` | Excluir hábito |
| `POST` | `/api/habits/[id]/complete` | Marcar como concluído hoje |
| `DELETE` | `/api/habits/[id]/complete` | Desmarcar conclusão de hoje |
| `GET` | `/api/habits/[id]/stats` | Streak atual, melhor streak e histórico |

---

## 6. Fora de Escopo (v1)

- Aplicativo mobile nativo.
- Lembretes/notificações.
- Hábitos com frequência diferente de diária (ex.: 3x por semana).
- Compartilhamento e ranking social.
