import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  RefreshControl, 
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useThemedStyles, useTheme } from '@theme/index';
import { 
  StatCard, 
  MemberCard, 
  LoadingSpinner, 
  RiskIndicator,
  Member 
} from '@components/index';
import { useDashboardData, useRefreshDashboard } from '../hooks/useDashboard';
import { usePlayerInfo } from '../hooks/usePlayerInfo';
import { useAuthStore } from '@store/auth.store';
import { useHaptics } from '@utils/index';
// Temporarily commented out to fix Apple sign-in: useEntranceAnimation

type SortField = 'loyalty' | 'role' | 'th' | 'trophies' | 'donations' | 'last' | 'risk';
type SortDirection = 'asc' | 'desc';
type ActiveSection = 'health' | 'members' | 'intel';

export default function DashboardScreen() {
  const theme = useTheme();
  const commonStyles = useThemedStyles();
  const { user } = useAuthStore();
  const { success, selection } = useHaptics();
  // Temporarily commented out to fix Apple sign-in: 
  // const { animatedStyle, enter } = useEntranceAnimation();
  
  // Local state  
  const [clanTag, setClanTag] = useState('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('health');
  const [sortField, setSortField] = useState<SortField>('loyalty');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Get player info to find their clan
  const { data: playerInfo } = usePlayerInfo(user?.player_tag);

  // Auto-set clan tag from player's clan
  useEffect(() => {
    if (playerInfo?.clanTag && !clanTag) {
      setClanTag(playerInfo.clanTag);
    }
  }, [playerInfo?.clanTag, clanTag]);

  // API hooks
  const {
    data: dashboardData,
    isLoading,
    error,
    isRefetching
  } = useDashboardData(clanTag || null, !!clanTag);
  
  const refreshMutation = useRefreshDashboard();

  // Memoized sorted members
  const sortedMembers = useMemo(() => {
    if (!dashboardData?.members) return [];
    
    const getVal = (m: Member) => {
      switch (sortField) {
        case 'role':
          return m.role || '';
        case 'th':
          return m.townHallLevel;
        case 'trophies':
          return m.trophies;
        case 'donations':
          return m.donations;
        case 'last':
          return m.last_seen ? new Date(m.last_seen).getTime() : 0;
        case 'loyalty':
          return m.loyalty || 0;
        case 'risk':
          return m.risk_score || 0;
        default:
          return 0;
      }
    };

    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...dashboardData.members].sort((a, b) => {
      const v1 = getVal(a);
      const v2 = getVal(b);
      if (v1 < v2) return -1 * dir;
      if (v1 > v2) return 1 * dir;
      return 0;
    });
  }, [dashboardData?.members, sortField, sortDirection]);

  // Handlers

  const handleRefresh = useCallback(async () => {
    if (clanTag) {
      try {
        await success(); // Haptic feedback on refresh start
        await refreshMutation.mutateAsync(clanTag);
      } catch (error) {
        Alert.alert('Error', 'Failed to refresh clan data');
      }
    }
  }, [clanTag, refreshMutation, success]);

  const toggleSort = useCallback(async (field: SortField) => {
    await selection(); // Haptic feedback on sort change
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection, selection]);

  const handleTabChange = useCallback(async (newSection: ActiveSection) => {
    await selection(); // Haptic feedback on tab change
    setActiveSection(newSection);
  }, [selection]);

  const renderMemberItem = ({ item: member }: { item: Member }) => (
    <MemberCard
      member={member}
      onPress={setSelectedMember}
      showRisk={true}
      compact={false}
    />
  );

  const renderTopRiskItem = ({ item: member }: { item: Member }) => (
    <View style={{ width: 280, marginRight: theme.spacing.base }}>
      <MemberCard
        member={member}
        onPress={setSelectedMember}
        showRisk={true}
        compact={true}
      />
    </View>
  );

  // Handle no clan case
  if (!playerInfo?.clanTag && playerInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            padding: theme.spacing.base,
            justifyContent: 'center',
            gap: theme.spacing.lg 
          }}
        >
          <View style={{
            ...commonStyles.card,
            alignItems: 'center',
            padding: theme.spacing['2xl'],
            gap: theme.spacing.base,
          }}>
            <Text style={{ fontSize: 48 }}>🏰</Text>
            <Text style={{
              ...commonStyles.heading2,
              textAlign: 'center',
            }}>
              No Clan Found
            </Text>
            <Text style={{
              ...commonStyles.bodySecondary,
              textAlign: 'center',
            }}>
              You're not currently in a clan. Join a clan in Clash of Clans to access the dashboard.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Error handling
  if (error) {
    const isNotFound = (error as any)?.status === 404;
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            padding: theme.spacing.base,
            justifyContent: 'center',
            gap: theme.spacing.lg 
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
          }
        >
          <View style={{
            ...commonStyles.card,
            alignItems: 'center',
            padding: theme.spacing['2xl'],
            gap: theme.spacing.base,
          }}>
            <Text style={{
              fontSize: 48,
              color: theme.colors.error,
            }}>
              ⚠️
            </Text>
            <Text style={{
              ...commonStyles.heading2,
              color: theme.colors.error,
              textAlign: 'center',
            }}>
              {isNotFound ? 'Clan Not Found' : 'Error Loading Clan'}
            </Text>
            <Text style={{
              ...commonStyles.bodySecondary,
              textAlign: 'center',
            }}>
              {isNotFound 
                ? 'We couldn\'t find your clan. Please try refreshing or check if you\'re still in the clan in Clash of Clans.'
                : 'There was an error loading the clan data. Please try again.'
              }
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        contentContainerStyle={{ padding: theme.spacing.base, gap: theme.spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >

        {/* Loading State */}
        {isLoading && !dashboardData && (
          <LoadingSpinner message="Loading clan data..." />
        )}

        {/* Dashboard Content */}
        {dashboardData && (
          <>
            {/* Tabs */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.base,
              padding: theme.spacing.xs,
              ...theme.shadows.sm,
            }}>
              {([
                { key: 'health', label: 'Clan Health' },
                { key: 'members', label: 'Members' },
                { key: 'intel', label: 'Intel' },
              ] as const).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={{
                    flex: 1,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.base,
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: activeSection === tab.key 
                      ? theme.colors.primary 
                      : 'transparent',
                  }}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: activeSection === tab.key 
                      ? theme.colors.textInverse 
                      : theme.colors.textSecondary,
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Health Section */}
            {activeSection === 'health' && (
              <View style={{ gap: theme.spacing.lg }}>
                {/* Win Streak Highlight */}
                <View style={{ alignItems: 'center' }}>
                  <StatCard
                    label="Win Streak"
                    value={dashboardData.clan.warWinStreak || 0}
                    icon="🏆"
                    size="lg"
                    variant="success"
                  />
                </View>

                {/* Stats Grid */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.md,
                }}>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <StatCard
                      iconUrl={dashboardData.clan.badgeUrls?.small}
                      label="Members"
                      value={dashboardData.members.length}
                      size="sm"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <StatCard
                      icon="⭐"
                      label="Level"
                      value={dashboardData.clan.clanLevel}
                      size="sm"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <StatCard
                      icon="🛡️"
                      label="War Wins"
                      value={dashboardData.clan.warWins || 0}
                      size="sm"
                      variant="success"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <StatCard
                      icon="💔"
                      label="War Losses"
                      value={dashboardData.clan.warLosses || 0}
                      size="sm"
                      variant="error"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Members Section */}
            {activeSection === 'members' && (
              <View style={{ gap: theme.spacing.lg }}>
                {/* Top 5 At-Risk Members */}
                {dashboardData.topRisk.length > 0 && (
                  <View>
                    <Text style={{
                      ...commonStyles.heading2,
                      marginBottom: theme.spacing.base,
                    }}>
                      Top 5 At-Risk Members
                    </Text>
                    <FlatList
                      data={dashboardData.topRisk}
                      renderItem={renderTopRiskItem}
                      keyExtractor={(item) => item.tag}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: theme.spacing.base }}
                    />
                  </View>
                )}

                {/* Sort Controls */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing.base,
                }}>
                  {([
                    { key: 'loyalty', label: 'Loyalty' },
                    { key: 'risk', label: 'Risk' },
                    { key: 'trophies', label: 'Trophies' },
                    { key: 'th', label: 'TH' },
                  ] as const).map((sort) => (
                    <TouchableOpacity
                      key={sort.key}
                      style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: theme.borderRadius.base,
                        borderWidth: 1,
                        borderColor: sortField === sort.key 
                          ? theme.colors.primary 
                          : theme.colors.border,
                        backgroundColor: sortField === sort.key 
                          ? theme.colors.primaryMuted 
                          : theme.colors.surface,
                      }}
                      onPress={() => toggleSort(sort.key)}
                    >
                      <Text style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: sortField === sort.key 
                          ? theme.colors.primary 
                          : theme.colors.textSecondary,
                        fontWeight: sortField === sort.key 
                          ? theme.typography.fontWeight.medium 
                          : theme.typography.fontWeight.normal,
                      }}>
                        {sort.label} {sortField === sort.key ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Members List */}
                <Text style={{
                  ...commonStyles.heading2,
                  marginBottom: theme.spacing.base,
                }}>
                  All Members ({sortedMembers.length})
                </Text>

                <FlatList
                  data={sortedMembers}
                  renderItem={renderMemberItem}
                  keyExtractor={(item) => item.tag}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: theme.spacing.sm }}
                />
              </View>
            )}

            {/* Intel Section (Coming Soon) */}
            {activeSection === 'intel' && (
              <View style={{
                ...commonStyles.card,
                alignItems: 'center',
                padding: theme.spacing['2xl'],
                gap: theme.spacing.base,
              }}>
                <Text style={{ fontSize: 48 }}>🔍</Text>
                <Text style={{
                  ...commonStyles.heading2,
                  textAlign: 'center',
                }}>
                  Intel Coming Soon
                </Text>
                <Text style={{
                  ...commonStyles.bodySecondary,
                  textAlign: 'center',
                }}>
                  Advanced analytics and insights will be available here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
