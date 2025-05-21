FROM node:18
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY .env.production .env

RUN npm run build || true
EXPOSE 3000
CMD ["npm", "run", "start"]