import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useThemedStyles, useTheme } from '@theme/index';
import { useHaptics, useScaleAnimation, useLongPress } from '@utils/index';

export interface Member {
  tag: string;
  name: string;
  role?: string;
  townHallLevel: number;
  trophies: number;
  donations: number;
  donationsReceived: number;
  loyalty?: number;
  risk_score?: number;
  last_seen?: string | undefined;
  risk_breakdown?: Array<{ points: number; reason: string }>;
  deep_link?: string;
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
  const { light } = useHaptics();
  const { animatedStyle, press } = useScaleAnimation();

  const handlePress = async () => {
    if (onPress) {
      await light();
      press().start();
      onPress(member);
    }
  };

  const handleLongPress = useLongPress({
    onLongPress: () => {
      // Could open context menu or additional actions
      console.log('Long press on member:', member.name);
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
        <View style={{ flex: 1 }}>
          <Text style={{
            ...commonStyles.body,
            fontWeight: theme.typography.fontWeight.semibold,
          }}>
            {member.name}
          </Text>
          {member.role && (
            <Text style={commonStyles.caption}>
              {member.role}
            </Text>
          )}
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{
            ...commonStyles.caption,
            color: theme.colors.textMuted,
          }}>
            {member.tag}
          </Text>
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
              <Text style={{
                ...commonStyles.body,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                TH {member.townHallLevel}
              </Text>
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
              <Text style={{
                ...commonStyles.body,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                {member.donations}/{member.donationsReceived}
              </Text>
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