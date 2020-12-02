#!/bin/bash

source /scripts/common.sh
source /scripts/bootstrap-helm.sh


run_tests() {
    echo Running tests...

    wait_pod_ready kusama-mongodb-0 kusama 2/2
    wait_pod_ready kusama-otv-backend-0 kusama 1/1

    # express_pod=$(kubectl -n kusama get pods | grep express | cut -d' ' -f1)
    # wait_pod_ready $express_pod kusama 1/1
    kubectl delete namespace kusama

    #wait_pod_ready polkadot-mongodb-0 polkadot 2/2
    #wait_pod_ready polkadot-otv-backend-0 polkadot 1/1

    # express_pod=$(kubectl -n polkadot get pods | grep express | cut -d' ' -f1)
    # wait_pod_ready $express_pod polkadot 1/1    
}

teardown() {
    retval=$?
    if [ $retval -ne 0 ]; then
        kubectl -n kusama describe pod kusama-otv-backend-0 
        kubectl -n kusama logs -l app=kusama-otv-backend



        kubectl -n polkadot describe pod polkadot-otv-backend-0 
        kubectl -n polkadot logs -l app=polkadot-otv-backend
    fi

    helmfile delete --purge
    exit $retval
}

main(){
    if [ -z "$KEEP_W3F_OTV_BACKEND" ]; then
        trap teardown EXIT
    fi
    kubectl create namespace kusama
    kubectl create namespace polkadot
    /scripts/build-helmfile.sh
    run_tests
}

main
