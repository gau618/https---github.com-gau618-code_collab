# Use a minimal, secure Node.js image
FROM node:20-alpine
WORKDIR /app

# --- THIS IS THE FIX ---
# 'adduser' is the correct command for Alpine Linux.
# -D creates a system user without a password.
RUN adduser -D sandboxuser

USER sandboxuser
