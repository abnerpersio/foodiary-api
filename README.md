# Foodiary API

A serverless API for AI-powered food diary and nutrition tracking. Users can log meals by taking a photo or recording an audio description, and the app automatically analyzes the nutritional content — calories, protein, carbohydrates, and fats — using GPT-4 vision and Whisper.

---

## What it does

- **Log meals** by uploading a photo or audio recording
- **AI nutritional analysis** — GPT-4 automatically reads the meal and returns macros
- **Set nutrition goals** — daily targets for calories and macronutrients based on your profile
- **User profiles** — height, weight, age, gender, activity level
- **Authentication** — email/password and Google OAuth sign-in

---

## Tech stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Node.js 22 on AWS Lambda            |
| Language   | TypeScript                          |
| HTTP       | API Gateway V2 + Middy middleware   |
| Database   | DynamoDB (single-table design)      |
| Auth       | Amazon Cognito                      |
| Storage    | S3 + CloudFront CDN                 |
| Queue      | SQS (async meal processing)         |
| AI         | OpenAI GPT-4o-mini (vision + audio) |
| Email      | SES + React Email templates         |
| IaC        | AWS CDK                             |
| Monitoring | Sentry                              |

---

## Project structure

```
src/
├── application/      # Business logic — entities, use cases, repository contracts
├── functions/        # Lambda handlers — thin entry points wired by domain
├── infra/            # Infrastructure — DynamoDB, S3, SQS, Cognito, OpenAI
├── kernel/           # Custom DI container and decorators
└── shared/           # Config, utilities, types

stacks/               # AWS CDK infrastructure definitions
```

Architecture follows **Clean Architecture** — business logic in `application/` has no knowledge of AWS or any external service. The `infra/` layer implements those contracts.

---

## API endpoints

### Public

| Method | Route              | Description                              |
| ------ | ------------------ | ---------------------------------------- |
| POST   | `/sign-up`         | Create account                           |
| POST   | `/sign-in`         | Log in with email and password           |
| POST   | `/refresh-token`   | Refresh access token                     |
| POST   | `/forgot-password` | Request a password reset email           |
| POST   | `/reset-password`  | Set a new password using the reset token |
| GET    | `/auth/code`       | Exchange Google OAuth code for tokens    |

### Private (requires authentication)

| Method | Route              | Description                     |
| ------ | ------------------ | ------------------------------- |
| GET    | `/me`              | Get the current user            |
| POST   | `/profile`         | Create user profile             |
| PUT    | `/profile`         | Update user profile             |
| POST   | `/profile/picture` | Upload profile picture          |
| PUT    | `/goals`           | Update daily nutrition goals    |
| POST   | `/meals`           | Log a new meal (photo or audio) |
| GET    | `/meals`           | List meals for a given date     |
| GET    | `/meals/{mealId}`  | Get a single meal               |
| DELETE | `/meals/{mealId}`  | Delete a meal                   |

---

## How meal processing works

1. Client uploads a photo or audio file to S3
2. S3 triggers an SQS event
3. A Lambda consumer picks up the event and calls OpenAI
4. GPT-4 vision (for photos) or Whisper + GPT-4 (for audio) analyzes the meal
5. The result — calories, protein, carbs, fat, and meal name — is saved to DynamoDB
6. The meal status transitions: `UPLOADING → QUEUED → PROCESSING → SUCCESS`

---

## Getting started

### Prerequisites

- Node.js 22
- pnpm
- AWS CLI configured with appropriate credentials
- An AWS account

### Install dependencies

```bash
pnpm install
```

### Environment variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

Key variables:

```
OPENAI_API_KEY=           # Required for AI meal analysis
ALLOWED_ORIGINS=          # Frontend URL (e.g. http://localhost:5173)
SENTRY_DSN=               # Error monitoring (optional)
GOOGLE_CLIENT_ID=         # Google OAuth (optional)
GOOGLE_CLIENT_SECRET=
```

### Available commands

```bash
pnpm build          # Compile TypeScript via esbuild → dist/
pnpm test           # Run the Jest test suite
pnpm dev:email      # Preview email templates in the browser
pnpm deploy         # Deploy everything to AWS via CDK
pnpm deploy:gateway # Fast hotswap deploy (Lambda + API Gateway only)
pnpm logs           # Tail production Lambda logs
pnpm clean          # Delete dist/ and cdk.out/
```

### Run a single test file

```bash
pnpm jest src/path/to/file.test.ts
```

---

## Architecture notes

**Dependency injection** — Classes decorated with `@Injectable()` are auto-registered. `Registry.resolve<T>(Ctor)` instantiates them with all dependencies resolved recursively as singletons per request.

**Error handling** — Every domain error extends `AppError` with an HTTP status code and an `ErrorCode` enum. Middy's error handler automatically serializes them to the correct HTTP response.

**Saga / compensating transactions** — Used during sign-up. If the DynamoDB write fails after Cognito creates the user, a compensation step deletes the Cognito user to avoid orphaned accounts.

**Single-table DynamoDB** — All entities share one table using PK/SK patterns:

| Entity  | PK                    | SK              |
| ------- | --------------------- | --------------- |
| Account | `ACCOUNT#{id}`        | `#METADATA`     |
| Profile | `ACCOUNT#{accountId}` | `#PROFILE`      |
| Goal    | `ACCOUNT#{accountId}` | `#GOAL`         |
| Meal    | `ACCOUNT#{accountId}` | `MEAL#{mealId}` |

---
