package com.clanboards.users.config;

import static org.junit.jupiter.api.Assertions.*;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class KeyConfigPemTest {

  private static String toPkcs8Pem(byte[] der) {
    String b64 = Base64.getEncoder().encodeToString(der);
    StringBuilder sb = new StringBuilder();
    sb.append("-----BEGIN PRIVATE KEY-----\n");
    for (int i = 0; i < b64.length(); i += 64) {
      sb.append(b64, i, Math.min(i + 64, b64.length())).append("\n");
    }
    sb.append("-----END PRIVATE KEY-----\n");
    return sb.toString();
  }

  @Test
  void keyHolder_usesProvidedPkcs8Pem_andJwksMatchesPublicKey() throws Exception {
    KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
    gen.initialize(2048);
    KeyPair kp = gen.generateKeyPair();

    String pem = toPkcs8Pem(kp.getPrivate().getEncoded());

    KeyConfig cfg = new KeyConfig();
    // inject PEM via reflection (simulating env property injection)
    ReflectionTestUtils.setField(cfg, "privateKeyPem", pem);

    OidcProperties props = new OidcProperties();
    props.setAudience("clanboards-mobile");
    props.setIssuer("https://dev.api.clan-boards.com/api/v1/users");
    // set deterministic kid for assertions
    org.springframework.test.util.ReflectionTestUtils.setField(props, "kid", "test-kid");

    KeyHolder holder = cfg.keyHolder(props);

    RSAPublicKey expected = (RSAPublicKey) kp.getPublic();
    RSAPublicKey actual = (RSAPublicKey) holder.getPublicKey();
    assertEquals(expected.getModulus(), actual.getModulus(), "modulus must match");
    assertEquals("test-kid", holder.getKid());

    String jwks = holder.jwksJson();
    assertTrue(jwks.contains("\"kid\":\"test-kid\""));
    assertTrue(jwks.contains("\"kty\":\"RSA\""));
    assertTrue(jwks.contains("\"alg\":\"RS256\""));
  }
}
