# TailwindCSS no Next.js

Conteúdo: [Setup v4](#setup-tailwind-v4) · [Setup v3](#setup-tailwind-v3) · [cn()](#helper-cn) · [Tema e dark mode](#tema-e-dark-mode) · [Padrões de UI](#padrões-de-ui) · [Formulários](#formulários-acessíveis) · [Armadilhas](#armadilhas)

Confira a versão no `package.json` antes de escrever: v3 e v4 têm setups diferentes.

## Setup (Tailwind v4)

```bash
npm i tailwindcss @tailwindcss/postcss postcss clsx tailwind-merge
```

```js
// postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
```

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 260);
  --color-brand-600: oklch(0.55 0.2 260);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

/* dark mode por classe (necessário para next-themes) */
@custom-variant dark (&:where(.dark, .dark *));
```

Em v4 não existe `tailwind.config.js` por padrão: tokens vão em `@theme` e os arquivos são detectados automaticamente. Importe `globals.css` em `app/layout.tsx`.

## Setup (Tailwind v3)

```bash
npm i -D tailwindcss@3 postcss autoprefixer
```

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],   // todo arquivo com classes precisa estar aqui
  theme: { extend: { colors: { brand: { 500: "#4f46e5", 600: "#4338ca" } } } },
} satisfies Config;
```

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Helper cn()

Combina classes condicionais e resolve conflitos (`px-2` vs `px-4`), essencial para componentes que aceitam `className`.

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

## Tema e dark mode

```bash
npm i next-themes
```

```tsx
// src/components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemes attribute="class" defaultTheme="system" enableSystem>{children}</NextThemes>;
}
```

```tsx
// src/app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-dvh bg-white font-sans text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` no `<html>` evita o aviso causado pelo `next-themes` ao definir a classe antes da hidratação.

## Padrões de UI

Componente com variantes, sem biblioteca extra:

```tsx
// src/components/ui/button.tsx
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  outline: "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800",
  ghost: "hover:bg-neutral-100 dark:hover:bg-neutral-800",
} as const;

const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-12 px-6 text-lg" } as const;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({ variant = "primary", size = "md", className, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
}
```

Se o projeto crescer em componentes complexos (dialog, dropdown, select), considere shadcn/ui, que usa exatamente Tailwind + `cn()` e copia o código para o projeto.

Layout responsivo: escreva mobile-first (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`) e use `min-h-dvh` em vez de `h-screen` para evitar o problema da barra de endereço em celulares.

Imagens: `next/image` com `className` do Tailwind, `fill` + container `relative` com proporção (`aspect-video`).

## Formulários acessíveis

- Todo input tem `<label htmlFor>` (pode ser `sr-only` visualmente).
- Erros com `role="alert"` e ligados ao campo via `aria-describedby`.
- Estado de foco visível (`focus-visible:`), nunca só `outline-none`.
- Botão de envio desabilitado enquanto `pending` (`useActionState`/`useFormStatus`).
- Contraste suficiente nos dois temas; teste o dark mode antes de entregar.

## Armadilhas

| Problema | Correção |
|---|---|
| `` `bg-${cor}-500` `` não funciona | O Tailwind lê o texto do código, não executa JS. Use um mapa com strings completas (`{ red: "bg-red-500", ... }`) ou `style` para valores realmente dinâmicos. |
| Classes de uma pasta nova não aplicam (v3) | Inclua o caminho no `content`. |
| Estilo nenhum aplicado (v4) | Falta `@import "tailwindcss"` no CSS global ou o plugin no `postcss.config.mjs`. |
| `dark:` não responde ao toggle (v4) | Falta o `@custom-variant dark` acima; por padrão o v4 usa `prefers-color-scheme`. |
| Classe do `className` recebido não sobrescreve | Passe por `cn()`/`twMerge`, com `className` por último. |
| Conflito entre estilos globais e utilitárias | Evite CSS global de elementos; use `@layer base` para resets. |
| `"use client"` só para estilizar | Não precisa. Tailwind funciona em Server Components; marque como cliente só para interatividade. |