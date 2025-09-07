package com.clanboards.users.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeyConfig {

  @Value("${oidc.private-key-pem:}")
  private String privateKeyPem;

  private static byte[] parsePemToDer(String pem) throws Exception {
    String normalized = pem.replace("\r", "").replace("\n", "\n");
    String base64 = normalized
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replaceAll("\n", "");
    return Base64.getDecoder().decode(base64);
  }

  private static KeyPair generateRsaKeyPair() throws Exception {
    KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
    gen.initialize(2048);
    return gen.generateKeyPair();
  }

  @Bean
  public KeyHolder keyHolder(OidcProperties props) throws Exception {
    KeyPair kp;
    if (privateKeyPem != null && !privateKeyPem.isBlank()) {
      byte[] der = parsePemToDer(privateKeyPem);
      PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
      var kf = KeyFactory.getInstance("RSA");
      PrivateKey priv = kf.generatePrivate(spec);
      PublicKey pub;
      try {
        // If key is RSAPrivateCrtKey, we can derive public key from modulus + publicExponent
        var crt = (java.security.interfaces.RSAPrivateCrtKey) priv;
        var pubSpec = new java.security.spec.RSAPublicKeySpec(crt.getModulus(), crt.getPublicExponent());
        pub = kf.generatePublic(pubSpec);
      } catch (ClassCastException e) {
        // Fallback: generate a new pair (JWKS will not match private; only for dev)
        KeyPair generated = generateRsaKeyPair();
        pub = generated.getPublic();
      }
      kp = new KeyPair(pub, priv);
    } else {
      kp = generateRsaKeyPair();
    }
    return new KeyHolder(kp, props.getKid());
  }

  public static class KeyHolder {
    private final KeyPair keyPair;
    private final String kid;
    private final Instant loadedAt = Instant.now();

    public KeyHolder(KeyPair keyPair, String kid) {
      this.keyPair = keyPair;
      this.kid = kid;
    }

    public PrivateKey getPrivateKey() { return (PrivateKey) keyPair.getPrivate(); }
    public PublicKey getPublicKey() { return keyPair.getPublic(); }
    public String getKid() { return kid; }
    public Instant getLoadedAt() { return loadedAt; }

    public Map<String, Object> toJwk() {
      RSAPublicKey pub = (RSAPublicKey) getPublicKey();
      String n = base64Url(pub.getModulus().toByteArray());
      String e = base64Url(pub.getPublicExponent().toByteArray());
      return Map.of(
          "kty", "RSA",
          "alg", "RS256",
          "use", "sig",
          "kid", kid,
          "n", n,
          "e", e);
    }

    public String jwksJson() {
      try {
        var mapper = new ObjectMapper();
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        return mapper.writeValueAsString(Map.of("keys", new Object[] { toJwk() }));
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    }

    private static String base64Url(byte[] bytes) {
      // Ensure positive big integer by stripping leading sign byte if present
      if (bytes.length > 1 && bytes[0] == 0) {
        byte[] tmp = new byte[bytes.length - 1];
        System.arraycopy(bytes, 1, tmp, 0, tmp.length);
        bytes = tmp;
      }
      return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
  }
}
