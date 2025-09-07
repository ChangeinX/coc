import { View, Text, Alert } from 'react-native';
import * as Apple from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { AUTH_URL } from '@env';
import { apiFetch } from '@services/apiClient';
import { useAuthStore } from '@store/auth.store';
import { useState } from 'react';

export default function LoginScreen() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loading, setLoading] = useState(false);

  const onAppleSignIn = async () => {
    try {
      const isAvail = await Apple.isAvailableAsync();
      if (!isAvail) {
        Alert.alert('Not supported', 'Apple Sign In is not available on this device.');
        return;
      }
      setLoading(true);
      const credential = await Apple.signInAsync({
        requestedScopes: [
          Apple.AppleAuthenticationScope.FULL_NAME,
          Apple.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('No identity token from Apple');
      }
      const url = `${AUTH_URL}/api/v1/users/auth/apple/exchange`;
      const res = await apiFetch<{ access_token: string; refresh_token?: string }>(url, {
        method: 'POST',
        body: JSON.stringify({ id_token: credential.identityToken }),
      });
      const bundle = res.refresh_token
        ? { accessToken: res.access_token, refreshToken: res.refresh_token }
        : { accessToken: res.access_token };
      await setTokens(bundle);
    } catch (e: any) {
      console.error('Apple sign-in failed', e);
      Alert.alert('Sign-in failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ marginBottom: 16 }}>Sign in to continue</Text>
      {Platform.OS === 'ios' ? (
        <Apple.AppleAuthenticationButton
          buttonType={Apple.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: 240, height: 44 }}
          onPress={onAppleSignIn}
        />
      ) : (
        <Text>Apple Sign In will be available on Android later.</Text>
      )}
    </View>
  );
}
