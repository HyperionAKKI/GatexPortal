FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY public ./public
COPY server ./server
COPY README.md ./

ENV NODE_ENV=production
ENV SERVE_STATIC_FRONTEND=true
ENV PORT=4000

EXPOSE 4000

CMD ["node", "server/index.js"]
