# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace/user_service
# Copy full project to use Gradle Wrapper (no global gradle CLI)
COPY . .
WORKDIR /workspace/user_service
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew --no-daemon --build-cache dependencies && \
    ./gradlew --no-daemon --build-cache bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/user_service/build/libs/*.jar app.jar
# no-op trigger to rebuild user service
EXPOSE 8020
ENTRYPOINT ["java","-jar","/opt/app/app.jar","--server.port=8020"]
