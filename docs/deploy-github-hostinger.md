# Deploy via GitHub na Hostinger

Para este projeto, o caminho mais seguro com GitHub e Hostinger e usar o recurso `Node.js Web App` da Hostinger com importacao do repositorio GitHub.

Esse fluxo funciona melhor para Vite do que tentar sincronizar o repositorio direto em `public_html`.
O projeto agora sobe em modo Node com um servidor Express simples que entrega a build e faz fallback das rotas do React.

## 1. Preparar o repositorio

Antes de subir para o GitHub:

- mantenha o arquivo `.env` fora do Git
- confirme que o `.gitignore` esta ignorando:
  - `.env`
  - `dist`
  - arquivos `.zip`

Use somente o `.env.example` como referencia publica.

## 2. O que deve ir para o GitHub

Suba o codigo-fonte do projeto:

- `src/`
- `public/`
- `supabase/`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- arquivos de configuracao

Nao suba:

- `.env`
- `dist/`
- `node_modules/`
- zips de deploy

## 3. Variaveis de ambiente na Hostinger

No painel da Hostinger, configure estas variaveis:

```env
VITE_APP_BASE_PATH=/
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Se o app for publicado em subpasta, ajuste:

```env
VITE_APP_BASE_PATH=/nomedapasta/
```

## 4. Criar o app na Hostinger

No hPanel:

1. Abra `Websites`
2. Escolha o dominio
3. Abra `Node.js Web App`
4. Clique em criar novo app
5. Escolha a opcao de importar do `GitHub`
6. Conecte sua conta GitHub
7. Selecione o repositorio deste projeto

## 5. Build settings

Use estes comandos:

- Install command:

```sh
npm install
```

- Build command:

```sh
npm run build:hostinger
```

- Start command:

```sh
npm run start:hostinger
```

Se a Hostinger pedir apenas um comando de build completo, use:

```sh
npm install && npm run build:hostinger
```

## 6. Publicacao

Depois da primeira importacao:

1. confirme que a build terminou sem erro
2. abra o dominio
3. teste as rotas:
   - `/`
   - `/login`
   - `/acesso-elite`
   - `/app/minha-area`
   - `/cadastro/slug-do-curso`

## 7. Checklist final

Teste:

1. login admin
2. login aluno
3. cadastro de curso comum
4. cadastro do `Acesso Elite`
5. player
6. reload em rota interna
7. aprovacao no admin

## 8. Observacao importante

O projeto ja esta preparado com:

- build de producao
- `.htaccess` no `public/`
- suporte a SPA
- fallback correto para rotas internas

Mesmo usando GitHub, isso continua util caso a Hostinger publique o build como site estatico.
