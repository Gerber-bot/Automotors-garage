# API Strategy & OpenAPI Contracts

## API-First Paradigm
Automotors Garage follows an **API-First** development process:
1. Endpoints, request schemas, and response DTOs are defined with strict Zod contracts and NestJS Swagger decorators.
2. OpenAPI 3.1 specifications are automatically generated at build/runtime at `/api/docs-json`.
3. Frontend API clients and TypeScript types are generated directly from the OpenAPI specification, preventing contract drift.

## Conventions
- **Base URL**: `/api/v1`
- **Naming**: RESTful kebab-case resources (e.g., `/api/v1/work-orders`, `/api/v1/vehicles`).
- **HTTP Verbs**:
  - `GET`: Safe, idempotent read operations.
  - `POST`: Create resource or execute non-idempotent action.
  - `PUT`: Complete resource replacement.
  - `PATCH`: Partial resource update.
  - `DELETE`: Soft or hard deletion.
- **Error Standard**: RFC 7807 Problem Details format:
  ```json
  {
    "type": "https://api.automotorsgarage.com/errors/resource-not-found",
    "title": "Resource Not Found",
    "status": 404,
    "detail": "Work order with ID '...' does not exist.",
    "instance": "/api/v1/work-orders/..."
  }
  ```
