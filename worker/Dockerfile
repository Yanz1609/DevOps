FROM node:20-alpine

# Install vips-dev / libc6-compat if needed by sharp
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

CMD ["node", "src/index.js"]

