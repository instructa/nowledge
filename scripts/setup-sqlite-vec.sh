#!/bin/bash
set -e

echo "Setting up sqlite-vec..."

# Create directories
mkdir -p lib models

# Detect OS and architecture
OS=$(uname -s)
ARCH=$(uname -m)

# Download sqlite-vec
if [ ! -f "lib/vec0.dylib" ] && [ ! -f "lib/vec0.so" ]; then
    echo "Downloading sqlite-vec..."
    cd lib
    
    if [ "$OS" = "Darwin" ]; then
        if [ "$ARCH" = "arm64" ]; then
            echo "Detected macOS ARM64"
            curl -L https://github.com/asg017/sqlite-vec/releases/download/v0.1.6/sqlite-vec-0.1.6-loadable-macos-aarch64.tar.gz -o sqlite-vec.tar.gz
        else
            echo "Detected macOS x86_64"
            curl -L https://github.com/asg017/sqlite-vec/releases/download/v0.1.6/sqlite-vec-0.1.6-loadable-macos-x86_64.tar.gz -o sqlite-vec.tar.gz
        fi
    else
        echo "Detected Linux x86_64"
        curl -L https://github.com/asg017/sqlite-vec/releases/download/v0.1.6/sqlite-vec-0.1.6-loadable-linux-x86_64.tar.gz -o sqlite-vec.tar.gz
    fi
    
    tar -xzf sqlite-vec.tar.gz
    rm sqlite-vec.tar.gz
    cd ..
fi

# Download Nomic model  
if [ ! -f "models/nomic-embed-text-v1.5.Q4_K_M.gguf" ]; then
    echo "Downloading Nomic embedding model..."
    cd models
    curl -L https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf -o nomic-embed-text-v1.5.Q4_K_M.gguf
    cd ..
fi

echo "Setup complete!"