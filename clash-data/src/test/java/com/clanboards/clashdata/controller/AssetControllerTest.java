package com.clanboards.clashdata.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.clashdata.service.AssetService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AssetController.class)
public class AssetControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private AssetService assetService;

  private static final String VALID_ASSET_URL =
      "https://api-assets.clashofclans.com/badges/512/abc123.png";

  @Test
  public void getAsset_withValidUrl_shouldReturnAsset() throws Exception {
    byte[] imageData = "fake-image-data".getBytes();
    String contentType = "image/png";

    when(assetService.getAsset(VALID_ASSET_URL))
        .thenReturn(new AssetService.AssetResponse(imageData, contentType));

    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", VALID_ASSET_URL))
        .andExpect(status().isOk())
        .andExpect(content().contentType(contentType))
        .andExpect(content().bytes(imageData));

    verify(assetService).getAsset(VALID_ASSET_URL);
  }

  @Test
  public void getAsset_withMissingUrlParameter_shouldReturnBadRequest() throws Exception {
    mockMvc.perform(get("/api/v1/clan-data/assets")).andExpect(status().isBadRequest());
  }

  @Test
  public void getAsset_withEmptyUrlParameter_shouldReturnBadRequest() throws Exception {
    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", ""))
        .andExpect(status().isBadRequest());
  }

  @Test
  public void getAsset_withInvalidUrlScheme_shouldReturnBadRequest() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/clan-data/assets")
                .param("url", "ftp://api-assets.clashofclans.com/test.png"))
        .andExpect(status().isBadRequest());
  }

  @Test
  public void getAsset_withInvalidHost_shouldReturnBadRequest() throws Exception {
    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", "https://evil.com/malicious.png"))
        .andExpect(status().isBadRequest());
  }

  @Test
  public void getAsset_withMalformedUrl_shouldReturnBadRequest() throws Exception {
    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", "not-a-valid-url"))
        .andExpect(status().isBadRequest());
  }

  @Test
  public void getAsset_whenServiceThrowsException_shouldReturnServerError() throws Exception {
    when(assetService.getAsset(VALID_ASSET_URL)).thenThrow(new RuntimeException("Upstream error"));

    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", VALID_ASSET_URL))
        .andExpect(status().isBadGateway());
  }

  @Test
  public void getAsset_withHttpUrl_shouldWork() throws Exception {
    String httpUrl = "http://api-assets.clashofclans.com/badges/512/test.png";
    byte[] imageData = "fake-image-data".getBytes();
    String contentType = "image/png";

    when(assetService.getAsset(httpUrl))
        .thenReturn(new AssetService.AssetResponse(imageData, contentType));

    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", httpUrl))
        .andExpect(status().isOk())
        .andExpect(content().contentType(contentType))
        .andExpect(content().bytes(imageData));
  }

  @Test
  public void getAsset_withDifferentContentType_shouldReturnCorrectType() throws Exception {
    byte[] svgData = "<svg></svg>".getBytes();
    String contentType = "image/svg+xml";

    when(assetService.getAsset(VALID_ASSET_URL))
        .thenReturn(new AssetService.AssetResponse(svgData, contentType));

    mockMvc
        .perform(get("/api/v1/clan-data/assets").param("url", VALID_ASSET_URL))
        .andExpect(status().isOk())
        .andExpect(content().contentType(contentType))
        .andExpect(content().bytes(svgData));
  }
}
