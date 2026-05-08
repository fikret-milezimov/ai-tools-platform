# 🤖 AI_AGENTS.md

## Overview

This project was developed using AI-assisted workflows and modern AI coding tools.

The goal of the project is not only to build a functional full-stack platform, but also to demonstrate effective collaboration with AI agents during software development.

AI tools were used to accelerate development, improve productivity, assist with debugging, generate boilerplate code, refine UI/UX, and support deployment workflows.

---

# AI Tools Used

The project was developed with assistance from:

* Cursor AI
* Claude Code CLI
* ChatGPT
* GitHub Copilot

These tools were used as development assistants, while all architectural and implementation decisions were reviewed and controlled manually.

---

# Project Context for AI Agents

The platform is a production-style monorepo containing:

* Laravel 12 backend API
* Next.js 15 frontend
* MySQL database
* Redis cache/session storage
* Docker Compose infrastructure
* Laravel Sanctum authentication
* Role-based access control
* Admin approval workflows
* Ratings and comments system
* Optional 2FA support

The application simulates an internal company platform for sharing and managing AI tools between teams.

---

# Recommended AI Development Workflow

## 1. Define the task clearly

Before generating code, provide clear requirements and expected behavior.

Example:

* feature purpose
* business rules
* affected frontend/backend areas
* expected API behavior
* authorization requirements

---

## 2. Generate code incrementally

Prefer small controlled generations instead of large uncontrolled outputs.

Recommended:

* one feature at a time
* isolated component generation
* separate backend/frontend implementation steps

---

## 3. Review generated code manually

AI-generated code should always be reviewed before applying changes.

Focus on:

* security
* readability
* consistency
* architecture
* performance
* unnecessary complexity

---

## 4. Test changes locally

All generated features should be validated through:

* Docker environment
* API testing
* frontend interaction
* database verification

---

# Example Starter Prompts

## Backend Prompt

```txt
You are working on a Laravel 12 API project with Sanctum authentication, MySQL, Redis, Docker, and role-based permissions.

Implement a production-like feature using clean architecture and Laravel best practices.

Requirements:
- follow existing project structure
- use validation and authorization
- return proper JSON responses
- keep code readable and modular
- avoid unnecessary complexity
```

---

## Frontend Prompt

```txt
You are working on a Next.js 15 + React 19 + TypeScript frontend connected to a Laravel API.

Create responsive and modern UI components using Tailwind CSS.

Requirements:
- reusable components
- loading and error states
- responsive design
- proper API integration
- production-like UX
```

---

## Full-stack Prompt

```txt
Implement a complete full-stack feature for the AI tools platform.

Backend:
- Laravel API endpoint
- validation
- database migration
- authorization rules

Frontend:
- Next.js page/component
- API integration
- loading states
- error handling

Keep the implementation clean, scalable, and production-oriented.
```

---

## Debugging Prompt

```txt
Analyze the current issue carefully before suggesting fixes.

Requirements:
- identify root cause
- avoid temporary workarounds
- explain why the issue happens
- provide production-like solution
- list edited files
- keep existing architecture consistent
```

---

## Deployment Prompt

```txt
Prepare the application for deployment on AWS EC2 using Docker Compose.

Requirements:
- production-ready environment variables
- secure Laravel configuration
- optimized Docker setup
- proper networking
- persistent storage
- stable frontend/backend communication
```

---

# AI Usage Principles

The AI tools used in this project are intended to:

* accelerate repetitive tasks
* assist with debugging
* improve development speed
* suggest architecture ideas
* help with documentation
* support deployment and infrastructure tasks

AI-generated output should not replace engineering judgment.

All important implementation decisions, testing, and final validation remain the responsibility of the developer.

---

# Notes

* AI assistance was used throughout backend, frontend, Docker, deployment, and debugging workflows.
* The project was developed iteratively with human review after each major change.
* The focus of the workflow is productivity, maintainability, and production-like development practices.
