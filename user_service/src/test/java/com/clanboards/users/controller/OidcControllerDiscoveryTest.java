package com.clanboards.users.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.config.OidcProperties;
import com.clanboards.users.model.User;
import com.clanboards.users.service.TokenService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.security.PrivateKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OidcControllerDiscoveryTest {

  @Autowired private MockMvc mockMvc;

  @Autowired private OidcProperties oidcProperties;

  @Autowired private TokenService tokenService;

  @Autowired private KeyHolder keyHolder;

  @BeforeEach
  void setup() {}

  @Test
  void discoveryReflectsIssuerFromDatabase() throws Exception {
    String seededIssuer = "http://test-issuer.local/api/v1/users";
    String seededAudience = "clanboards-mobile";

    // Set properties directly for this integration test (DB loader disabled in test profile)
    oidcProperties.setIssuer(seededIssuer);
    oidcProperties.setAudience(seededAudience);

    mockMvc
        .perform(get("/api/v1/users/.well-known/openid-configuration"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.issuer").value(seededIssuer))
        .andExpect(jsonPath("$.token_endpoint").value(seededIssuer + "/oauth2/token"))
        .andExpect(jsonPath("$.jwks_uri").value(seededIssuer + "/oauth2/jwks.json"));
  }

  @Test
  void userinfoAcceptsTokenSignedWithServiceKeyAndDbIssuer() throws Exception {
    String seededIssuer = "http://issuer.example.local/api/v1/users";
    String seededAudience = "clanboards-mobile";

    oidcProperties.setIssuer(seededIssuer);
    oidcProperties.setAudience(seededAudience);

    // Use TokenService to create an access token with matching iss/aud
    User u = new User();
    u.setId(42L);
    u.setSub(null); // sub will be "42"
    TokenService.TokenPair pair = tokenService.issueAccessAndId(u, null);

    mockMvc
        .perform(
            get("/api/v1/users/userinfo").header("Authorization", "Bearer " + pair.accessToken()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sub").value("42"));
  }

  @Test
  void userinfoRejectsTokenWithWrongIssuer() throws Exception {
    String seededIssuer = "http://issuer.ok.local/api/v1/users";
    String seededAudience = "clanboards-mobile";

    oidcProperties.setIssuer(seededIssuer);
    oidcProperties.setAudience(seededAudience);

    // Manually mint a token with the wrong issuer but valid signature
    PrivateKey pk = keyHolder.getPrivateKey();
    Instant now = Instant.now();
    String badIssuer = "http://wrong.local/api/v1/users";
    String jwt =
        Jwts.builder()
            .setHeaderParam("kid", keyHolder.getKid())
            .setClaims(
                Map.of("iss", badIssuer, "aud", seededAudience, "sub", "42", "iat", Date.from(now)))
            .setExpiration(Date.from(now.plusSeconds(300)))
            .signWith(pk, SignatureAlgorithm.RS256)
            .compact();

    mockMvc
        .perform(get("/api/v1/users/userinfo").header("Authorization", "Bearer " + jwt))
        .andExpect(status().isUnauthorized());
  }
}
