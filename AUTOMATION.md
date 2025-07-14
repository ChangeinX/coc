# GitHub Actions deployment

This repository ships with a workflow that builds Docker images and deploys them to
Amazon ECS. Images are only rebuilt when files in their respective directories
change.

## Workflow summary

The workflow lives at `.github/workflows/deploy.yml` and runs on every push to the
`main` branch. It performs the following steps:

1. Detects which subdirectories changed using `tj-actions/changed-files`.
2. Logs in to Amazon ECR and builds the Docker images for the changed services.
3. Pushes the images with the tags `latest` and the Git commit SHA.
4. Forces the corresponding ECS service to deploy the new image.

## Required GitHub secrets

Several secrets must be configured in the repository settings so the workflow can
access AWS resources:

- `AWS_ACCESS_KEY_ID` – IAM access key with permission to push images and update ECS.
- `AWS_SECRET_ACCESS_KEY` – secret for the key above.
- `AWS_REGION` – AWS region where the cluster lives.
- `ECR_REGISTRY` – registry domain, e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`.
- `APP_REPOSITORY` – ECR repository for the front‑end image.
- `WORKER_REPOSITORY` – repository for the worker service image.
- `STATIC_REPOSITORY` – repository for the static sync image.
- `CLUSTER` – name of the ECS cluster.
- `APP_SERVICE` – ECS service name for the front‑end.
- `WORKER_SERVICE` – service name for the worker.
- `STATIC_SERVICE` – service name for the static sync job.

## First‑time setup

1. Create the three ECR repositories referenced above.
2. Grant the IAM user or role used by the workflow permissions to push to ECR and
   update ECS services.
3. Populate all required secrets in the GitHub repository settings.
4. Push to the `main` branch to trigger the workflow. Only services with modified
   files will rebuild and deploy.
