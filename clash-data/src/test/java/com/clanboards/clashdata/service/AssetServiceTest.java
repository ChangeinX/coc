package com.clanboards.clashdata.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
public class AssetServiceTest {

  @Mock private RestTemplate restTemplate;

  private AssetService assetService;

  private static final String TEST_URL = "https://api-assets.clashofclans.com/badges/512/test.png";

  @BeforeEach
  void setUp() {
    assetService = new AssetService(restTemplate);
  }

  @Test
  public void getAsset_shouldReturnCachedResult() throws IOException {
    byte[] imageData = "test-image-data".getBytes();
    ResponseEntity<byte[]> response =
        ResponseEntity.ok().header("Content-Type", "image/png").body(imageData);

    when(restTemplate.getForEntity(eq(TEST_URL), eq(byte[].class))).thenReturn(response);

    AssetService.AssetResponse result = assetService.getAsset(TEST_URL);

    assertEquals("image/png", result.contentType());
    assertArrayEquals(imageData, result.data());
    verify(restTemplate).getForEntity(eq(TEST_URL), eq(byte[].class));
  }

  @Test
  public void getAsset_withDefaultContentType_shouldReturnImagePng() throws IOException {
    byte[] imageData = "test-image-data".getBytes();
    ResponseEntity<byte[]> response = new ResponseEntity<>(imageData, HttpStatus.OK);
    // No Content-Type header set

    when(restTemplate.getForEntity(eq(TEST_URL), eq(byte[].class))).thenReturn(response);

    AssetService.AssetResponse result = assetService.getAsset(TEST_URL);

    assertEquals("image/png", result.contentType());
    assertArrayEquals(imageData, result.data());
  }

  @Test
  public void getAsset_whenRestTemplateThrowsException_shouldThrowRuntimeException() {
    when(restTemplate.getForEntity(eq(TEST_URL), eq(byte[].class)))
        .thenThrow(new RestClientException("Connection timeout"));

    assertThrows(RuntimeException.class, () -> assetService.getAsset(TEST_URL));
  }

  @Test
  public void getAsset_withDifferentContentType_shouldReturnCorrectType() throws IOException {
    byte[] svgData = "<svg></svg>".getBytes();
    ResponseEntity<byte[]> response =
        ResponseEntity.ok().header("Content-Type", "image/svg+xml").body(svgData);

    when(restTemplate.getForEntity(eq(TEST_URL), eq(byte[].class))).thenReturn(response);

    AssetService.AssetResponse result = assetService.getAsset(TEST_URL);

    assertEquals("image/svg+xml", result.contentType());
    assertArrayEquals(svgData, result.data());
  }
}
