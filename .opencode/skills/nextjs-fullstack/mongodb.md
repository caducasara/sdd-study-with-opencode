# MongoDB com Next.js

Conteúdo: [Driver nativo ou Mongoose](#driver-nativo-ou-mongoose) · [Conexão (driver)](#conexão-com-o-driver-nativo) · [Conexão (Mongoose)](#conexão-com-mongoose) · [Camada de dados](#camada-de-dados) · [Serialização](#serialização-para-componentes-cliente) · [Índices](#índices) · [Segurança](#segurança-e-validação) · [Atlas e deploy](#atlas-e-deploy)

## Driver nativo ou Mongoose

| Situação | Escolha |
|---|---|
| Usa `@auth/mongodb-adapter` (obrigatório o `MongoClient`) | Driver nativo para tudo, é o caminho mais simples |
| Quer schemas, validação, hooks, populate, tipagem de modelos | Mongoose para os dados do domínio |
| Projeto já usa um dos dois | Mantenha |

Dá para combinar: o adapter do Auth.js usa o `MongoClient` e o Mongoose cuida das coleções do app. São duas conexões, o que é aceitável, mas aumenta o uso de pool; se possível, fique com um só. **Padrão desta skill: driver nativo + zod**, pois evita duplicar conexão e funciona bem com o adapter.

## Conexão com o driver nativo

O ponto central é reaproveitar o cliente. Em dev, o hot reload reexecuta módulos e abriria uma conexão nova a cada edição, então o cliente fica em `globalThis`.

```ts
// src/lib/mongodb.ts
import "server-only";
import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI não definida");

const options = { maxPoolSize: 10 };

const globalForMongo = globalThis as unknown as { _mongoClientPromise?: Promise<MongoClient> };

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  globalForMongo._mongoClientPromise ??= new MongoClient(uri, options).connect();
  clientPromise = globalForMongo._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(); // usa o banco da URI; ou client.db("nome")
}
```

Observação: `import "server-only"` exige `npm i server-only`. Se o `@auth/mongodb-adapter` importar este módulo a partir de `auth.ts`, está tudo bem, pois `auth.ts` também é só servidor.

## Conexão com Mongoose

```ts
// src/lib/mongoose.ts
import "server-only";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI não definida");

const g = globalThis as unknown as { _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
const cached = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(uri!, { bufferCommands: false, maxPoolSize: 10 });
  cached.conn = await cached.promise;
  return cached.conn;
}
```

Modelos precisam evitar redefinição no hot reload:

```ts
// src/lib/models/Post.ts
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

export type PostDoc = InferSchemaType<typeof PostSchema>;
export default mongoose.models.Post || mongoose.model("Post", PostSchema);
```

Em Server Components e actions, chame `await connectDB()` antes de usar o modelo e use `.lean()` nas leituras para obter objetos simples (mais rápidos e mais fáceis de serializar).

## Camada de dados

Centralize queries em `lib/data/*.ts`. Componentes e actions chamam funções com nomes de domínio, e o acesso ao Mongo fica num lugar só (fácil de testar, indexar e auditar).

```ts
// src/lib/data/users.ts
import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  role: "user" | "admin";
  createdAt: Date;
};

async function users() {
  return (await getDb()).collection<UserDoc>("users");
}

export async function getUserByEmail(email: string, opts: { withPassword?: boolean } = {}) {
  const col = await users();
  return col.findOne(
    { email: String(email).toLowerCase() },              // String(): bloqueia objetos tipo {$ne:null}
    { projection: opts.withPassword ? undefined : { passwordHash: 0 } },
  );
}

export async function createUser(input: { name: string; email: string; passwordHash: string }) {
  const col = await users();
  const res = await col.insertOne({
    _id: new ObjectId(),
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role: "user",
    createdAt: new Date(),
  });
  return res.insertedId.toString();
}
```

Ao receber um `id` de URL ou formulário, valide antes de construir `ObjectId`, pois `new ObjectId("abc")` lança exceção:

```ts
export function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
```

Para recursos com dono, o filtro leva sempre o dono: `{ _id, ownerId: new ObjectId(session.user.id) }`. Assim, mesmo um `id` adivinhado não devolve dado de outro usuário.

Paginação: prefira cursor (`_id < ultimoId`, `sort({ _id: -1 })`, `limit`) a `skip` em coleções grandes. Para listagens comuns com poucos milhares de itens, `skip/limit` basta.

## Serialização para componentes cliente

`ObjectId`, `Date` e documentos Mongoose não passam como props de Server para Client Component. Mapeie para DTOs simples:

```ts
export type PostDTO = { id: string; title: string; ownerId: string; createdAt: string };

export const toPostDTO = (p: { _id: ObjectId; title: string; ownerId: ObjectId; createdAt: Date }): PostDTO => ({
  id: p._id.toString(),
  title: p.title,
  ownerId: p.ownerId.toString(),
  createdAt: p.createdAt.toISOString(),
});
```

Esse DTO também funciona como allowlist de campos: o que não está no mapeamento não vaza.

## Índices

Crie índices num script de setup/migração ou na inicialização controlada, não a cada requisição.

```ts
await db.collection("users").createIndex({ email: 1 }, { unique: true });
await db.collection("posts").createIndex({ ownerId: 1, createdAt: -1 });
```

- `email` único é essencial: a checagem "já existe?" no código sofre corrida; o índice único é a garantia real (trate o erro `E11000`).
- Índice composto na ordem: igualdade primeiro, depois ordenação.
- Use `explain("executionStats")` para confirmar que a query usa o índice.
- O adapter do Auth.js usa as coleções `users`, `accounts`, `sessions`, `verification_tokens`. Se o app também usa `users`, mantenha os campos extras compatíveis (como `role`) ou use outro nome de coleção para o domínio.

## Segurança e validação

- Valide entrada com zod e converta para primitivos antes de montar filtros. Nunca use `collection.find(req.body)`.
- Projeções explícitas em dados de usuário.
- Para atualização parcial, monte o `$set` a partir de campos permitidos (allowlist), não de `Object.fromEntries(formData)` bruto, evitando mass assignment (alguém enviar `role=admin`).
- Operações multi-documento que precisam ser atômicas usam transações (exigem replica set; o Atlas já é).
- Dados sensíveis (CPF, tokens de terceiros) em repouso: considere Client-Side Field Level Encryption ou ao menos criptografia de aplicação.

## Atlas e deploy

- Senha com caracteres especiais precisa de URL-encode na URI (`encodeURIComponent`).
- Network Access: em dev, seu IP; na Vercel e outros serverless o IP de saída varia, então a opção usual é `0.0.0.0/0` combinada com usuário de banco de privilégio mínimo e senha forte, ou um plano com peering/Private Link.
- Serverless abre muitas instâncias; mantenha `maxPoolSize` baixo (5–10) para não estourar o limite de conexões do cluster. Em Vercel, `attachDatabasePool` do `@vercel/functions` ajuda a liberar conexões ociosas, vale conferir na documentação atual.
- Crie um usuário de banco por ambiente, com role `readWrite` apenas no banco do app.
- Configure `MONGODB_URI` nas variáveis de ambiente do provedor, nunca no repositório.