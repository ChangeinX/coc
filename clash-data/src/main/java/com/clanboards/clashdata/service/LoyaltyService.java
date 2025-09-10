package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.LoyaltyMembership;
import com.clanboards.clashdata.repository.LoyaltyMembershipRepository;
import com.clanboards.clashdata.util.TagUtils;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LoyaltyService {

  private final LoyaltyMembershipRepository loyaltyMembershipRepository;
  private final Clock clock;

  @Autowired
  public LoyaltyService(LoyaltyMembershipRepository loyaltyMembershipRepository, Clock clock) {
    this.loyaltyMembershipRepository = loyaltyMembershipRepository;
    this.clock = clock;
  }

  public Map<String, Integer> getClanLoyalty(String clanTag) {
    String normalizedClanTag = TagUtils.normalizeTag(clanTag);
    List<LoyaltyMembership> activeMemberships =
        loyaltyMembershipRepository.findByClanTagAndLeftAtIsNull(normalizedClanTag);

    Map<String, Integer> loyaltyMap = new HashMap<>();
    LocalDateTime now = LocalDateTime.now(clock);

    for (LoyaltyMembership membership : activeMemberships) {
      long daysBetween = ChronoUnit.DAYS.between(membership.getJoinedAt(), now);
      loyaltyMap.put(membership.getPlayerTag(), (int) daysBetween);
    }

    return loyaltyMap;
  }
}
