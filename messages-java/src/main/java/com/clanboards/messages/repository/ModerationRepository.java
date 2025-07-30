package com.clanboards.messages.repository;

import com.clanboards.messages.model.ModerationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationRepository extends JpaRepository<ModerationRecord, Long> {}
