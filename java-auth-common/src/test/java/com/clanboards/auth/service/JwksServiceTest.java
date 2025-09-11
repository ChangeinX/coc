package com.clanboards.auth.service;

import static org.junit.jupiter.api.Assertions.*;

import com.clanboards.auth.config.OidcProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwksServiceTest {

  private static final String KID = "dev-1";

  private static class FakeProvider implements JwksContentProvider {
    private volatile String jwks;
    private volatile Instant updated;

    public void set(String jwks, Instant updated) {
      this.jwks = jwks;
      this.updated = updated;
    }

    @Override
    public String loadJwksJson() {
      return jwks;
    }

    @Override
    public Instant lastUpdated() {
      return updated;
    }
  }

  private static String base64Url(byte[] bytes) {
    if (bytes.length > 1 && bytes[0] == 0) {
      byte[] tmp = new byte[bytes.length - 1];
      System.arraycopy(bytes, 1, tmp, 0, tmp.length);
      bytes = tmp;
    }
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private static String jwksForKey(KeyPair kp, String kid) {
    RSAPublicKey pub = (RSAPublicKey) kp.getPublic();
    String n = base64Url(pub.getModulus().toByteArray());
    String e = base64Url(pub.getPublicExponent().toByteArray());
    return "{\"keys\":[{"
        + "\"kty\":\"RSA\",\"alg\":\"RS256\",\"use\":\"sig\",\"kid\":\""
        + kid
        + "\",\"n\":\""
        + n
        + "\",\"e\":\""
        + e
        + "\"}]}";
  }

  private static String tokenFor(KeyPair kp, String kid) {
    Instant now = Instant.now();
    return Jwts.builder()
        .setHeaderParam("kid", kid)
        .setClaims(Map.of("iss", "https://example/issuer", "aud", "example-aud"))
        .setExpiration(Date.from(now.plusSeconds(3600)))
        .signWith(kp.getPrivate(), SignatureAlgorithm.RS256)
        .compact();
  }

  private OidcProperties props;
  private FakeProvider provider;

  @BeforeEach
  void setup() {
    props = new OidcProperties();
    // speed up TTL-based refresh in tests if needed
    props.setKeysCacheDurationMinutes(1);
    provider = new FakeProvider();
  }

  @Test
  void refreshesWhenProviderLastUpdatedChanges_sameKidNewKey() throws Exception {
    KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
    gen.initialize(2048);
    KeyPair k1 = gen.generateKeyPair();
    KeyPair k2 = gen.generateKeyPair();

    // Seed provider with first key and perform an initial validation (caches k1)
    provider.set(jwksForKey(k1, KID), Instant.parse("2025-09-01T00:00:00Z"));
    JwksService svc = new JwksService(props, provider);
    String tok1 = tokenFor(k1, KID);
    Claims c1 = svc.parseAndValidateJwt(tok1);
    assertEquals("https://example/issuer", c1.getIssuer());

    // Update provider with same kid but new key and newer lastUpdated
    provider.set(jwksForKey(k2, KID), Instant.parse("2025-09-02T00:00:00Z"));

    // Token signed with new key should validate after service notices lastUpdated and refreshes
    String tok2 = tokenFor(k2, KID);
    Claims c2 = svc.parseAndValidateJwt(tok2);
    assertEquals("example-aud", c2.getAudience());
  }

  @Test
  void retriesOnceOnSignatureFailure_thenSucceedsAfterRefresh() throws Exception {
    KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
    gen.initialize(2048);
    KeyPair k1 = gen.generateKeyPair();
    KeyPair k2 = gen.generateKeyPair();

    // Initial cache with k1
    provider.set(jwksForKey(k1, KID), Instant.parse("2025-09-01T00:00:00Z"));
    JwksService svc = new JwksService(props, provider);
    String tok1 = tokenFor(k1, KID);
    svc.parseAndValidateJwt(tok1);

    // Rotate to k2 (same kid) but without bumping provider lastUpdated yet
    provider.set(jwksForKey(k2, KID), Instant.parse("2025-09-01T00:00:00Z"));

    // Now validating a token for k2 should trigger a signature failure; service should refresh
    String tok2 = tokenFor(k2, KID);
    Claims c2 = svc.parseAndValidateJwt(tok2);
    assertEquals("https://example/issuer", c2.getIssuer());
  }
}
