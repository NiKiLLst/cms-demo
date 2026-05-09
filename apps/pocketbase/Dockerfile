FROM alpine:3.20

ARG PB_VERSION=0.22.21

RUN apk add --no-cache ca-certificates unzip wget \
 && wget -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
 && unzip /tmp/pb.zip -d /usr/local/bin \
 && rm /tmp/pb.zip \
 && chmod +x /usr/local/bin/pocketbase

WORKDIR /pb
EXPOSE 8090

CMD ["pocketbase", "serve", "--http=0.0.0.0:8090"]
