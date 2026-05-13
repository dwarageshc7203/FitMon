package com.fitmon.config;

import com.fitmon.util.OriginUtils;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {
  private final FitMonProperties properties;

  public CorsConfig(FitMonProperties properties) {
    this.properties = properties;
  }

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    List<String> origins = OriginUtils.parseOrigins(properties.getClientOrigins());

    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
          .allowedOrigins(origins.toArray(new String[0]))
          .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
          .allowedHeaders("Authorization", "Content-Type")
          .exposedHeaders("Authorization")
          .allowCredentials(true);
      }
    };
  }
}
