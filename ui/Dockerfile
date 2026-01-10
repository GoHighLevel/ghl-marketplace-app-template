FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Replace with your preferred static server. This assumes a Vite build output in /dist.
RUN npm i -g serve
COPY --from=build /app/dist /app/dist
EXPOSE 8080
CMD ["serve","-s","/app/dist","-l","8080"]
