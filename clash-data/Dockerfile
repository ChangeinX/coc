# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk AS build

# First, build and publish coc-java library to local Maven repository
WORKDIR /workspace/coc-py
COPY coc-py ./
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    sed -i 's/languageVersion = JavaLanguageVersion.of(17)/languageVersion = JavaLanguageVersion.of(21)/' coc-java/build.gradle && \
    ./gradlew :coc-java:publishToMavenLocal -Pversion=0.1.0 --no-daemon

# Now build clash-data service
WORKDIR /workspace/clash-data
# Copy full project to use Gradle Wrapper (no global gradle CLI)
COPY clash-data ./
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew --no-daemon --build-cache dependencies && \
    ./gradlew --no-daemon --build-cache bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/clash-data/build/libs/*.jar app.jar

EXPOSE 8050
ENTRYPOINT ["java","-jar","/opt/app/app.jar","--server.port=8050"]
