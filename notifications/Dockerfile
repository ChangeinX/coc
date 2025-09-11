# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace/notifications
# Copy full project to use Gradle Wrapper (no global gradle CLI)
COPY . .
WORKDIR /workspace/notifications
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew --no-daemon --build-cache dependencies && \
    ./gradlew --no-daemon --build-cache bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/notifications/build/libs/*.jar app.jar

# VAPID keys may be mounted at /secrets/vapid.json for local development
VOLUME ["/secrets"]
EXPOSE 8030
ENTRYPOINT ["java","-jar","/opt/app/app.jar","--server.port=8030"]
