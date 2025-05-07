FROM golang:1.23-alpine AS build
RUN apk add --no-cache ca-certificates git
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -tags musl -ldflags "-s -w" -o /crawler .

FROM alpine:3.20
COPY --from=build /crawler /usr/local/bin/crawler
EXPOSE 8000
ENTRYPOINT ["crawler"]