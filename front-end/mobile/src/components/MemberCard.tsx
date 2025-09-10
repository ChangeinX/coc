import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated, Alert, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useThemedStyles, useTheme } from '@theme/index';
import { useHaptics, useScaleAnimation, useLongPress, DeepLinks } from '@utils/index';
import { useFavoritesStore } from '@store/favorites.store';
import { TownHallIcon } from './TownHallIcon';
import { RoleIcon } from './RoleIcon';
import { DonationIndicator } from './DonationIndicator';

export interface Member {
  tag: string;
  name: string;
  role?: string | undefined;
  expLevel?: number | undefined;
  league?: {
    id: number;
    name: string;
    iconUrls?: {
      small?: string;
      tiny?: string;
      medium?: string;
    };
  } | undefined;
  townHallLevel: number;
  trophies: number;
  donations: number;
  donationsReceived: number;
  loyalty?: number | undefined;
  risk_score?: number | undefined;
  last_seen?: string | undefined;
  risk_breakdown?: Array<{ points: number; reason: string }> | undefined;
  deep_link?: string | undefined;
}

export interface MemberCardProps {
  member: Member;
  onPress?: (member: Member) => void;
  showRisk?: boolean;
  compact?: boolean;
}

export function MemberCard({ member, onPress, showRisk = true, compact = false }: MemberCardProps) {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { light, medium, isAvailable } = useHaptics();
  const { animatedStyle, press } = useScaleAnimation();
  
  // Favorites functionality
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
  const isMemFavorite = isFavorite(member.tag);

  const handlePress = async () => {
    if (onPress) {
      if (isAvailable()) await light();
      press().start();
      onPress(member);
    }
  };

  const handleFavoriteToggle = async () => {
    if (isAvailable()) await light();
    if (isMemFavorite) {
      removeFavorite(member.tag);
    } else {
      addFavorite({ tag: member.tag, name: member.name });
    }
  };

  const handleLongPress = useLongPress({
    onLongPress: async () => {
      if (isAvailable()) await medium(); // Medium haptic for long press
      
      const options = [
        isMemFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        'Share Player Profile',
        'Copy Player Tag',
        'Copy Player Name',
        ...(member.deep_link ? ['Open in Clash of Clans'] : []),
        'Cancel'
      ];
      
      Alert.alert(
        member.name,
        `Actions for ${member.tag}`,
        options.map((option, _index) => ({
          text: option,
          style: option === 'Cancel' ? 'cancel' : 'default',
          onPress: async () => {
            switch (option) {
              case 'Add to Favorites':
                handleFavoriteToggle();
                break;
              case 'Remove from Favorites':
                handleFavoriteToggle();
                break;
              case 'Share Player Profile':
                try {
                  const deepLink = DeepLinks.member(member.tag);
                  await Share.share({
                    message: `Check out ${member.name} (${member.tag}) in Clan Boards!`,
                    url: deepLink,
                    title: `${member.name} - Clan Boards`,
                  });
                } catch (error) {
                  console.warn('Failed to share player profile:', error);
                }
                break;
              case 'Copy Player Tag':
                await Clipboard.setStringAsync(member.tag);
                Alert.alert('Copied', `Player tag ${member.tag} copied to clipboard`);
                break;
              case 'Copy Player Name':
                await Clipboard.setStringAsync(member.name);
                Alert.alert('Copied', `Player name "${member.name}" copied to clipboard`);
                break;
              case 'Open in Clash of Clans':
                if (member.deep_link) {
                  try {
                    await Linking.openURL(member.deep_link);
                  } catch (error) {
                    Alert.alert('Error', 'Could not open Clash of Clans');
                  }
                }
                break;
            }
          }
        }))
      );
    }
  });

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    return `${days}d ago`;
  };

  const getRiskColor = (score?: number) => {
    if (!score) return theme.colors.success;
    if (score < 30) return theme.colors.success;
    if (score < 70) return theme.colors.warning;
    return theme.colors.error;
  };

  const getRiskLabel = (score?: number) => {
    if (!score) return 'Low';
    if (score < 30) return 'Low';
    if (score < 70) return 'Medium';
    return 'High';
  };

  const cardStyle = {
    ...commonStyles.card,
    padding: compact ? theme.spacing.md : theme.spacing.base,
    marginBottom: theme.spacing.sm,
  };

  const content = (
    <View style={{ gap: theme.spacing.sm }}>
      {/* Header with name and role */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start' 
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              ...commonStyles.body,
              fontWeight: theme.typography.fontWeight.semibold,
            }}>
              {member.name}
            </Text>
            {member.role && (
              <View style={{ marginTop: theme.spacing.xs }}>
                <RoleIcon role={member.role} size="sm" showText={!compact} />
              </View>
            )}
          </View>
          {/* League Icon */}
          {member.league?.iconUrls?.small && (
            <Image
              source={{ uri: member.league.iconUrls.small }}
              style={{
                width: 24,
                height: 24,
                borderRadius: theme.borderRadius.sm,
              }}
              resizeMode="contain"
            />
          )}
        </View>
        
        <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Text style={{
              ...commonStyles.caption,
              color: theme.colors.textMuted,
            }}>
              {member.tag}
            </Text>
            {/* Favorite indicator */}
            <TouchableOpacity onPress={handleFavoriteToggle}>
              <Text style={{
                fontSize: 16,
                color: isMemFavorite ? '#FF6B6B' : theme.colors.textMuted,
              }}>
                {isMemFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
          {member.last_seen && (
            <Text style={commonStyles.caption}>
              {formatTimeAgo(member.last_seen)}
            </Text>
          )}
        </View>
      </View>

      {!compact && (
        <>
          {/* Stats row */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <View style={{ alignItems: 'center' }}>
              <TownHallIcon level={member.townHallLevel} size="sm" />
              <Text style={commonStyles.caption}>Town Hall</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                ...commonStyles.body,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                {member.trophies.toLocaleString()}
              </Text>
              <Text style={commonStyles.caption}>Trophies</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <DonationIndicator 
                donations={member.donations} 
                received={member.donationsReceived} 
                size="sm"
                showRatio={false}
              />
              <Text style={commonStyles.caption}>Don/Rec</Text>
            </View>
            
            {typeof member.loyalty === 'number' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  ...commonStyles.body,
                  fontWeight: theme.typography.fontWeight.medium,
                }}>
                  {member.loyalty}
                </Text>
                <Text style={commonStyles.caption}>Days</Text>
              </View>
            )}
          </View>

          {/* Risk assessment */}
          {showRisk && typeof member.risk_score === 'number' && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  ...commonStyles.bodySecondary,
                  marginBottom: theme.spacing.xs,
                }}>
                  Risk Assessment
                </Text>
                {member.risk_breakdown && member.risk_breakdown.length > 0 && (
                  <View style={{ gap: theme.spacing.xs }}>
                    {member.risk_breakdown.slice(0, 2).map((breakdown, index) => (
                      <Text
                        key={index}
                        style={{
                          ...commonStyles.caption,
                          color: theme.colors.textMuted,
                        }}
                      >
                        • {breakdown.reason} ({breakdown.points} pts)
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={{
                alignItems: 'center',
                backgroundColor: getRiskColor(member.risk_score) + '20',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.base,
                borderWidth: 1,
                borderColor: getRiskColor(member.risk_score),
              }}>
                <Text style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: getRiskColor(member.risk_score),
                }}>
                  {member.risk_score}
                </Text>
                <Text style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: getRiskColor(member.risk_score),
                }}>
                  {getRiskLabel(member.risk_score)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={[cardStyle, animatedStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.9}
          style={{ flex: 1 }}
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}
