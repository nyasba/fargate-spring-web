FROM openjdk:11-slim

ENV JAVA_OPTS=""

COPY build/libs/fargate-sample-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["java","$JAVA_OPTS", "-jar","/app.jar"]
