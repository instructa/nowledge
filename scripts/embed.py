#!/usr/bin/env python3
import sys
import json
from llama_cpp import Llama

def main():
    if len(sys.argv) < 2:
        print("Usage: embed.py <model_path>", file=sys.stderr)
        sys.exit(1)
    
    model_path = sys.argv[1]
    text = sys.stdin.read().strip()
    
    # Initialize model for embeddings only
    llm = Llama(
        model_path=model_path,
        embedding=True,
        n_ctx=512,  # Keep context small for embeddings
        verbose=False
    )
    
    # Generate embedding
    result = llm.create_embedding(text)
    embedding = result["data"][0]["embedding"]
    
    # Output as JSON
    print(json.dumps(embedding))

if __name__ == "__main__":
    main()