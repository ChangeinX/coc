package com.clanboards.auth.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

@ExtendWith(MockitoExtension.class)
class OidcJwtDecoderConfigurationTest {

  @Mock private OidcTokenValidator validator;

  private OidcJwtDecoderConfiguration config;

  @BeforeEach
  void setUp() {
    config = new OidcJwtDecoderConfiguration();
  }

  @Test
  void jwtDecoder_ShouldReturnJwtWithSubjectAndTimestamps() throws Exception {
    Claims claims = mock(Claims.class);
    when(claims.getSubject()).thenReturn("12345");
    Date iat = Date.from(Instant.now());
    Date exp = Date.from(Instant.now().plusSeconds(3600));
    when(claims.getIssuedAt()).thenReturn(iat);
    when(claims.getExpiration()).thenReturn(exp);
    when(validator.validateToken("good")).thenReturn(claims);

    JwtDecoder decoder = config.jwtDecoder(validator);
    Jwt jwt = decoder.decode("good");

    assertEquals("12345", jwt.getSubject());
    assertEquals(iat.toInstant(), jwt.getIssuedAt());
    assertEquals(exp.toInstant(), jwt.getExpiresAt());
  }

  @Test
  void jwtDecoder_ShouldWrapValidationErrorsInJwtException() throws Exception {
    when(validator.validateToken("bad"))
        .thenThrow(new OidcTokenValidator.TokenValidationException("boom"));

    JwtDecoder decoder = config.jwtDecoder(validator);
    assertThrows(JwtException.class, () -> decoder.decode("bad"));
  }
}
