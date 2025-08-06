# Recruiting Service Guidelines

This directory contains the Spring Boot implementation of the recruiting service.

- Source code lives under `src/main/java`.
- Put REST controllers in `controller` and business logic in `service`.
- Run `./gradlew test` before submitting a pull request to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, regenerate it with `gradle -p recruiting wrapper` before running the tests.
