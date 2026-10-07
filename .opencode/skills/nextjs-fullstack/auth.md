# Autenticação com NextAuth / Auth.js + MongoDB

Conteúdo: [Instalação](#instalação) · [Arquitetura em dois arquivos](#arquitetura-em-dois-arquivos) · [Credentials](#login-com-email-e-senha-credentials) · [OAuth](#oauth-google-github) · [Rotas e proxy](#proteção-de-rotas) · [Tipos](#tipos-do-typescript) · [Uso](#usando-a-sessão) · [Segurança](#segurança) · [v4](#diferenças-para-nextauth-v4)

Os exemplos usam **Auth.js v5** (`next-auth@beta`/versão estável mais recente), App Router e TypeScript. Para v4, veja a última seção.

## Instalação

```bash
npm i next-auth@beta @auth/mongodb-adapter bcryptjs zod
npm i -D @types/bcryptjs
npx auth secret        # gera AUTH_SECRET no .env.local
```

`.env.local` (e `.env.example` sem valores):

```
AUTH_SECRET=...
AUTH_URL=http://localhost:3000        # em produção, a URL pública
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/app
```

Em v5, variáveis com prefixo `AUTH_` são lidas automaticamente pelos providers (`AUTH_GOOGLE_ID` etc.).

## Arquitetura em dois arquivos

O proxy/middleware roda no runtime Edge, onde o driver do MongoDB não funciona. Por isso a config se divide:

- `auth.config.ts`: leve, sem banco e sem bcrypt. Contém páginas, callbacks `authorized`/`jwt`/`session` e a lista de providers "vazia" ou só OAuth.
- `auth.ts`: completa (Node). Estende a leve com adapter, Credentials e acesso ao banco.

```ts
// src/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [], // providers reais ficam em auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/dashboard");
      if (isProtected) return loggedIn;               // false => redireciona ao /login
      if (loggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
```

```ts
// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import clientPromise from "@/lib/mongodb";
import { authConfig } from "./auth.config";
import { getUserByEmail } from "@/lib/data/users";

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(72), // bcrypt ignora além de 72 bytes
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" }, // obrigatório para Credentials
  providers: [
    Google,
    Credentials({
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await getUserByEmail(parsed.data.email, { withPassword: true });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
```

Por que JWT e adapter juntos: o adapter continua gravando usuários e contas OAuth no Mongo, mas a sessão vive no cookie assinado. É o único modo suportado quando há Credentials.

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

## Login com email e senha (Credentials)

**Cadastro** é por sua conta, o Auth.js não cria usuário em Credentials. Use uma Server Action:

```ts
// src/app/actions/auth.ts
"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { createUser, getUserByEmail } from "@/lib/data/users";

const registerSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(72),
});

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { name, email, password } = parsed.data;
  if (await getUserByEmail(email)) return { error: "Email já cadastrado." };

  await createUser({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Email ou senha inválidos." };
    throw e; // o redirect do signIn é lançado como erro e precisa propagar
  }
}
```

Pontos que costumam dar errado:
- Sempre relançar o erro que não for `AuthError`, senão o redirect pós-login é engolido.
- Mensagem de erro genérica para email inexistente e senha errada (evita enumeração de usuários).
- Normalizar email (lowercase/trim) tanto no cadastro quanto no login.

Formulário (Client Component) com `useActionState`:

```tsx
"use client";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-4">
      <input name="email" type="email" required autoComplete="email" className="w-full rounded-md border px-3 py-2" />
      <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-md border px-3 py-2" />
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

## OAuth (Google, GitHub)

Basta importar o provider e definir `AUTH_<PROVIDER>_ID/SECRET`. A URL de callback a cadastrar no console do provedor é `{AUTH_URL}/api/auth/callback/google` (troque `google` pelo id do provider). Botão de login via Server Action:

```tsx
import { signIn } from "@/auth";
<form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
  <button>Entrar com Google</button>
</form>
```

Se o mesmo email puder entrar por Google e por senha, decida a política conscientemente: `allowDangerousEmailAccountLinking` só é seguro com providers que verificam o email.

## Proteção de rotas

Proxy/middleware usando **apenas** a config leve:

```ts
// src/proxy.ts   (em Next 15 ou anterior: src/middleware.ts, com export `middleware`/default)
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

Defesa em profundidade: o proxy é a primeira barreira, não a única. Repita a checagem onde o dado é lido ou alterado.

```tsx
// Layout/página protegida
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <>{children}</>;
}
```

```ts
// Helper reutilizável para actions e route handlers
import "server-only";
import { auth } from "@/auth";

export async function requireUser(role?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (role && session.user.role !== role) throw new Error("FORBIDDEN");
  return session.user;
}
```

Para recursos com dono, filtre a query pelo `ownerId` da sessão, nunca confie num `userId` vindo do cliente.

## Tipos do TypeScript

```ts
// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
```

## Usando a sessão

- **Server Component / action / handler**: `const session = await auth()`.
- **Client Component**: envolva a árvore em `<SessionProvider>` (de `next-auth/react`) e use `useSession()`. Prefira passar o que precisa como props a partir do servidor; use `useSession` só quando o cliente realmente precisa reagir à sessão.
- **Logout**: Server Action com `await signOut({ redirectTo: "/" })` ou `signOut` de `next-auth/react` no cliente.

## Segurança

- `bcrypt` com custo ≥ 12 (`bcryptjs` roda em qualquer runtime Node; `bcrypt` nativo é mais rápido, mas exige build nativo).
- Limite tentativas de login (rate limit por IP + email, ex.: Upstash Ratelimit) para frear força bruta.
- `AUTH_SECRET` forte e diferente por ambiente; rotacionar invalida sessões.
- Em produção atrás de proxy/host próprio, defina `AUTH_URL` ou `AUTH_TRUST_HOST=true` conforme a doc do ambiente.
- Roles no JWT ficam desatualizadas até o token renovar. Para permissões que mudam com frequência ou revogação imediata, releia o usuário no banco nas operações sensíveis.
- Nunca logue senha, hash ou token.

## Diferenças para NextAuth v4

| Tema | v4 | v5 / Auth.js |
|---|---|---|
| Config | `authOptions` exportado de qualquer arquivo | `NextAuth({...})` em `auth.ts`, que exporta `handlers, auth, signIn, signOut` |
| Sessão no servidor | `getServerSession(authOptions)` | `auth()` |
| Route handler | `const handler = NextAuth(authOptions); export { handler as GET, handler as POST }` | `export const { GET, POST } = handlers` |
| Env | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | `AUTH_SECRET`, `AUTH_URL` |
| Middleware | `export { default } from "next-auth/middleware"` | `export default NextAuth(authConfig).auth` |
| Adapter | `@next-auth/mongodb-adapter` | `@auth/mongodb-adapter` |

Se o projeto estiver em v4, mantenha o padrão `authOptions` + `getServerSession` e não misture APIs das duas versões.