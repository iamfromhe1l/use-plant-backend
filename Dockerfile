FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/.encore/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates curl git netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L https://encore.dev/install.sh | bash

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN chmod +x /app/docker/backend-entrypoint.sh

EXPOSE 4000 9400

ENTRYPOINT ["/app/docker/backend-entrypoint.sh"]
