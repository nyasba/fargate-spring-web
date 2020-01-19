FROM openjdk:11-alpine

ENV JAVA_OPTS=""

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY build/libs/fargate-sample-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["java","$JAVA_OPTS", "-jar","/app.jar"]
