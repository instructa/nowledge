# Stage 1 – build Go binary (unchanged)
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -tags musl -ldflags "-s -w" -o /embedder .

# Stage 2 – fetch & convert model
FROM python:3.11-slim AS model
ENV HF_HUB_DISABLE_SYMLINKS_WARNING=1
RUN pip install --no-cache-dir torch==2.1.* transformers==4.40.* "numpy<2"
RUN python - <<'PY'
from transformers import AutoModel, AutoTokenizer
import numpy as np, pathlib
name = "TaylorAI/bge-micro-v2"
model = AutoModel.from_pretrained(name)
tok = AutoTokenizer.from_pretrained(name)
emb = model.embeddings.word_embeddings.weight.detach().cpu().numpy()
pathlib.Path("/out").mkdir(parents=True, exist_ok=True)
np.save("/out/embedding.npy", emb)
tok.save_pretrained("/out")
PY

# Stage 3 – minimal runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates git
COPY --from=build /embedder /usr/local/bin/embedder
COPY --from=model /out/embedding.npy /model/embedding.npy
COPY --from=model /out/vocab.txt     /model/vocab.txt

ENV RQLITE_URL=http://vector_db:4001 \
    CRAWL_API=http://crawler:8000
EXPOSE 9000
ENTRYPOINT ["embedder"]