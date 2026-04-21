package com.fitmon.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.stereotype.Service;

@Service
public class FirebaseTokenService {
  private final FirebaseAuth firebaseAuth;

  public FirebaseTokenService(FirebaseAuth firebaseAuth) {
    this.firebaseAuth = firebaseAuth;
  }

  public FirebaseToken verifyToken(String token) throws FirebaseAuthException {
    if (token == null || token.isBlank()) {
      throw new IllegalArgumentException("Missing Firebase ID token");
    }

    return firebaseAuth.verifyIdToken(token);
  }
}
