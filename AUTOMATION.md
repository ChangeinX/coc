# GitHub Actions deployment

This repository ships with a workflow that builds Docker images for the Python
services and deploys them to Amazon ECS. The front-end is uploaded to an S3
bucket instead of running in a container. Images are only rebuilt when files in
their respective directories change.

## Workflow summary

The workflow lives at `.github/workflows/deploy.yml` and runs on every push to the
`main` branch. It performs the following steps:

1. Detects which subdirectories changed using `tj-actions/changed-files`.
2. Logs in to Amazon ECR and builds the Docker images for any changed Python
   services.
3. Uploads the rebuilt front-end to the configured S3 bucket.
4. Pushes new images to ECR and forces the corresponding ECS services to deploy
   them.

## Required GitHub secrets

Several secrets must be configured in the repository settings so the workflow can
access AWS resources:

- `AWS_ACCESS_KEY_ID` – IAM access key with permission to push images and update ECS.
- `AWS_SECRET_ACCESS_KEY` – secret for the key above.
- `AWS_REGION` – AWS region where the cluster lives.
- `ECR_REGISTRY` – registry domain, e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`.
- `WORKER_REPOSITORY` – repository for the worker service image.
- `STATIC_REPOSITORY` – repository for the static sync image.
- `MESSAGES_REPOSITORY` – repository for the messages service image.
- `FRONTEND_BUCKET` – S3 bucket used to host the front-end.
- `CLUSTER` – name of the ECS cluster.
- `WORKER_SERVICE` – service name for the worker.
- `STATIC_SERVICE` – service name for the static sync job.
- `MESSAGES_SERVICE` – service name for the messages API.

## First‑time setup

1. Create the worker, static and messages ECR repositories as well as the S3 bucket for
   the front-end.
2. Grant the IAM user or role used by the workflow permissions to push to ECR,
   sync files to S3 and update ECS services.
3. Populate all required secrets in the GitHub repository settings.
4. Push to the `main` branch to trigger the workflow. Only services with modified
   files will rebuild and deploy.
