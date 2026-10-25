<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

NestJS API for a novel reading platform. MySQL 8 is used for persistent storage.

## Project setup

```bash
npm install
cp .env.example .env
```

Set the MySQL connection values in `.env`. Create the database and sixteen tables
(10 business tables plus 6 AI customer-service tables) by running the SQL script:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p < database/schema.sql
```

For an existing installation, apply
`database/migrations/20261023_create_ai_tables.sql` as the incremental migration.
The AI knowledge-base vectors live in PostgreSQL 16 with the pgvector extension;
apply `database/migrations/20261023_create_ai_vectors.sql`, or set
`VECTOR_DB_AUTO_MIGRATE=true` in development to create the extension, table and
HNSW index on startup.

For local development, `DB_SYNCHRONIZE=true` lets TypeORM synchronize entity
changes on startup. Use `DB_SYNCHRONIZE=false` in production and apply reviewed
SQL migrations instead. The `admin_settings` table is included in
`database/schema.sql`; when upgrading an existing installation with
`DB_SYNCHRONIZE=false`, apply
`database/migrations/20261020_create_admin_settings.sql`. Never expose a
production database to the public network or use the example credentials there.

### Applying migrations to an existing environment

`database/schema.sql` is only for a fresh database. For an existing test or
production database, apply the files under `database/migrations/` in filename
order against the database named by `DB_DATABASE`. The helper script uses a
local `mysql` client when available and falls back to the `mysql:8.0` Docker
image:

```bash
DB_HOST=<host> DB_PORT=3306 DB_USERNAME=<user> DB_PASSWORD=<password> \
  DB_DATABASE=novel_platform \
  ./database/scripts/apply-mysql-migration.sh \
  database/migrations/20261024_disable_idle_auto_transfer.sql
```

Before running the optional data cleanup, back up `ai_conversations`,
`ai_messages` and `ai_settings`. When MySQL runs in a container on the same
server, point the script at the container instead of publishing its port:

```bash
DB_CONTAINER=mysql DB_USERNAME=root DB_PASSWORD=<password> \
  DB_DATABASE=novel_platform \
  ./database/scripts/apply-mysql-migration.sh \
  database/migrations/20261024_disable_idle_auto_transfer.sql
```

When MySQL runs inside Kubernetes, pipe the same file through the pod instead:

```bash
kubectl exec -i -n <namespace> deploy/mysql -- \
  mysql -uroot -p"$DB_PASSWORD" novel_platform \
  < database/migrations/20261024_disable_idle_auto_transfer.sql
```

All migration files are written to be re-runnable (`CREATE TABLE IF NOT EXISTS`,
`DELETE` / `UPDATE` scoped by old markers).

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

The API listens on `PORT` (default `3000`).

## Admin banner API

Log in with `POST /api/admin/login`, then send the returned token as
`Authorization: Bearer <accessToken>`. Banner management requires the admin
role. Both `/api/admin/banners` and `/api/admin/banner` are supported:

- `GET /api/admin/banners` — list all banners, including disabled banners
- `POST /api/admin/banners` — create a banner (`title`, `imageUrl`, and optional
  `linkType`, `linkTarget`, `sort`, `status`, `startAt`, and `endAt`)
- `PUT /api/admin/banners/:id` — update supplied banner fields
- `DELETE /api/admin/banners/:id` — delete a banner

Dates should be ISO 8601 strings. `linkType` accepts `1` (book), `2`
(category), or `3` (external link); `status` accepts `0` (disabled) or `1`
(enabled).

## Admin content API

All content-management routes require the admin JWT. The singular and plural
resource names are both accepted. Each resource supports list, detail, create,
update, and delete:

- Books: `GET /api/admin/books`, `GET /api/admin/books/:id`,
  `POST /api/admin/books`, `PUT /api/admin/books/:id`,
  `DELETE /api/admin/books/:id`
- Chapters: the same methods under `/api/admin/chapters`; chapter creation
  requires `bookId`, `chapterNum`, `title`, and `content`. Chapter changes
  recalculate the parent book's chapter and word counts.
- Categories: the same methods under `/api/admin/categories`; list items include
  `bookCount`. A category with books can be deleted by passing
  `?reassignTo=<categoryId>` to move its books to another category first;
  without `reassignTo` the API returns `409` with the current book count.

The legacy action-style routes `/book/list`, `/book/create`,
`/book/update/:id`, and `/book/delete/:id` are also accepted (and likewise for
chapters and categories).

## Admin settings API

All routes require an admin JWT:

- `GET /api/admin/settings` returns the persisted site name, contact phone,
  email, and version. Missing values use platform defaults.
- `PUT /api/admin/settings` validates and saves all four values to
  `admin_settings` using key/value rows (`siteName`, `contact`, `email`,
  `version`); email must be valid.

## Admin operational API

- `GET /api/admin/comments` lists comments for moderation;
  `PATCH /api/admin/comments/:id/status` toggles visibility.
- `POST /api/admin/chapters/batch` imports chapter bodies in one transaction.
- `POST /api/admin/upload` accepts a multipart `file` field containing a JPG,
  PNG, WebP, or GIF image up to 5 MB. The returned URL can be fetched at
  `/api/admin/uploads/:filename`.

## AI customer service API

The AI module exposes the H5 endpoints under `/api/ai` (user JWT required) and
the management endpoints under `/api/admin/ai` (admin JWT required). Responses
follow the standard `{ code, message, data }` envelope, except
`POST /api/ai/chat`, which is an SSE stream (`message` / `done` / `transfer` /
`error` events).

LLM and embedding providers are pluggable: `ai_settings.llmProvider` (or the
`LLM_PROVIDER` environment variable when the setting is not persisted yet)
selects `openai`, `doubao` or `zhipu`. All providers use the OpenAI-compatible
Chat Completions and Embeddings protocol, so only the API base, key and model
need to change:

- `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`
- `OPENAI_API_BASE` / `DOUBAO_API_BASE` / `ZHIPU_API_BASE`
- `OPENAI_API_KEY` / `DOUBAO_API_KEY` / `ZHIPU_API_KEY`
- `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_API_BASE`
- `LLM_TIMEOUT_MS` (default 30000) and `EMBEDDING_TIMEOUT_MS` (default 10000)

`SENSITIVE_WORDS` accepts a comma/semicolon/whitespace separated word list that
is shared by comments and AI chat; leave it empty to disable word matching.

`AI_API_BASE` is a universal override for both chat and embeddings. Chat
requests are rate limited per user through `@RateLimit` + Redis using
`ai_settings.rateLimitPerMinute` (default 10 per minute); admin knowledge tests
are limited to 20 per minute. Persisted AI settings are cached for five seconds
and refreshed immediately after `PUT /api/admin/ai/settings`.

Knowledge documents support TXT, Markdown, PDF and DOCX uploads (maximum 10 MB)
as well as manual text and HTTPS web pages. Parsing runs in the Bull queue
(`ai-knowledge`), chunks the text, writes embeddings to pgvector, and records
`status` / `failReason` for the admin UI.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
