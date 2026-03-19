# Deploy na Hostinger

Este projeto e um app React/Vite estatico com Supabase. Na Hostinger, o caminho mais simples e confiavel e publicar o conteudo gerado em `dist/` dentro de `public_html`.

## 1. Configurar ambiente

Crie ou ajuste o arquivo `.env` com:

```env
VITE_APP_BASE_PATH=/
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Use `VITE_APP_BASE_PATH=/` se o site for abrir no dominio principal.

Se voce for publicar em subpasta, por exemplo `https://seudominio.com/portal/`, use:

```env
VITE_APP_BASE_PATH=/portal/
```

## 2. Gerar a build

```sh
npm install
npm run build:hostinger
```

Isso gera a pasta `dist/`.

## 3. Empacotar para upload

```sh
npm run package:hostinger
```

Isso gera o arquivo `course-platform-hostinger.zip`.

## 4. Subir para a Hostinger

No painel da Hostinger:

1. Abra o `File Manager`
2. Entre em `public_html`
3. Apague os arquivos antigos do site, se existirem
4. Envie o conteudo de `dist/` ou o arquivo `course-platform-hostinger.zip`
5. Se enviar o zip, extraia o zip dentro de `public_html`

Importante:

- os arquivos precisam ficar direto dentro de `public_html`
- nao suba a pasta `dist` inteira como uma pasta interna

Correto:

```txt
public_html/index.html
public_html/assets/...
public_html/.htaccess
```

Errado:

```txt
public_html/dist/index.html
```

## 5. Rotas do React

O arquivo `public/.htaccess` ja foi preparado para:

- abrir links diretos como `/app/minha-area`
- abrir links de cadastro como `/cadastro/slug`
- abrir `/acesso-elite`

## 6. Checklist final

Depois do upload, teste:

1. Pagina inicial
2. Login admin
3. Login aluno
4. `Acesso Elite`
5. Link de cadastro de um curso
6. Player de aula
7. Atualizar a pagina em uma rota interna, por exemplo `/app/minha-area`

## 7. GitHub

Se voce quiser usar GitHub como origem do codigo, mantenha o repositorio como fonte de backup e versionamento.

Para publicacao em hospedagem compartilhada da Hostinger, o fluxo mais seguro continua sendo:

1. atualizar codigo
2. rodar build local
3. subir o conteudo de `dist/` para `public_html`
