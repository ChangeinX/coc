FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace
COPY messages-java/ ./messages-java
WORKDIR /workspace/messages-java
RUN chmod +x gradlew
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/messages-java/build/libs/messages-java-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8010
ENTRYPOINT ["java","-jar","/opt/app/app.jar"]
