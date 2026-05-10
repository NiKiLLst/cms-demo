FROM node:20-alpine AS builder
WORKDIR /opt/app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package*.json ./
RUN npm install --include=dev --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /opt/app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
COPY --from=builder /opt/app /opt/app
RUN mkdir -p public/uploads .tmp database/migrations
EXPOSE 1337
CMD ["npm", "run", "start"]
