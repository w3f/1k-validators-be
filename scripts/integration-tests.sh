#!/bin/bash

source /scripts/common.sh
source /scripts/bootstrap-helm.sh


run_tests() {
    echo Running tests...

    wait_pod_ready otv-backend
}

teardown() {
    helm delete --purge otv-backend
}

main(){
    if [ -z "$KEEP_W3F_1K_VALIDATORS_BE" ]; then
        trap teardown EXIT
    fi

    /scripts/build-helmfile.sh

    run_tests
}

main
