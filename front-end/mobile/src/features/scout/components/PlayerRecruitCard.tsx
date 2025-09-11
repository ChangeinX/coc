import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme, useThemedStyles } from '@theme/index';
import { useHaptics, useScaleAnimation } from '@utils/index';
import type { PlayerRecruitPost } from '../api/recruitingApi';

interface PlayerRecruitCardProps {
  post: PlayerRecruitPost;
  onPress: (post: PlayerRecruitPost) => void;
  onInvite: (post: PlayerRecruitPost) => void;
  compact?: boolean;
}

export function PlayerRecruitCard({ post, onPress, onInvite, compact = false }: PlayerRecruitCardProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { light } = useHaptics();
  const { animatedStyle, press } = useScaleAnimation();

  const { name, tag, avatar, description, league, language, war, createdAt } = post;

  const hasDetails = !!(league || language || war);

  const handlePress = () => {
    light();
    press();
    onPress(post);
  };

  const handleInvite = () => {
    light();
    onInvite(post);
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
    playerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.border,
    },
    textInfo: {
      flex: 1,
    },
    playerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    playerTag: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    inviteButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    inviteButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    description: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: compact ? 4 : 8,
    },
    section: {
      marginTop: compact ? 6 : 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    detailsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      fontSize: 12,
      color: theme.colors.text,
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
      testID="player-recruit-card"
      style={[styles.card, animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          {avatar && (
            <Image
              testID="player-avatar"
              source={{ uri: avatar }}
              style={styles.avatar}
            />
          )}
          <View style={styles.textInfo}>
            <Text style={styles.playerName}>{name}</Text>
            {tag && <Text style={styles.playerTag}>{tag}</Text>}
          </View>
        </View>
        <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{description}</Text>

      {hasDetails && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Player Details</Text>
          <View style={styles.detailsList}>
            {league && (
              <View style={styles.detailItem}>
                <Text style={styles.detailText}>🏆 {league}</Text>
              </View>
            )}
            {language && (
              <View style={styles.detailItem}>
                <Text style={styles.detailText}>🌍 {language}</Text>
              </View>
            )}
            {war && (
              <View style={styles.detailItem}>
                <Text style={styles.detailText}>⚔️ {war}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {createdAt && (
        <Text style={styles.timeAgo}>{getTimeAgo(createdAt)}</Text>
      )}
    </TouchableOpacity>
  );
}