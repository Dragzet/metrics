FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o metrics-app .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/metrics-app /app/metrics-app
EXPOSE 8080
ENV APP_ADDR=:8080
ENV DB_PATH=file:metrics.db?_pragma=foreign_keys(1)
CMD ["/app/metrics-app"]

