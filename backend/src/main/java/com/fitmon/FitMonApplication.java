package com.fitmon;

import com.fitmon.config.FitMonProperties;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
@EnableConfigurationProperties(FitMonProperties.class)
public class FitMonApplication {
  public static void main(String[] args) {
    String envDir = ".";
    if (!Files.exists(Path.of(".env")) && Files.exists(Path.of("backend", ".env"))) {
      envDir = "backend";
    }

    Dotenv dotenv = Dotenv.configure()
      .directory(envDir)
      .filename(".env")
      .ignoreIfMissing()
      .load();
    dotenv.entries().forEach((entry) -> {
      if (System.getenv(entry.getKey()) == null && System.getProperty(entry.getKey()) == null) {
        System.setProperty(entry.getKey(), entry.getValue());
      }
    });

    SpringApplication.run(FitMonApplication.class, args);
  }
}
