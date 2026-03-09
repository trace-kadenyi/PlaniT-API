[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://mongodb.com)

> 🎨 This repository contains the Backend API for PlaniT.
> For the frontend implementation and app screenshots, see: https://github.com/trace-kadenyi/PlaniT

# PlaniT — Full Stack Event Management System

PlaniT is a production-grade SaaS event management platform built on the MERN stack. It enables organizations to manage events, vendors, budgets, tasks, and operational workflows within a secure, role-based architecture — delivering scalable system design, financial integrity enforcement through audit logs, and granular access control across multi-organization environments.

---

## 🌍 Architecture Overview

PlaniT is split into two independent repositories, enabling separate development, deployment, and scaling:

| Repository | Stack |
|---|---|
| **Frontend** | React, Redux Toolkit, React Router |
| **Backend API** (this repo) | Node.js, Express.js, MongoDB, Mongoose, JWT, Supabase |

---

## 🚀 System Design Principles

- Real-world relational data modeling in MongoDB with Mongoose ODM
- Secure JWT-based authentication with granular RBAC authorization
- Financial constraint enforcement — budget vs. expense validation at the service layer
- Soft and hard deletion strategies with restoration support
- Comprehensive audit logging for accountability and traceability
- Layered backend architecture: routes → controllers → services → models

---

## 🧱 Tech Stack

| Technology | Role |
|---|---|
| **Node.js** | Server runtime |
| **Express.js** | Web framework and routing |
| **MongoDB** | Primary database |
| **Mongoose** | ODM for schema modeling and validation |
| **JWT** | Authentication — access + refresh token strategy |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | Rate limiting for sensitive auth routes |
| **cookie-parser** | Secure httpOnly cookie handling |
| **Supabase** | Expense receipt storage |
| **dotenv** | Environment configuration |

---

## 🗂 System Modules

- Organizations
- Users
- Events
- Clients
- Vendors
- Tasks
- Budgets
- Expenses
- Audit Logs
- User Update History

---

## 🔐 Security

### Authentication

- JWT access tokens issued at login, stored as httpOnly cookies
- Separate refresh tokens with a dedicated rate limiter (30 requests/minute)
- Aggressive rate limiting on login and signup endpoints (10 requests per 15 min in production)
- Helmet middleware sets secure HTTP headers on all responses
- CORS restricted to the frontend origin with credential support

### Authorization — RBAC

All protected routes use a two-layer authorization model:

1. **`authController.protect`** — verifies the JWT and attaches the user to the request
2. **`authorize(PERMISSION, RESOURCE)`** — checks the user's role has the required permission on the target resource

Permissions in use: `VIEW`, `CREATE`, `EDIT`, `DELETE`, `DELETE_ALL`, `ARCHIVE`, `MANAGE_USERS`, `VIEW_AUDIT_LOGS`

---

## 💰 Financial Logic

PlaniT enforces budget constraints at the service layer — not the controller — so validation cannot be bypassed:

- Expenses cannot be created or updated if they would exceed the event's allocated budget
- Total expenses are computed via MongoDB aggregation queries
- Remaining budget is derived dynamically at query time
- Budget status across all events is available via a dedicated summary endpoint

---

## 🧾 Audit Logging

Every critical mutation is recorded with:

- User ID and organization context
- Resource type and resource ID affected
- Action performed (create, update, delete, etc.)
- Timestamp
- Optional metadata (e.g. old vs. new values)

Dedicated audit log endpoints are available for expenses and soft-deleted event expense history, protected by the `VIEW_AUDIT_LOGS` permission.

---

## 📡 API Overview

**Base URL:**

```
/api
```

Most routes require authentication via a JWT access token.

**Authorization header:**

```
Authorization: Bearer <access_token>
```

| Resource | Base Path |
|---|---|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Organization | `/api/organization` |
| Events | `/api/events` |
| Clients | `/api/clients` |
| Vendors | `/api/vendors` |
| Tasks | `/api/tasks` |
| Budgets | `/api/budget` |
| Expenses | `/api/expenses` |

📄 For full endpoint details, request/response structure, and permission requirements, see [docs/API.md](docs/API.md).

---

## ⚡ Rate Limiting

| Route | Window | Max Requests | Notes |
|---|---|---|---|
| `/auth/refresh-token` | 1 minute | 30 | Permissive — supports silent token renewal |
| `/auth/login` | 5 minutes | 10 (prod) | Currently 100 in development |
| `/auth/signup` | 5 minutes | 10 (prod) | Currently 100 in development |

---

## 🛠 Local Development

### Prerequisites

- Node.js v18+
- MongoDB (local instance or Atlas URI)
- Supabase project (for file storage)

### Setup

```bash
git clone https://github.com/trace-kadenyi/PlaniT-API.git
cd PlaniT-API
npm install
npm start
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

---

## 🧪 Roadmap

- [ ] Docker containerization for consistent dev/prod parity
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Full test coverage — unit and integration tests
- [ ] Swagger UI for interactive API documentation
- [ ] Role hierarchy expansion for more granular permission sets
- [ ] Real-time updates via WebSockets

---

## 🧠 Engineering Philosophy

PlaniT is built around core principles that support long-term reliability and maintainability:

- Clear separation of concerns across services and modules
- Defensive programming and strict validation
- Financial integrity enforced at the service layer, not the controller
- Operational traceability through audit logging
- Scalable data modeling designed to evolve with requirements

---

## 📎 Repositories

- **Frontend:** [PlaniT](https://github.com/trace-kadenyi/PlaniT)
- **Backend API:** [PlaniT-API](https://github.com/trace-kadenyi/PlaniT-API)

---

## 👤 Author

### Tracey Kadenyi

📧 [treykadenyi@gmail.com](mailto:treykadenyi@gmail.com) &nbsp;•&nbsp; 💻 [GitHub](https://github.com/trace-kadenyi) &nbsp;•&nbsp; 🔗 [LinkedIn](https://www.linkedin.com/in/tracey-kadenyi/) &nbsp;•&nbsp; ✍🏽 [Medium](https://medium.com/@tracekadenyi) &nbsp;•&nbsp; 🌐 [Website](https://tracey-kadenyi.vercel.app/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
