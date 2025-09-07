import { View, Text } from 'react-native';

export function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 12, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}
