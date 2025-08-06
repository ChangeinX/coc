package com.clanboards.recruiting.repository;

import com.clanboards.recruiting.model.Clan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClanRepository extends JpaRepository<Clan, String> {}
