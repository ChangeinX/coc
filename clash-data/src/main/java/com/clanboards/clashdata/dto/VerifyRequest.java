package com.clanboards.clashdata.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VerifyRequest {

  @JsonProperty("token")
  private String token;

  public VerifyRequest() {}

  public VerifyRequest(String token) {
    this.token = token;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
  }
}
