# User Service Guidelines

This directory contains the Spring Boot implementation of the friend service used to manage friend requests between users.

- Source code lives under `src/main/java`.
- Put REST controllers in `controller` and business logic in `service`.
- JPA entities and repositories belong under `repository`.
- Tests reside in `src/test/java` and should use MockMvc when possible.
- Run `./gradlew test` before submitting a pull request to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, regenerate it with
  `gradle -p user_service wrapper` before running the tests.
