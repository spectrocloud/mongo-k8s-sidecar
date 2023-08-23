.DEFAULT_GOAL:=help

PROD_VERSION ?= 4.1.0${VERSION_SUFFIX}
PROD_BUILD_ID ?= latest

BIN_DIR ?= ./bin
BUILD_DIR ?= ./_build
PROD_BUILD_ID:=$(shell date +%Y%m%d)
PROJECT ?= spectro-common-dev
IMG_TAG ?= ssl-${PROD_BUILD_ID}
MNGO_IMG ?= "gcr.io/${PROJECT}/${USER}/mongo-sidecar:${IMG_TAG}"

help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

docker: ## Build docker image
	@echo "building docker image ${MNGO_IMG}"
	docker build . -t ${MNGO_IMG}
	docker push ${MNGO_IMG}