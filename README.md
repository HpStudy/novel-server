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

Set the MySQL connection values in `.env`. Create the database and ten tables by
running the SQL script:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p < database/schema.sql
```

For local development, `DB_SYNCHRONIZE=true` lets TypeORM synchronize entity
changes on startup. Use `DB_SYNCHRONIZE=false` in production and apply reviewed
SQL migrations instead. The `admin_settings` table is included in
`database/schema.sql`; when upgrading an existing installation with
`DB_SYNCHRONIZE=false`, apply
`database/migrations/20261020_create_admin_settings.sql`. Never expose a
production database to the public network or use the example credentials there.

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
- Categories: the same methods under `/api/admin/categories`; a category with
  books cannot be deleted.

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
