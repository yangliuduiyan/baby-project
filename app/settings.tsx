import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { HORIZONTAL_PADDING } from '@/utils/layout';
import { storage } from '@/utils/storage';
import { requestNotificationPermission } from '@/utils/feedReminder';

export default function SettingsScreen() {
  const router = useRouter();
  const [intervalHours, setIntervalHours] = useState('4');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const hours = await storage.getFeedIntervalHours();
      const enabled = await storage.getFeedReminderEnabled();
      setIntervalHours(String(hours));
      setReminderEnabled(enabled);
    })();
  }, []);

  const persistSettings = async (hours: number, enabled: boolean) => {
    await storage.setFeedIntervalHours(hours);
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted && Platform.OS !== 'web') {
        Alert.alert('需要通知权限', '请到系统设置中允许通知，才能收到喂食提醒。');
      }
    }
    await storage.setFeedReminderEnabled(enabled);
  };

  const handleIntervalBlur = () => {
    const hours = Math.max(1, Math.min(24, parseInt(intervalHours, 10) || 4));
    setIntervalHours(String(hours));
    persistSettings(hours, reminderEnabled);
  };

  const handleReminderChange = async (value: boolean) => {
    setReminderEnabled(value);
    const hours = Math.max(1, Math.min(24, parseInt(intervalHours, 10) || 4));
    await persistSettings(hours, value);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1E293B" />
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>喂食提醒</Text>
          <Text style={styles.hint}>
            根据最近一次奶/配方奶记录 + 间隔，计算下次喂食时间并可在到点时推送通知
          </Text>
          <Text style={styles.inputLabel}>喂食间隔（小时）</Text>
          <TextInput
            style={styles.input}
            placeholder="如 4"
            placeholderTextColor="#64748B"
            value={intervalHours}
            onChangeText={setIntervalHours}
            onBlur={handleIntervalBlur}
            keyboardType="number-pad"
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>到点提醒（需允许通知权限）</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderChange}
              trackColor={{ false: '#E2E8F0', true: '#99F6E4' }}
              thumbColor={reminderEnabled ? '#0F766E' : '#94A3B8'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#1E293B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 15,
    color: '#475569',
    flex: 1,
  },
});
