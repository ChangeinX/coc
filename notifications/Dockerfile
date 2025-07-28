# syntax=docker/dockerfile:1.7
FROM gradle:8.7-jdk21 AS build
WORKDIR /workspace/notifications
COPY build.gradle settings.gradle ./
RUN --mount=type=cache,id=gradle-cache,target=/home/gradle/.gradle \
    gradle --daemon --build-cache dependencies
COPY src ./src
RUN --mount=type=cache,id=gradle-cache,target=/home/gradle/.gradle \
    gradle --daemon --build-cache bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/notifications/build/libs/*.jar app.jar

# VAPID keys may be mounted at /secrets/vapid.json for local development
VOLUME ["/secrets"]
EXPOSE 8030
ENTRYPOINT ["java","-jar","/opt/app/app.jar","--server.port=8030"]
