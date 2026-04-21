package com.fitmon.config;

import com.fitmon.security.AuthHandshakeInterceptor;
import com.fitmon.socket.FitMonWebSocketHandler;
import com.fitmon.util.OriginUtils;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
  private final FitMonWebSocketHandler webSocketHandler;
  private final AuthHandshakeInterceptor authHandshakeInterceptor;
  private final FitMonProperties properties;

  public WebSocketConfig(
    FitMonWebSocketHandler webSocketHandler,
    AuthHandshakeInterceptor authHandshakeInterceptor,
    FitMonProperties properties
  ) {
    this.webSocketHandler = webSocketHandler;
    this.authHandshakeInterceptor = authHandshakeInterceptor;
    this.properties = properties;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    List<String> origins = OriginUtils.parseOrigins(properties.getClientOrigins());
    registry.addHandler(webSocketHandler, "/ws")
      .addInterceptors(authHandshakeInterceptor)
      .setAllowedOrigins(origins.toArray(new String[0]));
  }
}
