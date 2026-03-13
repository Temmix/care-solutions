# Care Solutions

A multi-tenant clinical care management platform built for UK health and social care providers. Manage patients, care plans, clinical assessments, practitioners, and team members — all scoped by organisation with role-based access control and FHIR R4 compliance.

## Tech Stack

| Layer    | Technology                        | Version |
| -------- | --------------------------------- | ------- |
| Language | TypeScript (strict mode)          | 5.4     |
| Backend  | NestJS                            | 10      |
| Frontend | React + Vite                      | 18 / 5  |
| Database | PostgreSQL + Prisma ORM           | 5.14    |
| Styling  | Tailwind CSS                      | 4       |
| Auth     | Passport JWT + bcrypt             | -       |
| Payments | Stripe (subscriptions + webhooks) | 20      |
| Monorepo | Turborepo + npm workspaces        | 2.3     |
| Testing  | Jest (API) / Vitest (Web)         | 29 / 4  |

## Project Structure

```
care-solutions/
├── apps/
│   ├── api/                        NestJS backend
│   │   ├── prisma/                 Schema, seed data
│   │   └── src/
│   │       ├── common/             Guards, decorators, filters
│   │       └── modules/
│   │           ├── auth/           JWT login, register, profile
│   │           ├── billing/        Stripe subscription management
│   │           ├── users/          User CRUD, password management
│   │           └── epr/            Electronic Patient Record
│   │               ├── patients/       Patient demographics & timeline
│   │               ├── practitioners/  Practitioner management
│   │               ├── organizations/  Organisation management
│   │               ├── care-plans/     Goals, activities, notes
│   │               ├── assessments/    Clinical scoring & risk levels
│   │               └── dashboard/      Summary statistics
│   │
│   └── web/                        React SPA
│       └── src/
│           ├── components/         Layout, ProtectedRoute
│           ├── hooks/              Auth context
│           ├── lib/                API client
│           └── features/
│               ├── auth/           Login, register, change password
│               ├── patients/       Patient CRUD, timeline, edit
│               ├── care-plans/     Care plan management
│               ├── assessments/    Clinical assessments
│               ├── practitioners/  Practitioner directory
│               ├── tenants/        Super admin tenant management
│               ├── super-admins/   Super admin user management
│               ├── team/           Tenant user management
│               └── billing/        Subscription management
│
├── packages/
│   ├── shared/                     FHIR R4 types & shared interfaces
│   └── eslint-config/              Shared linting rules
│
└── docker/                         Docker configuration
```

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL (local or Docker)
- npm

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your DATABASE_URL, JWT_SECRET, and Stripe keys

# Push database schema
npx prisma db push --schema apps/api/prisma/schema.prisma

# Seed with demo data
npx tsx apps/api/prisma/seed.ts
```

### Development

```bash
# Start all services
npx turbo dev
```

| Service | URL                   |
| ------- | --------------------- |
| API     | http://localhost:3000 |
| Web     | http://localhost:5173 |

The web dev server proxies `/api` requests to the backend automatically.

### Build & Test

```bash
npx turbo build        # Build all packages
npx turbo test         # Run all tests
npx turbo lint         # Lint all packages
npm run format         # Format with Prettier

# Single package
cd apps/api && npx jest              # API tests
cd apps/web && npx vitest run        # Web tests
```

## Features

### Multi-Tenancy

Every query is scoped by tenant (organisation). Super admins can switch between tenants; regular users only see their own organisation's data.

### Role-Based Access Control

| Role            | Access                                         |
| --------------- | ---------------------------------------------- |
| **Super Admin** | Cross-tenant, full platform management         |
| **Admin**       | Tenant admin, user management, billing         |
| **Clinician**   | Full clinical access, review assessments       |
| **Nurse**       | Clinical data, create assessments & care plans |
| **Carer**       | Read-only clinical data                        |
| **Patient**     | Own records (limited)                          |

### Patients (Electronic Patient Record)

- Full demographics with inline editing
- NHS number identifiers
- Contact management (next of kin, emergency)
- Clinical event timeline
- GP practitioner and managing organisation assignment
- Care plans and assessments visible on patient detail

### Care Plans

- Goals with target dates, success measures, and status tracking
- Activities assigned to practitioners with scheduling
- Clinical notes with author tracking
- Status workflow: Draft > Active > Completed / Cancelled
- Categories: Nursing, Physiotherapy, Mental Health, Palliative, General
- Inline goal/activity creation and deletion

### Clinical Assessments

- Structured assessments using standard scoring tools (Tinetti, Waterlow, MUST, Abbey Pain Scale)
- 7 assessment types: Falls Risk, Nutrition, Pressure Ulcer, Pain, Mobility, Mental Health, General
- Score tracking with max scores and clinical interpretation
- Risk level classification: None, Low, Medium, High, Very High
- Review workflow (Clinician/Admin marks as reviewed)
- Recommended actions tracking
- Assessments appear on patient timeline

### Team Management

- Admins create users within their tenant
- Forced password change on first login
- Role assignment per user
- Activate/deactivate team members
- All users can change their own password

### Billing

- Stripe integration for subscription management
- Tiers: Free, Starter, Professional, Enterprise
- Patient and user limits per tier
- Webhook support for subscription lifecycle events

### Audit Logging

Every create, update, and delete operation across clinical data is recorded with user, action, resource, and tenant context.

## FHIR R4 Compliance

Clinical data is mapped to FHIR R4 resources for interoperability:

| Domain        | FHIR Resource | Profile                             |
| ------------- | ------------- | ----------------------------------- |
| Patients      | Patient       | Demographics, identifiers, contacts |
| Practitioners | Practitioner  | Name, specialty, registration       |
| Organisations | Organization  | ODS code, type, hierarchy           |
| Care Plans    | CarePlan      | Goals, activities, notes            |
| Assessments   | Observation   | Score, risk level, interpretation   |

Shared FHIR types: [`packages/shared/src/fhir/`](packages/shared/src/fhir/)

## API Reference

### Auth

```
POST   /api/auth/login              Login with email/password
POST   /api/auth/register           Register new account + tenant
GET    /api/auth/me                 Current user profile
```

### Users

```
POST   /api/users                   Create tenant user (Admin)
PATCH  /api/users/change-password   Change own password
GET    /api/users                   List tenant users (Admin)
PATCH  /api/users/:id               Update user (Admin)
```

### Patients

```
GET    /api/patients                List/search patients
POST   /api/patients                Create patient
GET    /api/patients/:id            Get patient (FHIR Patient)
PATCH  /api/patients/:id            Update patient
GET    /api/patients/:id/timeline   Patient event timeline
POST   /api/patients/:id/events     Add timeline event
```

### Care Plans

```
GET    /api/care-plans              List/search care plans
POST   /api/care-plans              Create care plan
GET    /api/care-plans/:id          Get care plan (FHIR CarePlan)
PATCH  /api/care-plans/:id          Update care plan
POST   /api/care-plans/:id/goals    Add goal
PATCH  /api/care-plans/:id/goals/:goalId      Update goal
DELETE /api/care-plans/:id/goals/:goalId      Remove goal
POST   /api/care-plans/:id/activities         Add activity
PATCH  /api/care-plans/:id/activities/:actId  Update activity
DELETE /api/care-plans/:id/activities/:actId  Remove activity
POST   /api/care-plans/:id/notes    Add note
GET    /api/care-plans/:id/notes    List notes (paginated)
```

### Assessments

```
GET    /api/assessments             List/search (filter by type, risk, status)
POST   /api/assessments             Create assessment
GET    /api/assessments/:id         Get assessment (FHIR Observation)
PATCH  /api/assessments/:id         Update assessment
DELETE /api/assessments/:id         Cancel assessment (Admin only)
PATCH  /api/assessments/:id/review  Mark as reviewed (Admin/Clinician)
```

### Other

```
GET    /api/practitioners           List practitioners
GET    /api/organizations           List organisations
GET    /api/dashboard               Dashboard statistics
```

## Demo Credentials

After running the seed script, these accounts are available:

| Email                           | Role        | Organisation        | Password     |
| ------------------------------- | ----------- | ------------------- | ------------ |
| superadmin@care-solutions.local | Super Admin | Cross-tenant        | Password123! |
| admin@sunrise-care.local        | Admin       | Sunrise Care Home   | Password123! |
| nurse@sunrise-care.local        | Nurse       | Sunrise Care Home   | Password123! |
| admin@oakwood-gp.local          | Admin       | Oakwood GP Practice | Password123! |

### Seed Data Includes

- 2 organisations (Care Home + GP Practice)
- 20 patients (10 per tenant) with NHS numbers
- 3 care plans with goals, activities, and notes
- 4 clinical assessments (Falls Risk, Pain, Nutrition, Pressure Ulcer)
- 1 practitioner

## License

Private — all rights reserved.
