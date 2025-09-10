package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RiskService {

  private static final Logger logger = LoggerFactory.getLogger(RiskService.class);

  // Risk calculation constants
  private static final Map<String, Double> DEFAULT_WEIGHTS =
      Map.of(
          "war", 0.40,
          "idle", 0.35,
          "don_deficit", 0.15,
          "don_drop", 0.10);
  private static final int MAX_SCORE = 100;
  private static final int WAR_ATTACKS_TOTAL = 2;
  private static final double DEFICIT_CEIL = 0.50;
  private static final double DROP_CEIL = 0.30;
  private static final int CLAN_WAR_WINDOW = 42;

  private final PlayerSnapshotService playerSnapshotService;
  private final SnapshotService snapshotService;
  private final Clock clock;

  @Autowired
  public RiskService(
      PlayerSnapshotService playerSnapshotService, SnapshotService snapshotService, Clock clock) {
    this.playerSnapshotService = playerSnapshotService;
    this.snapshotService = snapshotService;
    this.clock = clock;
  }

  public List<Map<String, Object>> getClanAtRisk(String clanTag, Map<String, Double> weights) {
    logger.debug("Getting at-risk members for clan: {}", clanTag);

    // Refresh clan snapshot to ensure membership list is current
    snapshotService.getClan(clanTag);

    // Get latest snapshots for all clan members
    List<PlayerSnapshot> latestSnapshots = playerSnapshotService.getLatestSnapshotsForClan(clanTag);

    List<Map<String, Object>> results = new ArrayList<>();

    for (PlayerSnapshot snapshot : latestSnapshots) {
      List<PlayerSnapshot> history =
          playerSnapshotService.getPlayerHistory(snapshot.getPlayerTag(), 30);

      if (history.isEmpty()) {
        continue;
      }

      RiskCalculationResult result = calculateRiskScoreWithBreakdown(history, null, weights);

      Map<String, Object> playerRisk = new HashMap<>();
      playerRisk.put("player_tag", snapshot.getPlayerTag());
      playerRisk.put("name", snapshot.getName());
      playerRisk.put("risk_score", result.score);
      playerRisk.put("last_seen", result.lastSeen.toString() + "Z");
      playerRisk.put("risk_breakdown", result.breakdown);

      results.add(playerRisk);
    }

    // Sort by risk score descending
    results.sort(
        (a, b) -> Integer.compare((Integer) b.get("risk_score"), (Integer) a.get("risk_score")));

    logger.debug("Found {} at-risk members for clan: {}", results.size(), clanTag);
    return results;
  }

  public int calculateRiskScore(
      List<PlayerSnapshot> history,
      Map<String, List<PlayerSnapshot>> clanHistoryMap,
      Map<String, Double> weights) {
    RiskCalculationResult result =
        calculateRiskScoreWithBreakdown(history, clanHistoryMap, weights);
    return result.score;
  }

  private RiskCalculationResult calculateRiskScoreWithBreakdown(
      List<PlayerSnapshot> history,
      Map<String, List<PlayerSnapshot>> clanHistoryMap,
      Map<String, Double> weights) {
    if (history.isEmpty()) {
      return new RiskCalculationResult(0, LocalDateTime.now(clock), new ArrayList<>());
    }

    PlayerSnapshot latest = history.get(history.size() - 1);
    PlayerSnapshot prev =
        history.size() < 2
            ? history.get(0)
            : (history.size() >= 8 ? history.get(history.size() - 8) : history.get(0));

    // Calculate war risk
    WarRiskData warRisk = calculateWarRisk(history, clanHistoryMap);

    // Calculate idle risk
    IdleRiskData idleRisk = calculateIdleRisk(history, latest);

    // Calculate donation deficit risk
    double deficitRisk = calculateDeficitRisk(latest);

    // Calculate donation drop risk
    double dropRisk = calculateDropRisk(latest, prev);

    // Merge weights
    Map<String, Double> actualWeights = mergeWeights(weights);

    // Calculate total score
    double rawScore =
        actualWeights.get("war") * warRisk.percentage
            + actualWeights.get("idle") * idleRisk.percentage
            + actualWeights.get("don_deficit") * deficitRisk
            + actualWeights.get("don_drop") * dropRisk;

    int totalScore = (int) Math.round(rawScore * MAX_SCORE);

    // Build breakdown
    List<Map<String, Object>> breakdown =
        buildRiskBreakdown(actualWeights, warRisk, idleRisk, deficitRisk, dropRisk);

    return new RiskCalculationResult(totalScore, idleRisk.lastActivityTime, breakdown);
  }

  private WarRiskData calculateWarRisk(
      List<PlayerSnapshot> history, Map<String, List<PlayerSnapshot>> clanHistoryMap) {
    Optional<PlayerSnapshot> latestWarSnap =
        history.stream()
            .filter(s -> s.getWarAttacksUsed() != null)
            .max(
                Comparator.comparing((PlayerSnapshot s) -> s.getWarAttacksUsed())
                    .thenComparing(PlayerSnapshot::getTs));

    if (latestWarSnap.isEmpty()) {
      return new WarRiskData(0.0, null, null, "not in war roster");
    }

    PlayerSnapshot warSnap = latestWarSnap.get();
    int warUsed = warSnap.getWarAttacksUsed();
    int cap =
        Math.max(
            history.stream()
                .filter(s -> s.getWarAttacksUsed() != null)
                .mapToInt(PlayerSnapshot::getWarAttacksUsed)
                .max()
                .orElse(0),
            WAR_ATTACKS_TOTAL);

    double warMissPct = Math.max(0.0, Math.min(1.0, (double) (cap - warUsed) / cap));

    // Don't penalize if war is still in progress (less than 24 hours ago and 0 attacks)
    if (warUsed == 0 && ChronoUnit.HOURS.between(warSnap.getTs(), LocalDateTime.now(clock)) < 24) {
      warMissPct = 0.0;
    }

    // Check if clan is actively warring (simplified - assume active for now)
    boolean clanActive = true; // Simplified implementation

    if (!clanActive) {
      warMissPct = 0.0;
    }

    String reason;
    if (warUsed == 0) {
      reason = "no war attacks used";
    } else {
      int missed = cap - warUsed;
      reason = String.format("missed %d war attack%s", missed, missed != 1 ? "s" : "");
    }

    return new WarRiskData(warMissPct, warUsed, cap, reason);
  }

  private IdleRiskData calculateIdleRisk(List<PlayerSnapshot> history, PlayerSnapshot latest) {
    // Find last activity (last change in trophies or donations, or last_seen)
    LocalDateTime lastActivity =
        latest.getLastSeen() != null ? latest.getLastSeen() : latest.getTs();

    for (int i = history.size() - 1; i >= 0; i--) {
      PlayerSnapshot current = history.get(i);
      if (i == 0
          || !Objects.equals(current.getTrophies(), latest.getTrophies())
          || !Objects.equals(current.getDonations(), latest.getDonations())) {
        if (current.getLastSeen() != null && current.getLastSeen().isAfter(lastActivity)) {
          lastActivity = current.getLastSeen();
        }
        break;
      }
    }

    long idleDays = ChronoUnit.DAYS.between(lastActivity, LocalDateTime.now(clock));
    double idlePct = getIdlePercentageFromDays((int) idleDays);

    return new IdleRiskData(idlePct, (int) idleDays, lastActivity);
  }

  private double getIdlePercentageFromDays(int days) {
    if (days >= 4) return 1.0;
    if (days == 3) return 0.75;
    if (days == 2) return 0.50;
    return 0.0;
  }

  private double calculateDeficitRisk(PlayerSnapshot latest) {
    double ratio = (double) latest.getDonations() / Math.max(latest.getDonationsReceived(), 1);
    return Math.max(0.0, Math.min(1.0, (DEFICIT_CEIL - ratio) / DEFICIT_CEIL));
  }

  private double calculateDropRisk(PlayerSnapshot latest, PlayerSnapshot prev) {
    double dropRatio =
        (double) (prev.getDonations() - latest.getDonations()) / Math.max(prev.getDonations(), 1);
    return Math.max(0.0, Math.min(1.0, dropRatio / DROP_CEIL));
  }

  private Map<String, Double> mergeWeights(Map<String, Double> customWeights) {
    Map<String, Double> weights = new HashMap<>(DEFAULT_WEIGHTS);
    if (customWeights != null) {
      for (Map.Entry<String, Double> entry : customWeights.entrySet()) {
        if (weights.containsKey(entry.getKey()) && entry.getValue() != null) {
          weights.put(entry.getKey(), entry.getValue());
        }
      }
    }
    return weights;
  }

  private List<Map<String, Object>> buildRiskBreakdown(
      Map<String, Double> weights,
      WarRiskData warRisk,
      IdleRiskData idleRisk,
      double deficitRisk,
      double dropRisk) {
    List<Map<String, Object>> breakdown = new ArrayList<>();

    int warPts = (int) Math.round(weights.get("war") * warRisk.percentage * MAX_SCORE);
    int idlePts = (int) Math.round(weights.get("idle") * idleRisk.percentage * MAX_SCORE);
    int deficitPts = (int) Math.round(weights.get("don_deficit") * deficitRisk * MAX_SCORE);
    int dropPts = (int) Math.round(weights.get("don_drop") * dropRisk * MAX_SCORE);

    if (warPts > 0) {
      Map<String, Object> warBreakdown = new HashMap<>();
      warBreakdown.put("points", warPts);
      warBreakdown.put("reason", warRisk.reason);
      breakdown.add(warBreakdown);
    }

    if (idlePts > 0) {
      Map<String, Object> idleBreakdown = new HashMap<>();
      idleBreakdown.put("points", idlePts);
      idleBreakdown.put(
          "reason",
          String.format("inactive for %d day%s", idleRisk.days, idleRisk.days != 1 ? "s" : ""));
      breakdown.add(idleBreakdown);
    }

    if (deficitPts > 0) {
      Map<String, Object> deficitBreakdown = new HashMap<>();
      deficitBreakdown.put("points", deficitPts);
      deficitBreakdown.put("reason", "donation deficit");
      breakdown.add(deficitBreakdown);
    }

    if (dropPts > 0) {
      Map<String, Object> dropBreakdown = new HashMap<>();
      dropBreakdown.put("points", dropPts);
      dropBreakdown.put("reason", "donations dropped");
      breakdown.add(dropBreakdown);
    }

    return breakdown;
  }

  // Helper classes for risk calculation data
  private static class RiskCalculationResult {
    final int score;
    final LocalDateTime lastSeen;
    final List<Map<String, Object>> breakdown;

    RiskCalculationResult(int score, LocalDateTime lastSeen, List<Map<String, Object>> breakdown) {
      this.score = score;
      this.lastSeen = lastSeen;
      this.breakdown = breakdown;
    }
  }

  private static class WarRiskData {
    final double percentage;
    final Integer used;
    final Integer cap;
    final String reason;

    WarRiskData(double percentage, Integer used, Integer cap, String reason) {
      this.percentage = percentage;
      this.used = used;
      this.cap = cap;
      this.reason = reason;
    }
  }

  private static class IdleRiskData {
    final double percentage;
    final int days;
    final LocalDateTime lastActivityTime;

    IdleRiskData(double percentage, int days, LocalDateTime lastActivityTime) {
      this.percentage = percentage;
      this.days = days;
      this.lastActivityTime = lastActivityTime;
    }
  }
}
