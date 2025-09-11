# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY settings.gradle ./
COPY java-auth-common ./java-auth-common
COPY messages-java ./messages-java
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew :java-auth-common:build :java-auth-common:publishToMavenLocal :messages-java:dependencies --no-daemon --build-cache
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew :messages-java:bootJar --no-daemon --build-cache

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/messages-java/build/libs/*.jar app.jar

EXPOSE 8010
ENTRYPOINT ["java","-jar","/opt/app/app.jar", "--server.port=8010"]
