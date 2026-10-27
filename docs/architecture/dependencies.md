# Dependency & Boundary Verification Guidelines

## Architectural Rules for Dependencies

In Automotors Garage, software layers follow strict unidirectional dependency rules based on Clean Architecture:

```
[ UI / Controllers / API Adapters ]  ---> [ Application Services / Use Cases ]
                                                   |
                                                   v
                                          [ Domain Core / Entities ]
                                                   ^
                                                   |
[ Infrastructure / Database / S3 ]   -------------+ (implements Domain Ports)
```

### 1. Inward Dependency Rule
- The **Domain** has ZERO dependencies on outer layers (no NestJS, no Drizzle, no HTTP, no third-party libraries).
- The **Application Layer** depends only on the Domain Layer and defines Port interfaces for external needs.
- The **Infrastructure Layer** depends on the Application and Domain Layers by implementing Ports.
- The **Presentation Layer (Controllers/UI)** depends on Application Services to trigger use cases.

### 2. Forbidden Imports Matrix

| Source File Location | Forbidden Imports | Remediation |
| :--- | :--- | :--- |
| `*/domain/**` | `@nestjs/*`, `drizzle-orm`, `pg`, `axios`, `express` | Define pure TypeScript domain models & ports |
| `*/domain/**` | `*/infrastructure/**`, `*/controllers/**` | Move dependencies to interfaces |
| `*/application/**` | `*/infrastructure/**` | Depend on Port interfaces; inject implementations |
| `*/controllers/**` | Database queries, raw SQL, direct ORM entities | Delegate to Application Use Cases |
| `apps/frontend/**` | Backend direct paths, internal server secrets | Consume public OpenAPI client |

---

## Tooling & Dependency Compatibility Matrix

Before adopting packages, we verify ecosystem compatibility against **Node.js 24 LTS** and **TypeScript 5.x**:

| Package | Recommended Version | Compatibility & State |
| :--- | :--- | :--- |
| `typescript` | `^5.6.x` | Stable, strict mode enabled |
| `@nestjs/core`, `@nestjs/common` | `^10.4.x` | Stable, active LTS support |
| `next` | `^15.x` | App Router, Server Components |
| `react`, `react-dom` | `^19.x` / `^18.3.x` | Stable React runtime |
| `drizzle-orm` | `^0.36.x` | Type-safe, high performance, active maintenance |
| `drizzle-kit` | `^0.28.x` | CLI for schema migrations |
| `pg`, `@types/pg` | `^8.13.x` | Industry standard PostgreSQL client |
| `zod` | `^3.23.x` | Standard schema validation |
| `argon2` | `^0.41.x` | RFC 9106 compliant password hashing |
| `@nestjs/jwt`, `passport-jwt` | `^10.2.x` | Enterprise JWT handling |
| `vitest` | `^2.1.x` | Native ESM test runner, lightning fast |
| `@playwright/test` | `^1.48.x` | Modern end-to-end testing |
| `pnpm` | `^9.x` | Fast, disk-efficient package management |

---

## Circular Dependency Prevention
- The project enforces `eslint-plugin-import` with `import/no-cycle` or Madge dependency tree analysis in CI.
- Module cycles fail the build automatically.
