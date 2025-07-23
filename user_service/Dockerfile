FROM gradle:8.7-jdk21 AS build
WORKDIR /workspace/user-service

COPY user_service/ .
RUN gradle --no-daemon bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /opt/app
COPY --from=build /workspace/user-service/build/libs/*.jar app.jar
EXPOSE 8020
ENTRYPOINT ["java","-jar","/opt/app/app.jar","--server.port=8020"]
