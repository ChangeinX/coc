import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '@theme/index';
import { useHaptics, useScaleAnimation } from '@utils/index';
import type { ClanRecruitPost } from '../api/recruitingApi';

interface RecruitCardProps {
  post: ClanRecruitPost;
  onPress: (post: ClanRecruitPost) => void;
  onJoin: (post: ClanRecruitPost) => void;
  compact?: boolean;
}

export function RecruitCard({ post, onPress, onJoin, compact = false }: RecruitCardProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { light } = useHaptics();
  const { animatedStyle, press } = useScaleAnimation();

  const { data, createdAt } = post;
  const {
    clanTag,
    name,
    language,
    memberCount,
    warLeague,
    clanLevel,
    labels = [],
    requiredTrophies,
    requiredTownhallLevel,
    requiredBuilderBaseTrophies,
    callToAction,
  } = data;

  const hasRequirements = !!(requiredTrophies || requiredTownhallLevel || requiredBuilderBaseTrophies);

  const handlePress = () => {
    light();
    press();
    onPress(post);
  };

  const handleJoin = () => {
    light();
    onJoin(post);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: compact ? 12 : 16,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    clanInfo: {
      flex: 1,
    },
    clanName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    clanTag: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    joinButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    joinButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    language: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    section: {
      marginTop: compact ? 8 : 12,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    requirementsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    requirementTag: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    requirementText: {
      fontSize: 12,
      color: theme.colors.text,
    },
    clanInfoList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    clanInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clanInfoText: {
      fontSize: 12,
      color: theme.colors.text,
    },
    callToAction: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    timeAgo: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'right',
      marginTop: 8,
    },
  });

  return (
    <TouchableOpacity
      testID="recruit-card"
      style={[styles.card, animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.clanInfo}>
          <Text style={styles.clanName}>{name}</Text>
          {clanTag && <Text style={styles.clanTag}>{clanTag}</Text>}
        </View>
        <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </View>

      {language && (
        <Text style={styles.language}>Language: {language}</Text>
      )}

      {hasRequirements && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          <View style={styles.requirementsList}>
            {requiredTownhallLevel && (
              <View style={styles.requirementTag}>
                <Text style={styles.requirementText}>TH {requiredTownhallLevel}+</Text>
              </View>
            )}
            {requiredTrophies && (
              <View style={styles.requirementTag}>
                <Text style={styles.requirementText}>{requiredTrophies}+ Trophies</Text>
              </View>
            )}
            {requiredBuilderBaseTrophies && (
              <View style={styles.requirementTag}>
                <Text style={styles.requirementText}>{requiredBuilderBaseTrophies}+ Builder Trophies</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {(memberCount || warLeague || clanLevel || labels.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clan Info</Text>
          <View style={styles.clanInfoList}>
            {typeof memberCount === 'number' && (
              <View style={styles.clanInfoItem}>
                <Text style={styles.clanInfoText}>👥 {memberCount}/50</Text>
              </View>
            )}
            {warLeague?.name && (
              <View style={styles.clanInfoItem}>
                <Text style={styles.clanInfoText}>🛡️ {warLeague.name}</Text>
              </View>
            )}
            {clanLevel && (
              <View style={styles.clanInfoItem}>
                <Text style={styles.clanInfoText}>👑 Level {clanLevel}</Text>
              </View>
            )}
            {labels.map((label) => (
              <View key={label.id || label.name} style={styles.clanInfoItem}>
                <Text style={styles.clanInfoText}>🏷️ {label.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {callToAction && !compact && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.callToAction}>{callToAction}</Text>
        </View>
      )}

      {createdAt && (
        <Text style={styles.timeAgo}>{getTimeAgo(createdAt)}</Text>
      )}
    </TouchableOpacity>
  );
}