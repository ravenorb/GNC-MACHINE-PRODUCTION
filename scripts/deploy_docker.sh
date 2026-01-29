#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/gnc-machine-production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
DOCKER_IMAGE="${DOCKER_IMAGE:-gnc-machine-production}"
CONTAINER_NAME="${CONTAINER_NAME:-gnc-machine-production}"
DOCKER_RUN_ARGS="${DOCKER_RUN_ARGS:-}"

usage() {
  cat <<'EOF'
Usage: REPO_URL=<git-url> [options] scripts/deploy_docker.sh

Options (environment variables):
  REPO_URL         Git repository URL (required)
  BRANCH           Git branch to deploy (default: main)
  APP_DIR          Install location on server (default: /opt/gnc-machine-production)
  COMPOSE_FILE     docker-compose file path relative to repo (default: docker-compose.yml)
  DOCKERFILE       Dockerfile path relative to repo (default: Dockerfile)
  DOCKER_IMAGE     Image name for Dockerfile flow (default: gnc-machine-production)
  CONTAINER_NAME   Container name for Dockerfile flow (default: gnc-machine-production)
  DOCKER_RUN_ARGS  Extra args passed to "docker run" (default: empty)
EOF
}

if [[ -z "${REPO_URL}" ]]; then
  echo "REPO_URL is required." >&2
  usage
  exit 1
fi

if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch --prune
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

compose_path="${APP_DIR}/${COMPOSE_FILE}"
dockerfile_path="${APP_DIR}/${DOCKERFILE}"

if [[ -f "${compose_path}" ]]; then
  docker compose -f "${compose_path}" up -d --build
  exit 0
fi

if [[ -f "${dockerfile_path}" ]]; then
  docker build -t "${DOCKER_IMAGE}" "${APP_DIR}"
  if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
    docker rm -f "${CONTAINER_NAME}"
  fi
  docker run -d --name "${CONTAINER_NAME}" ${DOCKER_RUN_ARGS} "${DOCKER_IMAGE}"
  exit 0
fi

echo "No ${COMPOSE_FILE} or ${DOCKERFILE} found in ${APP_DIR}." >&2
echo "Add Docker configuration or update COMPOSE_FILE/DOCKERFILE to match your setup." >&2
exit 1
