FROM node:23-alpine AS base

WORKDIR /app

COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies
RUN yarn install --frozen-lockfile

FROM base AS build

WORKDIR /app

# Build the TypeScript application
RUN yarn build

FROM build AS runner

WORKDIR /app

CMD ["yarn", "start"]
