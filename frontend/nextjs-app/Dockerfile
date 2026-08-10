FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:22-alpine
RUN addgroup -S circlenet && adduser -S circlenet -G circlenet
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=circlenet:circlenet /app/.next/standalone ./
COPY --from=build --chown=circlenet:circlenet /app/.next/static ./.next/static
COPY --from=build --chown=circlenet:circlenet /app/public ./public
USER circlenet
EXPOSE 3000
CMD ["node","server.js"]
