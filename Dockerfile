#STAGE 1
# The static build doesn't depend on the target platform, so it runs natively on the build machine
FROM --platform=$BUILDPLATFORM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

#STAGE 2
FROM nginx:mainline-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/dist/pipoker-web /usr/share/nginx/html
