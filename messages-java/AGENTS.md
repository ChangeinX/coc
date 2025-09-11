# Messages Java Guidelines

This directory contains the Spring Boot implementation of the chat service.

- Source code lives under `src/main/java`.
- Put REST controllers in `controller` and business logic in `service`.
- Tests belong in `src/test/java` and should use MockMvc when possible.
- Before submitting a pull request run `./gradlew test` to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, bootstrap it using an existing wrapper from another module instead of the global `gradle` CLI, e.g.:
  `../messages-java/gradlew -p messages-java wrapper`
