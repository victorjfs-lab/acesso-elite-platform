# Estrutura da Plataforma

## Objetivo

Entregar um portal de cursos com:

- cadastro publico por link
- aprovacao manual da matricula
- area do aluno protegida
- acesso liberado por 365 dias
- aulas em Vimeo, PDFs e indicadores

## Perfis

### Admin

- cria e compartilha links de cadastro
- aprova pedidos de matricula
- renova acessos vencidos
- acompanha alunos ativos, pendentes e expirados

### Aluno

- envia cadastro pelo link recebido
- entra na area protegida
- consome aulas, PDFs e indicadores
- perde acesso automaticamente ao vencer a data

## Mapa de paginas

### Publico

- `/`
  - landing da plataforma
  - mostra cursos publicados
  - direciona para cadastro ou login
- `/cadastro/:slug`
  - formulario publico de inscricao
  - registra pedido em `enrollment_requests`
- `/login`
  - entrada para admin e aluno

### Protegido

- `/app`
  - redireciona conforme perfil
- `/app/admin`
  - painel admin com pedidos, links e alunos
- `/app/minha-area`
  - dashboard do aluno com cursos liberados
- `/app/curso/:courseId`
  - player com Vimeo, modulos, aulas e materiais

## Estrutura de dados

### `academy_users`

- perfil da pessoa dentro da plataforma
- liga o usuario do Auth ao papel `admin` ou `student`

### `courses`

- cadastro do curso
- informacoes de capa, descricao, instrutor e prazo de acesso

### `course_modules`

- blocos do curso
- controlam a ordem da trilha

### `course_lessons`

- aulas individuais
- guardam titulo, resumo, ordem e `vimeo_url`

### `course_resources`

- materiais complementares
- PDFs, indicadores, planilhas e bonus

### `enrollment_links`

- links publicos de cadastro por turma, campanha ou oferta

### `enrollment_requests`

- pedidos feitos no formulario publico
- status: `pending`, `approved`, `rejected`

### `enrollments`

- acesso efetivamente liberado
- guarda `granted_at`, `expires_at` e status

## Fluxo operacional

1. O admin envia um link como `/cadastro/turma-radar-2026`.
2. O aluno preenche nome, email e WhatsApp.
3. O sistema grava um registro em `enrollment_requests`.
4. O admin aprova no painel.
5. O sistema cria um `enrollment` com `expires_at = granted_at + 365 dias`.
6. O aluno entra e acessa apenas os cursos ativos.
7. Ao vencer a data, o curso some da area ativa e passa para expirado.

## Estrutura atual de frontend

### `src/pages`

- `Home.tsx`
- `EnrollmentPage.tsx`
- `Login.tsx`
- `AppIndex.tsx`
- `AdminDashboard.tsx`
- `StudentHome.tsx`
- `CoursePlayer.tsx`

### `src/lib`

- `academy-repository.ts`
  - leitura e escrita de dados
  - fallback para demo em `localStorage`
- `academy-demo-store.ts`
  - persistencia local do modo demonstracao
- `supabase.ts`
  - cliente Supabase

### `src/context`

- `AuthContext.tsx`
  - login real com Supabase
  - login demo sem Supabase

### `src/data`

- `academyMock.ts`
  - seed inicial para testar o fluxo

### `src/types`

- `academy.ts`
  - contratos de curso, aula, material, pedido e matricula

## Regras de negocio

- somente o admin libera acesso
- o acesso padrao vale 365 dias
- o curso do aluno depende de `enrollments`
- pedidos e acessos sao entidades separadas
- um mesmo curso pode ter varios links de cadastro

## Proxima etapa de estrutura

- conectar o projeto ao Supabase real
- cadastrar seus cursos e links verdadeiros
- importar seus links Vimeo reais
- trocar materiais mock por PDFs e indicadores reais
- definir se o admin vai criar usuarios manualmente ou se usaremos convite por email
