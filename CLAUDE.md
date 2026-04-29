# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Code style
- Use pnpm to run commands
- Write code in english
- Do not comment code

# Commands

```bash
pnpm build          # compile via esbuild → dist/
pnpm clean          # rm -rf dist cdk.out
pnpm test           # run Jest test suite
pnpm dev:email      # preview email templates
pnpm deploy         # full CDK deploy
pnpm deploy:gateway # fast hotswap (Lambda/API Gateway only)
pnpm logs           # tail prod Lambda logs
```

Run a single test file:
```bash
pnpm jest src/path/to/file.test.ts
```

# Architecture

**Runtime**: Node.js 22 serverless on AWS Lambda. API Gateway V2 (HTTP API) routes requests to Lambda handlers composed with [Middy](https://middy.js.org/) middleware.

**Layer separation** (Clean Architecture):

| Layer | Path | Responsibility |
|---|---|---|
| Domain | `src/application/` | Entities, use cases, repository contracts, custom errors |
| Infrastructure | `src/infra/` | DynamoDB repos, S3/SQS/Cognito gateways, AI integration, email templates |
| Functions | `src/functions/` | Lambda entry points — thin wrappers that wire DI and call use cases |
| IaC | `stacks/` | AWS CDK stack (DynamoDB, S3, SQS, Cognito, CloudFront, API Gateway) |
| Kernel | `src/kernel/` | Custom DI container (`Registry`) and `@Injectable()` decorator |

## Request lifecycle

1. API Gateway → Lambda handler (`src/functions/<domain>/`)
2. Handler builds `HttpAdapter`, registers dependencies via `Registry`
3. Middy middleware stack: error-handler → JSON parser → validator (Zod) → CORS → response serializer
4. Use case (`src/application/usecases/<domain>/`) executes business logic
5. Repository (`src/infra/database/dynamo/repositories/`) reads/writes DynamoDB via item mappers

## Key patterns

**Use cases** implement `HttpUseCase<"public" | "private">`. Private use cases receive `accountId` from the Cognito JWT (enriched via the pre-token Cognito trigger). Return `{status, data?}` or `{status, message?}`.

**DI** — `@Injectable()` auto-registers a class. `Registry.resolve<T>(Ctor)` instantiates it with all constructor dependencies resolved recursively as singletons.

**DynamoDB** — Single-table design. All items carry `PK`, `SK`, and optionally `GSI1PK`/`GSI1SK`. Item classes (e.g. `AccountItem`) provide static `fromEntity` / `toEntity` mappers.

**Errors** — Extend `AppError` with an HTTP `statusCode` and an `ErrorCode` enum value. The Middy error handler maps them to HTTP responses automatically.

**AI meal processing** — S3 upload event → SQS queue → `MealsQueueConsumer` → `MealsAIGateway` (OpenAI GPT-4 vision/audio) → updates `Meal` entity in DynamoDB.

## AWS services

DynamoDB · S3 (meal images) · SQS + DLQ · Cognito (user pool + custom triggers) · CloudFront (CDN) · SES (transactional email) · Route53 (optional custom domain)
