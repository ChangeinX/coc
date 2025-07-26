# Notifications Service Guidelines

This directory contains the Spring Boot implementation of the push notifications service.

- Source code lives under `src/main/java`.
- REST controllers go in `controller` and business logic in `service`.
- Entities and repositories reside in `repository`.
- Run `./gradlew test` before submitting a pull request to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, regenerate it with `gradle -p notifications wrapper` before running the tests.
