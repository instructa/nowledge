# Troubleshooting Guide

This document covers common issues and their solutions.

## Common Problems

### Database Connection Issues

If you're experiencing database connection problems:

1. Check that SQLite is properly installed
2. Verify file permissions on the database file
3. Ensure the vector extension is loaded correctly

### Embedding Model Issues

Problems with the embedding model:

1. Verify the model file exists in the models directory
2. Check that the file isn't corrupted (should be ~80MB)
3. Ensure you have enough memory to load the model

### Performance Issues

If searches are slow:

1. Check your database size
2. Consider reducing the number of documents
3. Try using a smaller embedding model

## Error Messages

Common error messages and their meanings:

- "Model not found": The embedding model file is missing
- "Database locked": Another process is using the database
- "Out of memory": The system doesn't have enough RAM for the operation
