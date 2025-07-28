package com.clanboards.notifications.repository;

import com.clanboards.notifications.repository.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRepository extends JpaRepository<Player, String> {}
