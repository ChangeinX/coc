# Recruiting Service Guidelines

This directory contains the Spring Boot implementation of the recruiting service.

- Source code lives under `src/main/java`.
- Put REST controllers in `controller` and business logic in `service`.
- Run `./gradlew test` before submitting a pull request to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, bootstrap it using an existing Gradle Wrapper from another module (avoid the global `gradle` CLI), e.g.:
  `../messages-java/gradlew -p recruiting wrapper`
