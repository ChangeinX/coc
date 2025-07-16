# S3 Deployment Migration

Follow this checklist to switch the dashboard front-end from an ECS service to a static S3 website.

- [ ] **Create the S3 bucket** using the Terraform module. Enable static website hosting and public read access as shown in `terraform.tf`.
- [ ] **Configure a domain or CloudFront distribution** to point at the bucket if desired.
- [ ] **Populate the `FRONTEND_BUCKET` secret** in GitHub with the name of the bucket.
- [ ] **Remove the old front-end ECS service and ECR repository** once traffic is served from S3.
- [ ] **Push to `main`** to trigger the updated workflow and verify that files upload correctly.

The workflow will now build the React project and sync the `dist/` directory to S3 whenever files in `front-end/` change.
