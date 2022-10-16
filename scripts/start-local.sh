#!/bin/bash

main(){

    kubectl create namespace kusama
    kubectl create namespace polkadot

    helm repo update
    helmfile --environment "local" sync
}


main
