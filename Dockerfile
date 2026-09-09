#SEGUNDA VERSION
FROM node:alpine AS builder

WORKDIR /build

COPY /src/package*.json ./

RUN npm install

COPY /src/endpoints.js ./

FROM node:alpine AS runner 

WORKDIR /app

EXPOSE 3000

COPY --from=builder /build ./

CMD ["node", "endpoints.js"]


#PRIMERA VERSION 
# FROM node

# WORKDIR /app

# COPY src/package*.json .

# RUN npm install

# COPY src/*.js .

# EXPOSE 3000

# CMD ["node", "endpoints.js"]




