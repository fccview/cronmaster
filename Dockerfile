FROM node:20-slim AS base

# Install system utilities for system information
RUN apt-get update && apt-get install -y \
    pciutils \
    curl \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Create directories for mounted volumes with proper permissions
RUN mkdir -p /app/scripts /app/data /app/snippets && \
    chown -R nextjs:nodejs /app/scripts /app/data /app/snippets

# Create cron directories that will be mounted (this is the key fix!)
RUN mkdir -p /var/spool/cron/crontabs /etc/crontab && \
    chown -R root:root /var/spool/cron/crontabs /etc/crontab

# Copy public directory
COPY --from=builder /app/public ./public

# Copy the entire .next directory
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy package.json and yarn.lock for yarn start
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# Copy node_modules for production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Don't set default user - let docker-compose decide
# USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["yarn", "start"]
