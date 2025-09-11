# Notifications Service Guidelines

This directory contains the Spring Boot implementation of the push notifications service.

- Source code lives under `src/main/java`.
- REST controllers go in `controller` and business logic in `service`.
- Entities and repositories reside in `repository`.
- Run `./gradlew test` before submitting a pull request to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, bootstrap it using an existing Gradle Wrapper from another module (avoid the global `gradle` CLI), e.g.:
  `../messages-java/gradlew -p notifications wrapper`
