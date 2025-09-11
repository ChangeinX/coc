# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace/recruiting
# Copy full project to use Gradle Wrapper (no global gradle CLI)
COPY . .
WORKDIR /workspace/recruiting
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew --no-daemon --build-cache dependencies && \
    ./gradlew --no-daemon --build-cache bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/recruiting/build/libs/*.jar app.jar

EXPOSE 8040
ENTRYPOINT ["java","-jar","/opt/app/app.jar","--server.port=8040"]
