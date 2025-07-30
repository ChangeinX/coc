package com.clanboards.messages.repository;

import com.clanboards.messages.model.BlockedUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockedUserRepository extends JpaRepository<BlockedUser, String> {}
