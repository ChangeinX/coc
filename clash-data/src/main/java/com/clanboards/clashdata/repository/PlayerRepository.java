package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerRepository extends JpaRepository<Player, String> {
  Player findByTag(String tag);
}
