# syntax=docker/dockerfile:1.7
# CI: No-op comment to trigger messages service rebuild
FROM gradle:8.7-jdk21 AS build
WORKDIR /workspace
COPY settings.gradle ./
COPY java-auth-common ./java-auth-common
COPY messages-java ./messages-java
RUN --mount=type=cache,id=gradle-cache,target=/home/gradle/.gradle \
    gradle --daemon --build-cache :java-auth-common:build :java-auth-common:publishToMavenLocal :messages-java:dependencies
RUN --mount=type=cache,id=gradle-cache,target=/home/gradle/.gradle \
    gradle --daemon --build-cache :messages-java:bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/messages-java/build/libs/*.jar app.jar

EXPOSE 8010
ENTRYPOINT ["java","-jar","/opt/app/app.jar", "--server.port=8010"]
