# PlaniT API

Backend Reference Documentation

Version 1.0 • Node.js + Express + MongoDB

---

## Overview

PlaniT is a SaaS event management platform. The API follows REST conventions and is organized around the following resources: Auth, Users, Organizations, Events, Clients, Vendors, Tasks, Budgets, and Expenses.

|                  |                                    |
| ---------------- | ---------------------------------- |
| **Base URL**     | `http://localhost:4000/api`        |
| **Protocol**     | HTTPS (HTTP in local dev)          |
| **Auth**         | JWT Bearer Token (httpOnly cookie) |
| **Content-Type** | `application/json`                 |
| **Date Format**  | ISO 8601                           |

---

## Authentication

Tokens are issued at login and stored as httpOnly cookies. Include the Authorization header or ensure cookies are sent with each request.

**Authorization Header:**

```
Authorization: Bearer <access_token>
```

> 🔐 **Authentication required.** All routes marked as protected require a valid JWT Bearer token and appropriate role permissions.

---

## Auth Endpoints

No authentication required for these routes.

| Method | Endpoint              | Description                                   | Permission |
| ------ | --------------------- | --------------------------------------------- | ---------- |
| `POST` | `/auth/signup`        | Register a new user account                   | Public     |
| `POST` | `/auth/login`         | Login and receive access/refresh tokens       | Public     |
| `POST` | `/auth/refresh-token` | Obtain a new access token using refresh token | Public     |
| `POST` | `/auth/logout`        | Invalidate the current session                | Public     |

---

## Users

> 🔐 Authentication required.

| Method   | Endpoint                    | Description                        | Permission            |
| -------- | --------------------------- | ---------------------------------- | --------------------- |
| `GET`    | `/users`                    | List all users in the organization | `VIEW / USER`         |
| `GET`    | `/users/:userId`            | Get a single user by ID            | `VIEW / USER`         |
| `GET`    | `/users/:userId/history`    | Get a user's update history        | `VIEW / USER_HISTORY` |
| `POST`   | `/users`                    | Create a new user                  | `MANAGE_USERS / USER` |
| `PATCH`  | `/users/:userId`            | Update user details                | `EDIT / USER`         |
| `PATCH`  | `/users/:userId/role`       | Update a user's role               | `MANAGE_USERS / USER` |
| `PATCH`  | `/users/:userId/reactivate` | Reactivate a deactivated user      | `MANAGE_USERS / USER` |
| `DELETE` | `/users/:userId`            | Delete a user                      | `DELETE / USER`       |

---

## Organization

> 🔐 Authentication required.

| Method  | Endpoint        | Description                                    | Permission            |
| ------- | --------------- | ---------------------------------------------- | --------------------- |
| `GET`   | `/organization` | Get organization details                       | `VIEW / ORGANIZATION` |
| `PATCH` | `/organization` | Update organization details (Super Admin only) | `EDIT / ORGANIZATION` |

---

## Events

> 🔐 Authentication required.

| Method   | Endpoint              | Description                   | Permission        |
| -------- | --------------------- | ----------------------------- | ----------------- |
| `POST`   | `/events`             | Create a new event            | `CREATE / EVENT`  |
| `GET`    | `/events`             | Retrieve all events           | `VIEW / EVENT`    |
| `GET`    | `/events/:id`         | Retrieve a single event by ID | `VIEW / EVENT`    |
| `PUT`    | `/events/:id`         | Update event details          | `EDIT / EVENT`    |
| `PATCH`  | `/events/:id/archive` | Archive an event              | `ARCHIVE / EVENT` |
| `PATCH`  | `/events/:id/restore` | Restore an archived event     | `ARCHIVE / EVENT` |
| `DELETE` | `/events/:id`         | Delete an event               | `DELETE / EVENT`  |

---

## Clients

> 🔐 Authentication required.

| Method   | Endpoint               | Description                       | Permission            |
| -------- | ---------------------- | --------------------------------- | --------------------- |
| `POST`   | `/clients`             | Create a new client               | `CREATE / CLIENT`     |
| `GET`    | `/clients`             | Retrieve all clients              | `VIEW / CLIENT`       |
| `GET`    | `/clients/:id`         | Get client with associated events | `VIEW / CLIENT`       |
| `PUT`    | `/clients/:id`         | Update client details             | `EDIT / CLIENT`       |
| `PATCH`  | `/clients/:id/archive` | Archive a client                  | `ARCHIVE / CLIENT`    |
| `PATCH`  | `/clients/:id/restore` | Restore an archived client        | `ARCHIVE / CLIENT`    |
| `DELETE` | `/clients/:id`         | Delete a single client            | `DELETE / CLIENT`     |
| `DELETE` | `/clients`             | Delete all clients (bulk)         | `DELETE_ALL / CLIENT` |

---

## Vendors

> 🔐 Authentication required.

| Method   | Endpoint               | Description                   | Permission            |
| -------- | ---------------------- | ----------------------------- | --------------------- |
| `POST`   | `/vendors`             | Create a new vendor           | `CREATE / VENDOR`     |
| `GET`    | `/vendors`             | Retrieve all vendors          | `VIEW / VENDOR`       |
| `GET`    | `/vendors/stats`       | Get vendor statistics         | `VIEW / VENDOR`       |
| `GET`    | `/vendors/:id`         | Get a single vendor by ID     | `VIEW / VENDOR`       |
| `PUT`    | `/vendors/:id`         | Update vendor details         | `EDIT / VENDOR`       |
| `PATCH`  | `/vendors/:id/archive` | Archive or unarchive a vendor | `ARCHIVE / VENDOR`    |
| `DELETE` | `/vendors/:id`         | Delete a single vendor        | `DELETE / VENDOR`     |
| `DELETE` | `/vendors`             | Delete all vendors (bulk)     | `DELETE_ALL / VENDOR` |

---

## Tasks

> 🔐 Authentication required.

| Method   | Endpoint     | Description        | Permission      |
| -------- | ------------ | ------------------ | --------------- |
| `GET`    | `/tasks`     | Retrieve all tasks | `VIEW / TASK`   |
| `POST`   | `/tasks`     | Create a new task  | `CREATE / TASK` |
| `GET`    | `/tasks/:id` | Get a task by ID   | `VIEW / TASK`   |
| `PUT`    | `/tasks/:id` | Update a task      | `EDIT / TASK`   |
| `DELETE` | `/tasks/:id` | Delete a task      | `DELETE / TASK` |

---

## Budgets

> 🔐 Authentication required.

| Method | Endpoint           | Description                        | Permission      |
| ------ | ------------------ | ---------------------------------- | --------------- |
| `GET`  | `/budget/:eventId` | Get budget for a specific event    | `VIEW / BUDGET` |
| `PUT`  | `/budget/:eventId` | Update budget for a specific event | `EDIT / BUDGET` |

---

## Expenses

Expenses are validated server-side against the event's allocated budget. Creating an expense that exceeds the remaining budget will be rejected.

> 🔐 Authentication required.

| Method   | Endpoint                              | Description                              | Permission                    |
| -------- | ------------------------------------- | ---------------------------------------- | ----------------------------- |
| `GET`    | `/expenses/audit-logs/deleted-events` | Audit log for expenses on deleted events | `VIEW_AUDIT_LOGS / AUDIT_LOG` |
| `GET`    | `/expenses/audit-logs`                | Full expense audit log                   | `VIEW_AUDIT_LOGS / AUDIT_LOG` |
| `GET`    | `/expenses/budget-status`             | Budget status across all events          | `VIEW / EXPENSE`              |
| `GET`    | `/expenses/event/:eventId`            | Get all expenses for an event            | `VIEW / EXPENSE`              |
| `GET`    | `/expenses`                           | Get all expenses                         | `VIEW / EXPENSE`              |
| `POST`   | `/expenses`                           | Create a new expense                     | `CREATE / EXPENSE`            |
| `GET`    | `/expenses/:eventId/summary`          | Get expenses summary for an event        | `VIEW / EXPENSE`              |
| `GET`    | `/expenses/:id`                       | Get a single expense by ID               | `VIEW / EXPENSE`              |
| `PUT`    | `/expenses/:id`                       | Update an expense                        | `EDIT / EXPENSE`              |
| `DELETE` | `/expenses/:id`                       | Delete an expense                        | `DELETE / EXPENSE`            |

---

## HTTP Status Codes

| Code  | Status                | Description                        |
| ----- | --------------------- | ---------------------------------- |
| `200` | OK                    | Request succeeded                  |
| `201` | Created               | Resource successfully created      |
| `204` | No Content            | Successful deletion                |
| `400` | Bad Request           | Invalid request body or parameters |
| `401` | Unauthorized          | Missing or invalid JWT token       |
| `403` | Forbidden             | Insufficient role/permission       |
| `404` | Not Found             | Resource does not exist            |
| `429` | Too Many Requests     | Rate limit exceeded                |
| `500` | Internal Server Error | Unexpected server-side error       |

---

## Rate Limiting

The following rate limits are applied to sensitive authentication routes:

| Route                 | Window    | Max Requests | Notes                                      |
| --------------------- | --------- | ------------ | ------------------------------------------ |
| `/auth/refresh-token` | 1 minute  | 30           | Permissive — supports silent token renewal |
| `/auth/login`         | 5 minutes | 100          | Tighten to 10 in production                |
| `/auth/signup`        | 5 minutes | 100          | Tighten to 10 in production                |
