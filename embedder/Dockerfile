FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -tags musl -ldflags "-s -w" -o /embedder .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
RUN apk add --no-cache git
COPY --from=build /embedder /usr/local/bin/embedder

# Tiny static embedding weights (~8 MB)
ADD https://huggingface.co/minishlab/potion-base-8M/resolve/main/embedding.npy /model/embedding.npy
ADD https://huggingface.co/minishlab/potion-base-8M/resolve/main/vocab.txt     /model/vocab.txt

ENV RQLITE_URL=http://vector_db:4001 \
    CRAWL_API=http://crawler:8000
EXPOSE 9000
ENTRYPOINT ["embedder"]