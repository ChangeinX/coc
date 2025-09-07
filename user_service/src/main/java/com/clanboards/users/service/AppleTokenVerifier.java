package com.clanboards.users.service;

import com.clanboards.users.config.OidcProperties;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.proc.JWSAlgorithmFamilyJWSKeySelector;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import java.net.URL;
import java.text.ParseException;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AppleTokenVerifier {
  private static final String APPLE_JWKS = "https://appleid.apple.com/auth/keys";
  private final OidcProperties props;
  private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

  public static class AppleIdentity {
    public final String sub;
    public final String email;
    public final boolean emailVerified;

    public AppleIdentity(String sub, String email, boolean emailVerified) {
      this.sub = sub; this.email = email; this.emailVerified = emailVerified;
    }
  }

  public AppleTokenVerifier(OidcProperties props) throws Exception {
    this.props = props;
    JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(new URL(APPLE_JWKS));
    JWSKeySelector<SecurityContext> keySelector =
        new JWSAlgorithmFamilyJWSKeySelector<>(JWSAlgorithm.Family.RSA, keySource);
    this.jwtProcessor = new DefaultJWTProcessor<>();
    this.jwtProcessor.setJWSKeySelector(keySelector);
  }

  public AppleIdentity verify(String idToken) throws Exception {
    if (idToken == null || idToken.isBlank()) {
      throw new IllegalArgumentException("id_token is required");
    }
    SignedJWT jwt = SignedJWT.parse(idToken);
    JWTClaimsSet claims = jwtProcessor.process(jwt, null);

    // Validate issuer, audience, and expiration
    String iss = claims.getIssuer();
    if (!"https://appleid.apple.com".equals(iss)) {
      throw new SecurityException("invalid_issuer");
    }
    List<String> audList = claims.getAudience();
    if (audList == null || audList.stream().noneMatch(a -> a.equals(props.getAppleServicesId()))) {
      throw new SecurityException("invalid_audience");
    }
    if (claims.getExpirationTime() == null
        || claims.getExpirationTime().toInstant().isBefore(Instant.now())) {
      throw new SecurityException("token_expired");
    }

    String sub = claims.getSubject();
    String email = (String) claims.getClaim("email");
    Object ev = claims.getClaim("email_verified");
    boolean emailVerified = false;
    if (ev instanceof Boolean b) emailVerified = b;
    else if (ev instanceof String s) emailVerified = "true".equalsIgnoreCase(s);
    return new AppleIdentity(sub, email, emailVerified);
  }
}

