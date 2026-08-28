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

# node:*-slim ya trae un usuario "node" (uid/gid 1000), que además coincide
# con el uid típico del primer usuario en Linux — así los archivos que el
# contenedor escribe en el bind mount (dist/, src/generated/) quedan con el
# dueño correcto en el host en vez de root.
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
