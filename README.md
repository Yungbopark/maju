# maju

AI Conversation Orchestration Platform backend skeleton.

## Purpose

`maju` is intended to grow into an orchestration platform centered on conversation state, profile, memory, question strategy, question candidates, messages, and a conversation orchestrator.

## Current Scope

This initial stage only creates a clean NestJS backend foundation.

- NestJS 11 with TypeScript
- npm-based project setup
- Base domain modules connected in `AppModule`
- Shared folder structure for future common utilities
- Dockerfile for production build/start
- Environment example file

No OpenAI integration, Prisma integration, PostgreSQL connection, embedding, vector search, bootstrap logic, or conversation logic is implemented.

## Planned Direction

- Conversation state management
- Conversation profiles
- Conversation memory
- Question strategy and candidate generation
- Conversation orchestration
- Persistence and external AI integrations in later stages

## Commands

```bash
npm install
npm run build
npm run start
```
