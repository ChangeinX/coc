package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.LoyaltyMembership;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LoyaltyMembershipRepository extends JpaRepository<LoyaltyMembership, Long> {

  @Query(
      "SELECT lm.playerTag FROM LoyaltyMembership lm WHERE lm.clanTag = :clanTag AND lm.leftAt IS NULL")
  List<String> findActivePlayerTagsByClanTag(@Param("clanTag") String clanTag);

  List<LoyaltyMembership> findByClanTagAndLeftAtIsNull(String clanTag);
}
