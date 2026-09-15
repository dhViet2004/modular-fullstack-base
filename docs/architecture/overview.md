# Architecture

Frontend and backend are independent deployables. Pages compose feature UI. Feature components call hooks, hooks use TanStack Query, and feature API modules use the centralized Axios client. Backend requests follow route → controller → service → repository → Prisma. HTTP API and background worker are separate processes.
