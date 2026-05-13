FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY index.html styles.css app.js server.js ./
COPY data ./data

ENV NODE_ENV=production
ENV PORT=4173

EXPOSE 4173

CMD ["node", "server.js"]
