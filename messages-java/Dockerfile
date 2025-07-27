# syntax=docker/dockerfile:1.5
FROM gradle:8.7-jdk21 AS build
WORKDIR /workspace/messages-java

COPY messages-java/build.gradle messages-java/settings.gradle ./
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle --no-daemon build -x test || true

COPY messages-java/src ./src
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle --no-daemon bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/messages-java/build/libs/*.jar app.jar

EXPOSE 8010
ENTRYPOINT ["java","-jar","/opt/app/app.jar", "--server.port=8010"]
