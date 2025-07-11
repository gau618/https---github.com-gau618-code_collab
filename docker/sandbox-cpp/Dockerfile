# Use the official GCC image for C++ compilation and execution
FROM gcc:12
WORKDIR /app
# Create a non-root user for enhanced security
RUN useradd -ms /bin/bash sandboxuser
USER sandboxuser
