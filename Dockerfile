# Stage 1: Install dependencies
FROM oven/bun:1 AS install
WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY core/package.json ./core/

RUN bun install --frozen-lockfile

# Stage 2: Build
FROM oven/bun:1 AS build
WORKDIR /app

COPY --from=install /app/node_modules ./node_modules

COPY . .

RUN cd server && bunx prisma generate
RUN cd client && bunx vite build

# Stage 3: Production
FROM oven/bun:1 AS production
WORKDIR /app

COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/client/dist ./client/dist

COPY server ./server
COPY core ./core
COPY package.json ./

# Overlay generated Prisma client from build stage
COPY --from=build /app/server/src/generated ./server/src/generated

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd server && bunx prisma migrate deploy && cd .. && bun run server/src/index.ts"]
