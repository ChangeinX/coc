import { View, Text, Pressable, Alert, ScrollView, TextInput, Switch, Modal } from 'react-native';
import { useTheme } from '@theme/index';
import { AUTH_URL, API_URL, ENV, MESSAGES_URL } from '@env';
import { useAuthStore } from '@store/auth.store';
import { tokenStorage } from '@services/storage/secureStorage';
import * as Clipboard from 'expo-clipboard';
import { useState, useEffect } from 'react';
import { userApi, UserProfile, UserFeatures } from '../api/user.api';
import RiskPrioritySelect, { RiskWeights } from '../components/RiskPrioritySelect';
import VerifiedBadge from '../components/VerifiedBadge';
import ChatBadge from '../components/ChatBadge';
import { apiFetch } from '@services/apiClient';

const TokenExpiryCountdown = () => {
  const { colors } = useTheme();
  const tokens = useAuthStore((s) => s.tokens);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!tokens?.expiresAt) {
      setTimeRemaining('Unknown');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expiresAt = tokens.expiresAt!;
      const diffMs = expiresAt - now;

      if (diffMs <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [tokens?.expiresAt]);

  const getTextColor = () => {
    if (!tokens?.expiresAt) return colors.textMuted;
    const diffMs = tokens.expiresAt - Date.now();
    if (diffMs <= 0) return colors.error || '#ff4444';
    if (diffMs <= 5 * 60 * 1000) return colors.warning || '#ff8800'; // 5 minutes
    return colors.textMuted;
  };

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        Token expires in: <Text style={{ color: getTextColor(), fontWeight: '500' }}>{timeRemaining}</Text>
      </Text>
    </View>
  );
};

export default function SettingsScreen() {
  const { name, setTheme, colors } = useTheme();
  const setTokens = useAuthStore((s) => s.setTokens);
  const tokens = useAuthStore((s) => s.tokens);

  // Profile and features state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [features, setFeatures] = useState<UserFeatures | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [chatEnabled, setChatEnabled] = useState(false);
  const [showRiskInfo, setShowRiskInfo] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);

  const isDevEnv =
    ENV === 'dev' || /localhost|dev/i.test(API_URL) || /localhost|dev/i.test(AUTH_URL);

  // Load profile and features on mount
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const [profileData, featuresData] = await Promise.all([
          userApi.getProfile(),
          userApi.getFeatures()
        ]);
        setProfile(profileData);
        setFeatures(featuresData);
        setChatEnabled(featuresData.all || featuresData.features.includes('chat'));
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Set empty profile to allow UI to render
        setProfile({} as UserProfile);
        setFeatures({ all: false, features: [] });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Handle profile changes
  const handleProfileChange = (key: keyof UserProfile, value: any) => {
    setProfile(prev => prev ? { ...prev, [key]: value } : null);
  };

  // Handle risk priority selection
  const handleRiskPrioritySelect = (weights: RiskWeights) => {
    if (profile) {
      setProfile({
        ...profile,
        ...weights
      });
    }
  };

  // Save profile and features
  const handleSave = async () => {
    if (!profile || !features) return;
    
    if (chatEnabled && !profile.verified) {
      Alert.alert('Verification Required', 'You must verify your account to enable chat.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        userApi.updateProfile(profile),
        userApi.updateFeatures({
          ...features,
          features: chatEnabled ? ['chat'] : [],
          all: false
        })
      ]);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle verification
  const handleVerification = async () => {
    if (!apiToken.trim()) {
      Alert.alert('Error', 'Please enter an API token.');
      return;
    }

    setSaving(true);
    try {
      await userApi.verifyAccount({ token: apiToken });
      if (profile) {
        setProfile({ ...profile, verified: true });
      }
      setApiToken('');
      Alert.alert('Success', 'Account verified successfully!');
    } catch (error) {
      console.error('Failed to verify account:', error);
      Alert.alert('Error', 'Failed to verify account. Please check your API token.');
    } finally {
      setSaving(false);
    }
  };

  // Debug functions for messages service
  const testMessagesConfig = async () => {
    setDebugLoading(true);
    try {
      const config = await fetch(`${MESSAGES_URL}/api/v1/chat/debug/config`);
      const configData = await config.json();
      
      Alert.alert(
        'Messages Service Config',
        `Issuer: ${configData.issuer}\nAudience: ${configData.audience}\nJWKS Source: ${configData.jwksSource}\nJWKS DB Key: ${configData.jwksDbKey}\nDisallow HTTP: ${configData.disallowHttp}`,
        [{ text: 'Copy', onPress: () => Clipboard.setStringAsync(JSON.stringify(configData, null, 2)) }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to fetch config: ${error}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const testTokenValidation = async () => {
    setDebugLoading(true);
    try {
      const tokens = await tokenStorage.get();
      if (!tokens?.accessToken) {
        Alert.alert('Error', 'No access token available');
        return;
      }

      const response = await fetch(`${MESSAGES_URL}/api/v1/chat/debug/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokens.accessToken }),
      });
      
      const result = await response.json();
      
      if (result.valid) {
        Alert.alert(
          'Token Valid ✅',
          `User ID: ${result.extractedUserId}\nIssuer: ${result.claims.issuer}\nAudience: ${result.claims.audience}`,
          [{ text: 'Copy Details', onPress: () => Clipboard.setStringAsync(JSON.stringify(result, null, 2)) }]
        );
      } else {
        Alert.alert(
          'Token Invalid ❌',
          `Error: ${result.error}`,
          [{ text: 'Copy Details', onPress: () => Clipboard.setStringAsync(JSON.stringify(result, null, 2)) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Validation failed: ${error}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const testRequestInfo = async () => {
    setDebugLoading(true);
    try {
      const response = await apiFetch<{
        method: string;
        hasBearerToken: boolean;
        hasSidCookie: boolean;
        [key: string]: any;
      }>(`${MESSAGES_URL}/api/v1/chat/debug/request-info`, { auth: true });
      
      Alert.alert(
        'Request Info',
        `Method: ${response.method}\nAuth Token: ${response.hasBearerToken ? 'Yes' : 'No'}\nCookie: ${response.hasSidCookie ? 'Yes' : 'No'}`,
        [{ text: 'Copy Details', onPress: () => Clipboard.setStringAsync(JSON.stringify(response, null, 2)) }]
      );
    } catch (error) {
      Alert.alert('Error', `Request failed: ${error}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const Button = ({ label, onPress, active, fullWidth }: { 
    label: string; 
    onPress: () => void; 
    active?: boolean;
    fullWidth?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        marginRight: fullWidth ? 0 : 8,
        backgroundColor: active ? colors.primary + '10' : 'transparent',
      }}
    >
      <Text style={{ 
        color: active ? colors.primary : colors.text,
        textAlign: fullWidth ? 'center' : 'left',
        fontWeight: active ? '600' : '400'
      }}>{label}</Text>
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={{ 
      fontSize: 18, 
      fontWeight: '600',
      marginBottom: 12, 
      marginTop: 24,
      color: colors.text 
    }}>{title}</Text>
  );

  const SectionDivider = () => (
    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Theme Section */}
      <SectionHeader title="Theme" />
      <View style={{ flexDirection: 'row' }}>
        <Button label="System" onPress={() => setTheme('system')} active={name === 'system'} />
        <Button label="Light" onPress={() => setTheme('light')} active={name === 'light'} />
        <Button label="Dark" onPress={() => setTheme('dark')} active={name === 'dark'} />
      </View>

      {/* Profile Section */}
      <SectionHeader title="Profile" />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: colors.text, marginRight: 8 }}>Status:</Text>
        {profile?.verified && <VerifiedBadge />}
        {chatEnabled && <ChatBadge />}
      </View>

      {/* Risk Priority Section */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text, marginRight: 8 }}>
            Risk Priority
          </Text>
          <Pressable onPress={() => setShowRiskInfo(true)}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>ⓘ</Text>
          </Pressable>
        </View>
        {profile && (
          <RiskPrioritySelect 
            weights={{
              risk_weight_war: profile.risk_weight_war || 0.4,
              risk_weight_idle: profile.risk_weight_idle || 0.35,
              risk_weight_don_deficit: profile.risk_weight_don_deficit || 0.15,
              risk_weight_don_drop: profile.risk_weight_don_drop || 0.1,
            }}
            onSelect={handleRiskPrioritySelect}
          />
        )}
      </View>

      {/* Features Section */}
      <SectionHeader title="Features" />
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingVertical: 8,
        marginBottom: 16
      }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Enable Chat</Text>
        <Switch
          value={chatEnabled}
          onValueChange={setChatEnabled}
          trackColor={{ false: colors.border, true: colors.primary + '40' }}
          thumbColor={chatEnabled ? colors.primary : colors.textMuted}
        />
      </View>

      {/* Verification Section (for unverified users) */}
      {profile && !profile.verified && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>API Token</Text>
          <TextInput
            value={apiToken}
            onChangeText={setApiToken}
            placeholder="Enter your API token"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.text,
              backgroundColor: colors.background,
              marginBottom: 12,
            }}
          />
          <Button
            label={saving ? 'Verifying...' : 'Verify Account'}
            onPress={handleVerification}
            fullWidth
          />
        </View>
      )}

      {/* Save Button */}
      <Button
        label={saving ? 'Saving...' : 'Save Settings'}
        onPress={handleSave}
        fullWidth
      />

      <SectionDivider />

      {/* Account Section */}
      <SectionHeader title="Account" />
      <Button
        label="Logout"
        onPress={async () => {
          try {
            const tokens = await tokenStorage.get();
            if (tokens?.refreshToken) {
              const res = await fetch(`${AUTH_URL}/api/v1/users/oauth2/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ token: tokens.refreshToken }).toString(),
              });
              if (!res.ok) console.warn('Failed to revoke refresh token');
            }
          } catch (e) {
            console.warn('Logout error', e);
          } finally {
            await setTokens(null);
            Alert.alert('Signed out');
          }
        }}
        fullWidth
      />

      {/* Developer Section (dev only) */}
      {isDevEnv && (
        <>
          <SectionDivider />
          <SectionHeader title="Developer" />
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>API: {API_URL}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>Auth: {AUTH_URL}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>Messages: {MESSAGES_URL}</Text>
            <TokenExpiryCountdown />
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <Button
              label="Copy Access Token"
              onPress={async () => {
                try {
                  const at = tokens?.accessToken ?? (await tokenStorage.get())?.accessToken;
                  if (!at) {
                    Alert.alert('No token', 'No access token is available. Log in first.');
                    return;
                  }
                  await Clipboard.setStringAsync(at);
                  Alert.alert('Copied', 'Access token copied to clipboard.');
                } catch (e) {
                  console.warn('Copy token failed', e);
                  Alert.alert('Failed', 'Unable to copy token to clipboard.');
                }
              }}
              fullWidth
            />
          </View>

          {/* Messages Debug Section */}
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '500',
            marginBottom: 8,
            color: colors.text 
          }}>Messages Service Debug</Text>
          
          <View style={{ marginBottom: 8 }}>
            <Button
              label={debugLoading ? "Loading..." : "Test Config"}
              onPress={testMessagesConfig}
              fullWidth
            />
          </View>
          
          <View style={{ marginBottom: 8 }}>
            <Button
              label={debugLoading ? "Loading..." : "Test Token Validation"}
              onPress={testTokenValidation}
              fullWidth
            />
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <Button
              label={debugLoading ? "Loading..." : "Test Request Info"}
              onPress={testRequestInfo}
              fullWidth
            />
          </View>
        </>
      )}

      {/* Risk Priority Info Modal */}
      <Modal
        visible={showRiskInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRiskInfo(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 12,
            padding: 20,
            maxWidth: '90%',
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>Risk Priority</Text>
            <Text style={{
              color: colors.textMuted,
              lineHeight: 20,
              marginBottom: 16,
            }}>Choose a preset to adjust how members are ranked by risk. Different presets emphasize different factors like war performance, activity, and donation behavior.</Text>
            <Button
              label="Close"
              onPress={() => setShowRiskInfo(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
