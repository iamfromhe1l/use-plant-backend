#!/usr/bin/env bash

set -euo pipefail

wait_for_port() {
  local name="$1"
  local host="$2"
  local port="$3"

  echo "[entrypoint] Waiting for ${name} at ${host}:${port}..."

  until nc -z "${host}" "${port}" >/dev/null 2>&1; do
    sleep 1
  done

  echo "[entrypoint] ${name} is reachable"
}

wait_for_port "MongoDB" "${MONGO_HOST:-mongo}" "${MONGO_PORT:-27017}"
wait_for_port "MQTT" "${MQTT_HOST:-mqtt}" "${MQTT_PORT:-1883}"

exec encore run --listen 0.0.0.0:4000
