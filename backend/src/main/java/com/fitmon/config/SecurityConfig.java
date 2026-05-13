package com.fitmon.config;

import com.fitmon.security.FirebaseAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
  private final FirebaseAuthenticationFilter firebaseAuthenticationFilter;

  public SecurityConfig(FirebaseAuthenticationFilter firebaseAuthenticationFilter) {
    this.firebaseAuthenticationFilter = firebaseAuthenticationFilter;
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf((csrf) -> csrf.disable())
      .cors(Customizer.withDefaults())
      .authorizeHttpRequests((auth) -> auth
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .requestMatchers("/api/auth/**", "/api/users/**", "/api/workout/**").authenticated()
        .anyRequest().permitAll()
      )
      .httpBasic(Customizer.withDefaults())
      .addFilterBefore(firebaseAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }
}
