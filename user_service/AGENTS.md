# User Service Guidelines

This directory contains the Spring Boot implementation of the friend service used to manage friend requests between users.

- Source code lives under `src/main/java`.
- Put REST controllers in `controller` and business logic in `service`.
- JPA entities and repositories belong under `repository`.
- Tests reside in `src/test/java` and should use MockMvc when possible.
- Run `./gradlew test` before submitting a pull request to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, bootstrap it using an existing Gradle Wrapper from another module (avoid the global `gradle` CLI), e.g.:
  `../messages-java/gradlew -p user_service wrapper`

## Auth & OIDC
- See `OIDC_MIGRATION.md` for the plan to make this service the OIDC issuer (Apple first), including endpoints, key management (RS256 + JWKS), and mobile integration details.
