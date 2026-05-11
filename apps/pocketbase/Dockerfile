FROM alpine:3.20

ARG PB_VERSION=0.22.21

RUN apk add --no-cache ca-certificates unzip wget \
 && wget -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
 && unzip /tmp/pb.zip -d /usr/local/bin \
 && rm /tmp/pb.zip \
 && chmod +x /usr/local/bin/pocketbase

WORKDIR /pb

# Bake migrations into the image — they're code, not data. PocketBase tracks
# execution in the _migrations table inside pb_data, so the file being present
# at boot every time is harmless.
COPY pb_migrations /pb/pb_migrations

EXPOSE 8090

CMD ["pocketbase", "serve", "--http=0.0.0.0:8090"]
