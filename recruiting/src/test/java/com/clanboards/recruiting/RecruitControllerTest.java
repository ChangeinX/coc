package com.clanboards.recruiting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.clanboards.recruiting.model.Clan;
import com.clanboards.recruiting.repository.ClanRepository;
import com.clanboards.recruiting.repository.RecruitJoinRepository;
import com.clanboards.recruiting.repository.RecruitPostRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {"jwt.signing-key=0123456789abcdef0123456789abcdef"})
@AutoConfigureMockMvc
class RecruitControllerTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private RecruitPostRepository recruitPostRepository;
  @Autowired private RecruitJoinRepository recruitJoinRepository;
  @Autowired private ClanRepository clanRepository;

  private static final byte[] KEY =
      "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8);

  private static String token(String sub) {
    return Jwts.builder().claim("sub", sub).signWith(SignatureAlgorithm.HS256, KEY).compact();
  }

  @Test
  void health() throws Exception {
    mockMvc
        .perform(get("/api/v1/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void createAndListRecruit() throws Exception {
    Clan clan = new Clan();
    clan.setTag("ABC");
    clan.setDeepLink("https://link.clashofclans.com/?action=OpenClanProfile&tag=%23ABC");
    clan.setData(Map.of("name", "TestClan", "requiredTrophies", 1000));
    clanRepository.save(clan);

    mockMvc
        .perform(
            post("/api/v1/recruiting/recruit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"clanTag\":\"#ABC\",\"callToAction\":\"join\"}"))
        .andExpect(status().isCreated());

    mockMvc
        .perform(get("/api/v1/recruiting/recruit"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].clan.tag").value("#ABC"))
        .andExpect(jsonPath("$.items[0].clan.requiredTrophies").value(1000))
        .andExpect(jsonPath("$.items[0].clan.deep_link").value(clan.getDeepLink()));
  }

  @Test
  void joinRecruit() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/recruiting/recruit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"clanTag\":\"#ABC\",\"callToAction\":\"join\"}"))
        .andExpect(status().isCreated());

    Long postId = recruitPostRepository.findAll().get(0).getId();
    mockMvc
        .perform(
            post("/api/v1/recruiting/join/" + postId)
                .header("Authorization", "Bearer " + token("1")))
        .andExpect(status().isNoContent());

    assertThat(recruitJoinRepository.findAll()).hasSize(1);
  }
}
