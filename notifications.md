# Notifications Service Checklist

- [x] Create project skeleton with Spring Boot
- [x] Load VAPID keys from AWS Secrets Manager and configure `VapidDetails`
- [x] Implement `/notifications/subscribe` and `/notifications/test` endpoints
- [x] Add `push_subscriptions` table model and migration
- [x] SQS listener for `notifications-outbox` queue
- [x] Graceful retries with exponential backoff and DLQ
- [x] Metrics `notifications.sent` and `notifications.errors`
- [x] OpenTelemetry tracing
- [x] Containerize with /secrets/vapid.json volume
