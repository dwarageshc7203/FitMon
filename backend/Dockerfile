FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/fitmon-backend-1.0.0.jar app.jar
EXPOSE 3001
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
