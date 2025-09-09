package com.clanboards.clashdata.service;

import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AssetService {

  private final RestTemplate restTemplate;

  @Autowired
  public AssetService(RestTemplate restTemplate) {
    this.restTemplate = restTemplate;
  }

  @Cacheable(value = "assets", key = "#url")
  public AssetResponse getAsset(String url) throws IOException {
    try {
      ResponseEntity<byte[]> response = restTemplate.getForEntity(url, byte[].class);
      String contentType = response.getHeaders().getFirst("Content-Type");
      if (contentType == null || contentType.isEmpty()) {
        contentType = "image/png";
      }
      return new AssetResponse(response.getBody(), contentType);
    } catch (Exception e) {
      throw new RuntimeException("Failed to fetch asset: " + e.getMessage(), e);
    }
  }

  public record AssetResponse(byte[] data, String contentType) {}
}
