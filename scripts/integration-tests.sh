#!/bin/bash

source /scripts/common.sh
source /scripts/bootstrap-helm.sh


run_tests() {
    echo Running tests...

    wait_pod_ready mongodb-replicaset-0 kusama 2/2
    wait_pod_ready mongodb-replicaset-1 kusama 2/2
    wait_pod_ready mongodb-replicaset-arbiter-0 kusama
    wait_pod_ready otv-backend-0 kusama

    express_pod=$(kubectl -n kusama get pods | grep express | cut -d' ' -f1)
    wait_pod_ready $express_pod kusama

    wait_pod_ready mongodb-replicaset-0 polkadot 2/2
    wait_pod_ready mongodb-replicaset-1 polkadot 2/2
    wait_pod_ready mongodb-replicaset-arbiter-0 polkadot
    wait_pod_ready otv-backend-0 polkadot

    express_pod=$(kubectl -n polkadot get pods | grep express | cut -d' ' -f1)
    wait_pod_ready $express_pod polkadot    
}

teardown() {
    retval=$?
    if [ $retval -ne 0 ]; then
        kubectl -n kusama describe pod otv-backend-0 
        kubectl -n kusama logs -l app=otv-backend

        kubectl -n polkadot describe pod otv-backend-0 
        kubectl -n polkadot logs -l app=otv-backend

    fi

    helmfile delete --purge
    exit $retval
}

main(){
    if [ -z "$KEEP_W3F_OTV_BACKEND" ]; then
        trap teardown EXIT
    fi

    /scripts/build-helmfile.sh

    run_tests
}

main
