# Deployment Automation

This project uses GitHub Actions to build Docker images and deploy them to AWS.
Two ECS task definitions are provided in `ecs/`:

- `app-task-def.json` defines the `app` and `worker` containers for the front end
  and API.
- `static-task-def.json` defines the `static` container used by the sync
  service.

The workflow only rebuilds images when their sources have changed. Images are
published to Amazon ECR. The task definition templates in `ecs/` are rendered
with the new image URIs before deploying the updated services.

## Setup steps

1. Create three ECR repositories for the containers: one each for the worker,
   app and static images.
2. Create or update ECS task definitions using the templates in `ecs/` and
   create ECS services for them.
3. In the GitHub repository settings add the following secrets:
   - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` – credentials with
     permissions for ECR and ECS.
   - `AWS_REGION` – AWS region of the cluster.
   - `ECS_CLUSTER` – name of the ECS cluster.
   - `APP_SERVICE` – service running the app task definition.
   - `STATIC_SERVICE` – service running the static task definition.
   - `ECR_REPOSITORY_WORKER`, `ECR_REPOSITORY_APP` and
     `ECR_REPOSITORY_STATIC` – names of the ECR repositories.
4. Commit the workflow in `.github/workflows/deploy.yml` and push to the `main`
   branch. On each push the workflow will build any changed images, push them to
   ECR and render the task definitions with those image URIs. The rendered
   definitions are then deployed to the corresponding ECS services.
