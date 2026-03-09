[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> 🎨 This repository contains the Backend application for PlaniT.  
> For frontend implementation and app screenshots, see: https://github.com/trace-kadenyi/PlaniT

# PlaniT - Full Stack Event Management System

PlaniT is a SaaS event management platform built on the MERN stack.

It enables organizations to manage events, vendors, budgets, tasks, and operational workflows within a secure, role-based architecture, while delivering scalable system design, financial integrity enforcement through audit logs, and granular access control across multi-organization environments.

---

## 🌍 Live Architecture Overview

PlaniT is split into two independent repositories:

- **Frontend (React + Redux Toolkit)**
- **Backend API (Node.js + Express + MongoDB)**

The frontend and backend are maintained as separate repositories, enabling independent development, deployment, and scalability.

---

# 🚀 System Architecture Principles

PlaniT is engineered around production-grade architectural principles:

- Real-world relational data modeling in MongoDB
- Secure JWT-based authentication with granular RBAC authorization
- Financial constraint enforcement (budget vs expense validation)
- Soft and hard deletion strategies for data integrity
- Comprehensive audit logging for accountability and traceability
- Modular frontend architecture with scalable state management
- Clean, layered backend service architecture

The platform is structured for maintainability, security, and long-term scalability.

---

# 🧱 Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Middleware-based RBAC
- Supabase

---

# 🗂 System Modules

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

# 🔐 Authentication & Authorization

### Authentication

- JWT issued at login
- Token-based API access
- Secure middleware verification

### Authorization

- Role-Based Access Control
- Resource-level permission checks
- Action-based enforcement (create, read, update, delete)
- Defense-in-depth (validated both frontend & backend)

---

# 💰 Financial Logic Enforcement

PlaniT enforces financial constraints server-side:

- Expenses cannot exceed allocated event budget
- Aggregation queries calculate total expenses
- Remaining budget is derived dynamically
- Validation occurs in service layer (not controller)

This ensures financial data integrity.

---

# 🧾 Audit Logging

Every critical mutation logs:

- User ID
- Resource affected
- Action performed
- Timestamp
- Optional metadata

This enables traceability and production-grade accountability.

---

# 📡 API Overview

Base URL:

    /api

The backend exposes a RESTful API for managing authentication, events, clients, vendors, tasks, and expenses.

Most routes require authentication via a JWT access token.

Authorization header:

    Authorization: Bearer <token>

---

## 🔑 Authentication

### POST /auth/login

Authenticates a user and returns a JWT access token.

Request:

    {
      "email": "user@example.com",
      "password": "password"
    }

Response:

    {
      "token": "<jwt_token>"
    }

---

## 📅 Events

### POST /events

Create a new event.

### GET /events

Retrieve all events accessible to the authenticated user.

### GET /events/:id

Retrieve a specific event.

### PATCH /events/:id

Update event details.

### DELETE /events/:id

Delete an event.  
Supports soft deletion, with hard deletion restricted to elevated roles.

---

## 👥 Clients

### POST /clients

Create a client.

### GET /clients

Retrieve clients.

### PATCH /clients/:id

Update a client.

### DELETE /clients/:id

Delete a client.

---

## 🏢 Vendors

### POST /vendors

Create a vendor.

### GET /vendors

Retrieve vendors.

### PATCH /vendors/:id

Update a vendor.

### DELETE /vendors/:id

Delete a vendor.

---

## 💵 Expenses

### POST /expenses

Create an expense and validate it against the event's allocated budget.

### GET /expenses?eventId=

Retrieve expenses associated with an event.

---

## 📝 Tasks

### POST /tasks

Create a task.

### GET /tasks?eventId=

Retrieve tasks associated with an event.

### PATCH /tasks/:id

Update task status or details.

### DELETE /tasks/:id

Delete a task.

---

📄 Detailed API documentation can be found in `docs/API.md`.

---

# 🛠 Local Development

## Clone Repository

    git clone https://github.com/trace-kadenyi/PlaniT-API.git

---

## Backend Setup

    cd PlaniT-API
    npm install
    npm start

Create `.env` file:

    PORT=4000
    DATABASE_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    JWT_REFRESH_SECRET=your_jwt_refreh_secret
    JWT_REFRESH_EXPIRES_IN=7d
    SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_key

---

# 🧪 Future Improvements

- Docker containerization
- CI/CD pipeline
- Full test coverage (unit + integration)
- API documentation via Swagger UI
- Role hierarchy expansion
- Real-time updates via WebSockets

---

# 🧠 Engineering Philosophy

PlaniT is built around core engineering principles that support long-term system reliability and maintainability:

- Clear separation of concerns across services and modules
- Maintainable, modular architecture
- Defensive programming and strict validation
- Scalable data modeling and service design
- Operational traceability through audit logging

The platform architecture prioritizes clarity, reliability, and extensibility, enabling the system to evolve as operational requirements grow.

---

# 📎 Repositories

- **Frontend:** [PlaniT](https://github.com/trace-kadenyi/PlaniT)
- **Backend API:** [PlaniT-API](https://github.com/trace-kadenyi/PlaniT-API)

---

# 👤 Author

## Tracey Kadenyi

📧 [Email](mailto:treykadenyi@gmail.com) • 💻 [GitHub](https://github.com/trace-kadenyi) • 🔗 [LinkedIn](https://www.linkedin.com/in/tracey-kadenyi/) • ✍🏽 [Medium](https://medium.com/@tracekadenyi) • 🌐 [Website](https://tracey-kadenyi.vercel.app/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
