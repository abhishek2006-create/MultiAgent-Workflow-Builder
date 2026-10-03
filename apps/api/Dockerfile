FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/contracts/workflow.schema.json ./packages/contracts/workflow.schema.json
COPY apps/api/prisma ./apps/api/prisma
RUN npm install
COPY apps/api ./apps/api
RUN npm --workspace apps/api run prisma:generate && npm --workspace apps/api run build
EXPOSE 3001
CMD ["sh", "-c", "npm --workspace apps/api run db:migrate:deploy && npm --workspace apps/api run start:prod"]
