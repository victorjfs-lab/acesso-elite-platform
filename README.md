# Course Platform

Plataforma de cursos com:

- pagina publica de apresentacao
- link de cadastro por turma
- painel admin para aprovar matriculas
- area do aluno com videoaulas Vimeo, PDFs e indicadores
- liberacao automatica por 365 dias

## Fluxo principal

1. Voce envia um link como `/cadastro/turma-radar-2026`.
2. O aluno preenche o formulario.
3. O pedido aparece no painel admin em `/app/admin`.
4. Ao clicar em `Liberar por 1 ano`, a matricula cria `expires_at` automaticamente.
5. O aluno acessa o curso em `/app/minha-area`.

## Modo demonstracao

Se o Supabase nao estiver configurado, a aplicacao entra em modo demo usando `localStorage`.

- Admin: `admin@academia.local` / `admin123`
- Aluno: `marina@aluno.local` / `acesso123`

## Supabase

O schema base esta em [supabase/schema.sql](C:\Users\User\Documents\Playground\course-platform-main\supabase\schema.sql).
O mapa estrutural do produto esta em [docs/estrutura-plataforma.md](C:\Users\User\Documents\Playground\course-platform-main\docs\estrutura-plataforma.md).

Tabelas principais:

- `academy_users`
- `courses`
- `course_modules`
- `course_lessons`
- `course_resources`
- `enrollment_links`
- `enrollment_requests`
- `enrollments`

### Cadastro automatico do aluno

Para o cadastro publico criar o usuario no `Supabase Auth` e gravar a solicitacao de matricula de forma confiavel, o projeto agora usa a Edge Function:

- [supabase/functions/create-student-enrollment/index.ts](C:\Users\User\Documents\Playground\course-platform-main\supabase\functions\create-student-enrollment\index.ts)
- [supabase/config.toml](C:\Users\User\Documents\Playground\course-platform-main\supabase\config.toml)

Depois de subir o `schema.sql`, publique essa funcao no seu projeto Supabase.

Fluxo:

1. O aluno envia o formulario publico
2. A Edge Function cria o usuario no `Auth`
3. A Edge Function cria ou atualiza o perfil em `academy_users`
4. A Edge Function grava o pedido em `enrollment_requests`
5. O admin aprova e libera o acesso por 365 dias

Se voce for publicar com Supabase CLI, os comandos sao:

```sh
supabase login
supabase link --project-ref qtffttmjjfgpyonzijky
supabase functions deploy create-student-enrollment --no-verify-jwt
```

## Rodando localmente

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Hostinger

Para publicar na Hostinger com rotas do React funcionando:

```sh
npm run build:hostinger
npm run package:hostinger
```

O guia completo esta em [docs/deploy-hostinger.md](C:\Users\User\Documents\Playground\course-platform-main\docs\deploy-hostinger.md).

Se voce preferir publicar via GitHub na Hostinger, use o fluxo em [docs/deploy-github-hostinger.md](C:\Users\User\Documents\Playground\course-platform-main\docs\deploy-github-hostinger.md).
