FROM golang:1.22-alpine AS go-build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o metrics-app .

FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY project/package.json project/package-lock.json ./
RUN npm ci
COPY project/ .
RUN npm run build

FROM nginx:1.27-alpine
WORKDIR /app

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=go-build /app/metrics-app /app/metrics-app
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

ENV APP_ADDR=:8080
ENV DB_PATH="file:metrics.db?_pragma=foreign_keys(1)"

CMD sh -c "/app/metrics-app & nginx -g 'daemon off;'"
