# Messages Java Guidelines

This directory contains the Spring Boot implementation of the chat service.

- Source code lives under `src/main/java`.
- Put REST controllers in `controller` and business logic in `service`.
- Tests belong in `src/test/java` and should use MockMvc when possible.
- Before submitting a pull request run `./gradlew test` to ensure the build succeeds.
- If `gradle/wrapper/gradle-wrapper.jar` is missing, regenerate it with
  `gradle -p messages-java wrapper` before running the tests.
