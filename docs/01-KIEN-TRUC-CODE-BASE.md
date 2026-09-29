# 01. Kiáº¿n trÃºc code base

TÃ i liá»‡u nÃ y mÃ´ táº£ kiáº¿n trÃºc hiá»‡n táº¡i Ä‘á»ƒ tá»± triá»ƒn khai tá»«ng pháº§n báº±ng tay. Má»¥c tiÃªu lÃ  Ã­t táº§ng, dá»… láº§n theo luá»“ng code vÃ  chá»‰ thÃªm abstraction khi cÃ³ nhu cáº§u tháº­t.

## 1. NguyÃªn táº¯c

1. Frontend vÃ  backend lÃ  hai app Ä‘á»™c láº­p.
2. Backend lÃ  modular monolith, khÃ´ng tÃ¡ch microservice.
3. Má»—i nghiá»‡p vá»¥ náº±m trong má»™t module; code dÃ¹ng chung má»›i Ä‘Æ°a vÃ o `core/`.
4. KhÃ´ng táº¡o sáºµn hÃ ng loáº¡t file rá»—ng hoáº·c interface chá»‰ cÃ³ má»™t implementation.
5. Route chá»‰ khai bÃ¡o URL, middleware vÃ  controller.
6. Controller xá»­ lÃ½ HTTP nhÆ°ng khÃ´ng chá»©a business logic vÃ  khÃ´ng gá»i Prisma.
7. Service kh?ng ph? thu?c Express; service ???c ph?p g?i Prisma tr?c ti?p. Repository ch? d?ng khi c? persistence responsibility r? r?ng.
8. Má»—i file nÃªn dÆ°á»›i 300 dÃ²ng. Khi dÃ i, tÃ¡ch theo trÃ¡ch nhiá»‡m thay vÃ¬ tÃ¡ch mÃ¡y mÃ³c.

## 2. PhÃ¢n loáº¡i module backend

### 2.1 Platform core

Code háº¡ táº§ng dÃ¹ng chung, khÃ´ng chá»©a luáº­t nghiá»‡p vá»¥ cá»§a má»™t tÃ­nh nÄƒng cá»¥ thá»ƒ.

| NhÃ³m       | Vá»‹ trÃ­               | TrÃ¡ch nhiá»‡m                                         |
| ---------- | -------------------- | --------------------------------------------------- |
| Config     | `src/config/`        | Äá»c vÃ  validate biáº¿n mÃ´i trÆ°á»ng                     |
| Database   | `src/core/database/` | Prisma client vÃ  transaction helper khi tháº­t sá»± cáº§n |
| HTTP       | `src/core/http/`     | Response, error vÃ  status dÃ¹ng chung                |
| Middleware | `src/middleware/`    | Xá»­ lÃ½ concern chung cá»§a HTTP request                |
| Routes     | `src/routes/`        | Mount route cá»§a cÃ¡c module vÃ o `/api/v1`            |

Endpoint váº­n hÃ nh gá»“m `/health` Ä‘á»ƒ kiá»ƒm tra process API vÃ  `/ready` Ä‘á»ƒ kiá»ƒm tra API cÃ³ káº¿t ná»‘i Ä‘Æ°á»£c PostgreSQL hay khÃ´ng.

KhÃ´ng Ä‘Æ°a business rule nhÆ° kiá»ƒm tra role, chÃ­nh sÃ¡ch máº­t kháº©u hoáº·c tÃ­nh phÃ­ vÃ o `core/`.

### 2.2 Business modules

CÃ¡c module mÃ´ táº£ trá»±c tiáº¿p nghiá»‡p vá»¥ sáº£n pháº©m.

| Module   | Má»¥c Ä‘Ã­ch                                       | Má»©c Æ°u tiÃªn                     |
| -------- | ---------------------------------------------- | ------------------------------- |
| `auth`   | ÄÄƒng kÃ½, Ä‘Äƒng nháº­p, refresh vÃ  logout          | LÃ m Ä‘áº§u tiÃªn                    |
| `users`  | Há»“ sÆ¡ ngÆ°á»i dÃ¹ng vÃ  tráº¡ng thÃ¡i tÃ i khoáº£n       | Sau auth                        |
| `access` | Role, permission vÃ  authorization policy       | Sau users                       |
| `files`  | Metadata, upload, download vÃ  xÃ³a file         | Khi sáº£n pháº©m cáº§n                |
| `audit`  | Ghi láº¡i hÃ nh Ä‘á»™ng báº£o máº­t/nghiá»‡p vá»¥ quan trá»ng | ThÃªm cÃ¹ng cÃ¡c thao tÃ¡c quáº£n trá»‹ |

`access` Ä‘Æ°á»£c tÃ¡ch khá»i `users` vÃ¬ phÃ¢n quyá»n lÃ  má»™t concern riÃªng, nhÆ°ng chÆ°a cáº§n tÃ¡ch thÃ nh service Ä‘á»™c láº­p.

### 2.3 Integration modules

CÃ¡c module giao tiáº¿p vá»›i dá»‹ch vá»¥ bÃªn ngoÃ i.

| Module    | Má»¥c Ä‘Ã­ch                     | Quy táº¯c                                                                   |
| --------- | ---------------------------- | ------------------------------------------------------------------------- |
| `mail`    | Gá»­i email vÃ  render template | Business service chá»‰ yÃªu cáº§u gá»­i, khÃ´ng gá»i SMTP trá»±c tiáº¿p                |
| `storage` | Local disk hoáº·c R2/S3        | Chá»‰ táº¡o interface khi cÃ³ Ã­t nháº¥t hai driver                               |
| `oauth`   | Google hoáº·c provider khÃ¡c    | Äáº·t riÃªng khi flow Ä‘á»§ lá»›n; náº¿u chá»‰ Google cÃ³ thá»ƒ náº±m trong `auth/google/` |

### 2.4 Background modules

| Module | Má»¥c Ä‘Ã­ch                            | Quy táº¯c                               |
| ------ | ----------------------------------- | ------------------------------------- |
| `jobs` | Queue, scheduler vÃ  handler pg-boss | Chá»‰ worker xá»­ lÃ½ job; API chá»‰ enqueue |

`server.ts` chá»‰ cháº¡y HTTP API. `worker.ts` chá»‰ cháº¡y background job. KhÃ´ng khá»Ÿi Ä‘á»™ng worker trong API process.

## 3. Cáº¥u trÃºc má»™t module tá»‘i giáº£n

KhÃ´ng dÃ¹ng má»™t template cá»©ng cho má»i module. Báº¯t Ä‘áº§u vá»›i cáº¥u trÃºc nhá» nháº¥t:

```text
modules/auth/
â”œâ”€â”€ auth.routes.ts
â”œâ”€â”€ auth.controller.ts
â”œâ”€â”€ auth.service.ts
â”œâ”€â”€ auth.repository.ts
â”œâ”€â”€ auth.schema.ts
â””â”€â”€ auth.types.ts        # chá»‰ táº¡o náº¿u type dÃ¹ng á»Ÿ nhiá»u file
```

Luá»“ng phá»¥ thuá»™c máº·c Ä‘á»‹nh:

```mermaid
flowchart LR
    R[Route] --> C[Controller]
    C --> S[Service]
    S --> P[Repository]
    P --> DB[(Prisma/PostgreSQL)]
```

### Route

- Khai bÃ¡o HTTP method vÃ  URL.
- Gáº¯n middleware validation, authentication vÃ  authorization.
- Trá» request tá»›i controller method.
- KhÃ´ng Ä‘á»c/biáº¿n Ä‘á»•i dá»¯ liá»‡u request vÃ  khÃ´ng gá»i service trá»±c tiáº¿p.

### Controller

- Äá»c `params`, `query`, `body` vÃ  thÃ´ng tin xÃ¡c thá»±c tá»« request.
- Gá»i service method tÆ°Æ¡ng á»©ng.
- Chuyá»ƒn káº¿t quáº£ service thÃ nh HTTP response.
- KhÃ´ng chá»©a business rule, khÃ´ng gá»i Prisma vÃ  khÃ´ng tá»± truy váº¥n database.
- NÃªn má»ng; má»™t controller method thÆ°á»ng chá»‰ gá»“m láº¥y input, gá»i service vÃ  tráº£ response.

### Service

- Chá»©a use case vÃ  business rule.
- KhÃ´ng nháº­n `Request` hoáº·c `Response` cá»§a Express.
- Phá»‘i há»£p repository vÃ  integration cáº§n thiáº¿t.
- Throw application error; khÃ´ng tá»± gá»­i HTTP response.

### Repository

- Chá»‰ chá»©a truy váº¥n database.
- KhÃ´ng biáº¿t Express, HTTP status hoáº·c ná»™i dung response.
- TÃªn method mÃ´ táº£ dá»¯ liá»‡u cáº§n láº¥y, vÃ­ dá»¥ `findUserByEmail`.

### Khi nÃ o thÃªm policy?

ThÃªm `*.policy.ts` khi rule authorization hoáº·c rule tráº¡ng thÃ¡i Ä‘Æ°á»£c dÃ¹ng bá»Ÿi nhiá»u service method. Policy lÃ  hÃ m thuáº§n, dá»… unit test vÃ  khÃ´ng gá»i database.

## 4. Frontend theo feature

```text
src/features/auth/
â”œâ”€â”€ api/
â”‚   â””â”€â”€ auth.api.ts
â”œâ”€â”€ hooks/
â”‚   â””â”€â”€ use-auth.ts
â”œâ”€â”€ components/
â”‚   â””â”€â”€ login-form.tsx
â”œâ”€â”€ schemas/
â”‚   â””â”€â”€ login.schema.ts
â””â”€â”€ types.ts             # chá»‰ táº¡o khi cáº§n chia sáº» type
```

Luá»“ng dá»¯ liá»‡u:

```mermaid
flowchart LR
    P[Page] --> C[Feature component]
    C --> H[Feature hook]
    H --> A[Feature API]
    A --> AX[Shared Axios client]
    AX --> BE[Backend API]
```

- `app/` chá»‰ routing, layout vÃ  ghÃ©p component.
- Component hiá»ƒn thá»‹ UI vÃ  nháº­n event.
- Hook quáº£n lÃ½ query/mutation vÃ  tráº¡ng thÃ¡i server.
- API file lÃ  nÆ¡i duy nháº¥t cá»§a feature gá»i Axios.
- KhÃ´ng táº¡o global store cho dá»¯ liá»‡u Ä‘Ã£ Ä‘Æ°á»£c TanStack Query quáº£n lÃ½.

## 5. Cáº¥u trÃºc má»¥c tiÃªu

Chá»‰ táº¡o thÆ° má»¥c khi báº¯t Ä‘áº§u module tÆ°Æ¡ng á»©ng.

```text
backend/src/
â”œâ”€â”€ app.ts
â”œâ”€â”€ server.ts
â”œâ”€â”€ worker.ts                 # táº¡o khi báº¯t Ä‘áº§u jobs
â”œâ”€â”€ config/
â”œâ”€â”€ core/
â”‚   â”œâ”€â”€ database/
â”‚   â””â”€â”€ http/
â”œâ”€â”€ middleware/
â”œâ”€â”€ modules/
â”‚   â”œâ”€â”€ auth/
â”‚   â”œâ”€â”€ users/
â”‚   â”œâ”€â”€ access/
â”‚   â”œâ”€â”€ files/
â”‚   â”œâ”€â”€ audit/
â”‚   â”œâ”€â”€ mail/
â”‚   â””â”€â”€ jobs/
â””â”€â”€ routes/

frontend/src/
â”œâ”€â”€ app/
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ ui/
â”‚   â””â”€â”€ shared/
â”œâ”€â”€ features/
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ axios/
â”‚   â””â”€â”€ query/
â””â”€â”€ types/
```

## 6. Thá»© tá»± tá»± code Ä‘á» xuáº¥t

Má»—i bÆ°á»›c cáº§n cÃ³ route cháº¡y Ä‘Æ°á»£c vÃ  Ã­t nháº¥t má»™t test trÆ°á»›c khi sang bÆ°á»›c tiáº¿p theo.

1. `system`: health check vÃ  format response â€” Ä‘Ã£ cÃ³.
2. `users`: model `User`, repository Ä‘á»c/táº¡o user.
3. `auth/password`: Ä‘Äƒng kÃ½ vÃ  Ä‘Äƒng nháº­p báº±ng máº­t kháº©u.
4. `session`: refresh token, logout vÃ  revoke session.
5. `access`: role/permission vÃ  middleware authorization.
6. `audit`: ghi láº¡i login, Ä‘á»•i quyá»n vÃ  khÃ³a tÃ i khoáº£n.
7. `mail`: email verification vÃ  reset password.
8. `files`: upload/download Ä‘Æ¡n giáº£n báº±ng local storage.
9. `jobs`: chá»‰ thÃªm khi cáº§n gá»­i mail hoáº·c cleanup báº¥t Ä‘á»“ng bá»™.
10. OAuth, R2 vÃ  scheduler lÃ  pháº§n má»Ÿ rá»™ng, khÃ´ng pháº£i baseline Ä‘áº§u tiÃªn.

## 7. Checklist cho má»—i endpoint

TrÆ°á»›c khi coi má»™t endpoint hoÃ n thÃ nh, tráº£ lá»i Ä‘Æ°á»£c:

- Ai Ä‘Æ°á»£c gá»i endpoint nÃ y?
- Input Ä‘Æ°á»£c validate á»Ÿ Ä‘Ã¢u?
- HTTP mapping náº±m á»Ÿ controller nÃ o?
- Business rule náº±m á»Ÿ service nÃ o?
7. Service kh?ng ph? thu?c Express; service ???c ph?p g?i Prisma tr?c ti?p. Repository ch? d?ng khi c? persistence responsibility r? r?ng.
- Hai request Ä‘á»“ng thá»i cÃ³ lÃ m sai dá»¯ liá»‡u khÃ´ng?
- CÃ³ test cho má»™t ca thÃ nh cÃ´ng vÃ  má»™t ca bá»‹ tá»« chá»‘i chÆ°a?

## 8. Nhá»¯ng thá»© chÆ°a nÃªn thÃªm

- Generic repository hoáº·c base service.
- Dependency injection container.
- Event bus/CQRS chá»‰ Ä‘á»ƒ chuyá»ƒn lá»i gá»i trong cÃ¹ng process.
- Redis, Kafka hoáº·c microservices.
- DTO mapper cho object chá»‰ cÃ³ vÃ i field.
- Interface cho class chá»‰ cÃ³ má»™t implementation vÃ  khÃ´ng cáº§n mock.

Æ¯u tiÃªn code cá»¥ thá»ƒ, tÃªn rÃµ nghÄ©a vÃ  test Ä‘Æ°á»£c. Khi duplication xuáº¥t hiá»‡n tháº­t tá»« hai nÆ¡i trá»Ÿ lÃªn, lÃºc Ä‘Ã³ má»›i cÃ¢n nháº¯c abstraction.
