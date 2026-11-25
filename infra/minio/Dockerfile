FROM alpine:3.20

# Install dependencies needed by MinIO
RUN apk add --no-cache curl ca-certificates libc6-compat

# Download official MinIO Server and MinIO Client (mc) binaries
RUN curl -sSL https://dl.min.io/server/minio/release/linux-amd64/minio -o /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio && \
    curl -sSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

EXPOSE 9000 9001
VOLUME ["/data"]

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]

