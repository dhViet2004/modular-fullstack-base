FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate && pnpm build

FROM build AS migration
CMD ["pnpm", "db:migrate:deploy"]

FROM build AS production-dependencies
RUN pnpm prune --prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/server.js"]
