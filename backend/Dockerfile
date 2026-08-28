FROM node:26-slim

WORKDIR /app

# Build tools para compilar dependencias nativas (p. ej. bcrypt) cuando no hay
# un binario prebuilt para la arquitectura del host que corra este build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
