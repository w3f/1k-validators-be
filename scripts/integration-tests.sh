#!/bin/bash

source /scripts/common.sh
source /scripts/bootstrap-helm.sh


run_tests() {
    echo Running tests...

    wait_pod_ready otv-backend
}

teardown() {
    helmfile delete --purge
}

main(){
    #if [ -z "$KEEP_W3F_OTV_BACKEND" ]; then
    #    trap teardown EXIT
    #fi

    /scripts/build-helmfile.sh

    run_tests
}

main
