import { View, Text, Pressable, Alert } from 'react-native';
import { useTheme } from '@theme/index';
import { AUTH_URL, API_URL, ENV } from '@env';
import { useAuthStore } from '@store/auth.store';
import { tokenStorage } from '@services/storage/secureStorage';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { name, setTheme, colors } = useTheme();
  const setTokens = useAuthStore((s) => s.setTokens);
  const tokens = useAuthStore((s) => s.tokens);

  const isDevEnv =
    ENV === 'dev' || /localhost|dev/i.test(API_URL) || /localhost|dev/i.test(AUTH_URL);

  const Button = ({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        marginRight: 8,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.text }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 12, color: colors.text }}>Theme</Text>
      <View style={{ flexDirection: 'row' }}>
        <Button label="System" onPress={() => setTheme('system')} active={name === 'system'} />
        <Button label="Light" onPress={() => setTheme('light')} active={name === 'light'} />
        <Button label="Dark" onPress={() => setTheme('dark')} active={name === 'dark'} />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
      <Text style={{ fontSize: 18, marginBottom: 12, color: colors.text }}>Account</Text>
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
      />

      {isDevEnv && (
        <>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
          <Text style={{ fontSize: 18, marginBottom: 12, color: colors.text }}>Developer</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.textMuted }} numberOfLines={1}>API: {API_URL}</Text>
            <Text style={{ color: colors.textMuted }} numberOfLines={1}>Auth: {AUTH_URL}</Text>
          </View>
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
          />
        </>
      )}
    </View>
  );
}
