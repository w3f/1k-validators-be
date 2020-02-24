# [Thousand Validator Program][thousand]

**To apply to the Thousand Validator Program - sign up [here][form]**

The Thousand Validator Program is a joint initiative between Web3 Foundation
and Parity to help prospective validators achieve nominations to join the 
active set.

Requirements for prospective validators:
 - 50 KSM.
 - Signed up on the [form][form] and has received approval.
 - Connection to the private telemetry.
 - Seven days of online sentry and validator infrastructure.

Please see the [blog post][thousand] for more information and requirements for
entering the program.

## What is this repository?

The `1k-validator-be` repository houses the backend code for the services that
run the nomination process of the programme. It handles the configuration of
adding new validators to the program, and keeping track that they perform their
duties correctly. It performs the nomination of the validators on the basis of
a CronJob that is run every 24 hours. It is also planned to contain a Matrix
notification service that will bubble up the issues that it finds with different
validators and will explain the reason why they were skipped from nomination.

[thousand]: https://polkadot.network/join-kusamas-thousand-validators-programme/
[form]: https://docs.google.com/forms/d/e/1FAIpQLSewhltQOcmkIlE7Wftn0NTVuyEs6Wk8Qpx6ssCAo2BO4oQH0w/viewform
