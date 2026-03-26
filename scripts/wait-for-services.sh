#!/bin/bash
# scripts/wait-for-services.sh
# Waits for PostgreSQL and Redis to be ready before proceeding.
set -e

echo "Waiting for PostgreSQL..."
until PGPASSWORD=crm_password_change_me psql -h localhost -U crm_user -d crm_db -c '\q' 2>/dev/null; do
  echo "PostgreSQL not ready, waiting..."
  sleep 2
done
echo "PostgreSQL ready!"

echo "Waiting for Redis..."
until redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q PONG; do
  echo "Redis not ready, waiting..."
  sleep 2
done
echo "Redis ready!"

echo "All services ready!"
