import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Switch,
  Keyboard,
  Image,
  Alert,
  Platform,
  Share,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HORIZONTAL_PADDING, MODAL_MAX_WIDTH } from '@/utils/layout';
import {
  Settings,
  Database,
  ChevronRight,
  Plus,
  Pencil,
  Info,
  RotateCcw,
} from 'lucide-react-native';
import { useBaby } from '@/contexts/BabyContext';
import { format } from 'date-fns';
import { Baby } from '@/types';
import { storage, isStorageUsingFallback } from '@/utils/storage';
import { getAgeText } from '@/utils/lunar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

type ModalMode = 'add' | 'edit';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentBaby, addBaby, refreshBabies } = useBaby();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [babyName, setBabyName] = useState('');
  const [birthDateStr, setBirthDateStr] = useState('');
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const ageText = useMemo(() => getAgeText(currentBaby), [currentBaby]);

  const parseBirthDateToIso = (): string => {
    const trimmed = birthDateStr.trim();
    const parsed = trimmed ? new Date(trimmed + 'T12:00:00.000Z') : null;
    if (parsed && !isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  const handleAddBaby = async () => {
    if (!babyName.trim()) return;
    try {
      const birthIso = parseBirthDateToIso();
      const newBaby: Baby = {
        id: Date.now().toString(),
        name: babyName.trim(),
        birthDate: birthIso + 'T12:00:00.000Z',
        motherName: motherName.trim() || undefined,
        fatherName: fatherName.trim() || undefined,
        photoUrl: pendingPhotoUrl || undefined,
      };
      await addBaby(newBaby);
      setBabyName('');
      setBirthDateStr(format(new Date(), 'yyyy-MM-dd'));
      setMotherName('');
      setFatherName('');
      setModalVisible(false);
      if (isStorageUsingFallback()) {
        Alert.alert('提示', '当前为临时存储（Expo Go 限制），关闭应用后数据会丢失。打包成正式 App 后数据会正常保存。');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert('添加失败：' + msg);
      } else {
        Alert.alert('添加失败', msg);
      }
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限', '请允许访问相册以选择宝宝头像。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const mime = result.assets[0].mimeType ?? 'image/jpeg';
      setPendingPhotoUrl(`data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentBaby || !babyName.trim()) return;
    try {
      const birthIso = parseBirthDateToIso();
      const updatedBaby: Baby = {
        ...currentBaby,
        name: babyName.trim(),
        birthDate: birthIso + 'T12:00:00.000Z',
        motherName: motherName.trim() || undefined,
        fatherName: fatherName.trim() || undefined,
        photoUrl: pendingPhotoUrl === null ? currentBaby.photoUrl : (pendingPhotoUrl || undefined),
      };
      await storage.saveBaby(updatedBaby);
      await refreshBabies();
      setModalVisible(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert('保存失败：' + msg);
      } else {
        Alert.alert('保存失败', msg);
      }
    }
  };

  const openAddBabyModal = () => {
    setModalMode('add');
    setBabyName('');
    setBirthDateStr(format(new Date(), 'yyyy-MM-dd'));
    setMotherName('');
    setFatherName('');
    setShowDatePicker(false);
    setPendingPhotoUrl(null);
    setModalVisible(true);
  };

  const openEditBabyModal = () => {
    if (!currentBaby) return;
    setModalMode('edit');
    setBabyName(currentBaby.name);
    const birth = new Date(currentBaby.birthDate);
    setBirthDateStr(format(birth, 'yyyy-MM-dd'));
    setMotherName(currentBaby.motherName || '');
    setFatherName(currentBaby.fatherName || '');
    setShowDatePicker(false);
    setPendingPhotoUrl(null);
    setModalVisible(true);
  };

  /** 导出全部数据为 JSON 备份：Web 端下载文件，App 端通过系统分享保存 */
  const handleBackup = async () => {
    try {
      const [
        babies,
        currentBabyId,
        feeds,
        diapers,
        growth,
        sleep,
        schedule,
        medicine,
        temperatures,
        giftLedger,
        feedIntervalHours,
        feedReminderEnabled,
      ] = await Promise.all([
        storage.getBabies(),
        storage.getCurrentBabyId(),
        storage.getFeeds(),
        storage.getDiapers(),
        storage.getGrowth(),
        storage.getSleep(),
        storage.getSchedule(),
        storage.getMedicine(),
        storage.getTemperatures(),
        storage.getGiftLedger(),
        storage.getFeedIntervalHours(),
        storage.getFeedReminderEnabled(),
      ]);
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: '宝宝记',
        babies,
        currentBabyId,
        feeds,
        diapers,
        growth,
        sleep,
        schedule,
        medicine,
        temperatures,
        giftLedger,
        feedIntervalHours,
        feedReminderEnabled,
      };
      const jsonStr = JSON.stringify(payload, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const name = `宝宝记备份_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        if (typeof window !== 'undefined') window.alert('备份文件已开始下载');
      } else {
        await Share.share({
          message: jsonStr,
          title: '宝宝记数据备份',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert('备份失败：' + msg);
      } else {
        Alert.alert('备份失败', msg);
      }
    }
  };

  const handleRestore = async () => {
    const raw = restoreJsonText.trim();
    if (!raw) {
      if (Platform.OS === 'web') window.alert('请粘贴备份 JSON 内容');
      else Alert.alert('提示', '请粘贴备份 JSON 内容');
      return;
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      if (Platform.OS === 'web') window.alert('JSON 格式错误，请确认粘贴的是完整备份内容');
      else Alert.alert('解析失败', 'JSON 格式错误，请确认粘贴的是完整备份内容');
      return;
    }
    if (!payload || (typeof payload.babies !== 'object' && !Array.isArray(payload.babies))) {
      if (Platform.OS === 'web') window.alert('无效备份：缺少 babies 等字段，请确认为宝宝记备份文件');
      else Alert.alert('无效备份', '缺少 babies 等字段，请确认为宝宝记备份文件');
      return;
    }
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('恢复将覆盖当前全部数据，确定继续？')) return;
    } else {
      const pressed = await new Promise<boolean>((resolve) => {
        Alert.alert('确认恢复', '恢复将覆盖当前全部数据，确定继续？', [
          { text: '取消', style: 'cancel', onPress: () => resolve(false) },
          { text: '确定恢复', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!pressed) return;
    }
    try {
      await storage.restoreFromBackup({
        babies: Array.isArray(payload.babies) ? (payload.babies as Baby[]) : [],
        currentBabyId: payload.currentBabyId != null ? String(payload.currentBabyId) : null,
        feeds: Array.isArray(payload.feeds) ? payload.feeds as never[] : [],
        diapers: Array.isArray(payload.diapers) ? payload.diapers as never[] : [],
        growth: Array.isArray(payload.growth) ? payload.growth as never[] : [],
        sleep: Array.isArray(payload.sleep) ? payload.sleep as never[] : [],
        schedule: Array.isArray(payload.schedule) ? payload.schedule as never[] : [],
        medicine: Array.isArray(payload.medicine) ? payload.medicine as never[] : [],
        temperatures: Array.isArray(payload.temperatures) ? payload.temperatures as never[] : [],
        giftLedger: Array.isArray(payload.giftLedger) ? payload.giftLedger as never[] : [],
        feedIntervalHours: Number(payload.feedIntervalHours) || 4,
        feedReminderEnabled: payload.feedReminderEnabled === true,
      });
      await refreshBabies();
      setRestoreModalVisible(false);
      setRestoreJsonText('');
      if (Platform.OS === 'web') window.alert('恢复成功，请返回首页查看');
      else Alert.alert('恢复成功', '数据已恢复，请返回首页查看');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (Platform.OS === 'web') window.alert('恢复失败：' + msg);
      else Alert.alert('恢复失败', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isStorageUsingFallback() ? (
          <View style={styles.fallbackBanner}>
            <Text style={styles.fallbackBannerText}>当前为临时存储，关闭应用后数据会丢失（Expo Go 限制）</Text>
          </View>
        ) : null}
        {currentBaby ? (
          <>
            <View style={styles.babyCard}>
              {currentBaby.photoUrl ? (
                <Image source={{ uri: currentBaby.photoUrl }} style={styles.babyAvatarImage} />
              ) : (
                <View style={styles.babyAvatar}>
                  <Text style={styles.babyAvatarText}>{(currentBaby.name || '?')[0]}</Text>
                </View>
              )}
              <View style={styles.babyInfo}>
                <Text style={styles.babyName}>{currentBaby.name}</Text>
                <Text style={styles.babyAge}>{ageText || '--'}</Text>
                <Text style={styles.babyNextFeed}>下次喂食请在首页查看</Text>
              </View>
              <TouchableOpacity
                style={styles.editBabyButton}
                onPress={openEditBabyModal}
              >
                <Pencil size={18} color="#0F766E" />
                <Text style={styles.editBabyButtonText}>编辑资料</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>父母信息</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>母亲</Text>
                <Text style={styles.infoValue}>
                  {currentBaby.motherName || '未设置'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>父亲</Text>
                <Text style={styles.infoValue}>
                  {currentBaby.fatherName || '未设置'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Settings size={20} color="#2DD4BF" />
                </View>
                <Text style={styles.menuItemText}>设置</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleBackup}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Database size={20} color="#FB923C" />
                </View>
                <Text style={styles.menuItemText}>数据备份</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setRestoreModalVisible(true)}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <RotateCcw size={20} color="#0D9488" />
                </View>
                <Text style={styles.menuItemText}>从备份恢复</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/about')}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Info size={20} color="#64748B" />
                </View>
                <Text style={styles.menuItemText}>关于</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

          </>
        ) : (
          <>
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>没有宝宝档案</Text>
              <Text style={styles.emptyText}>
                添加你的宝宝档案以开始
              </Text>
              <TouchableOpacity
                style={styles.addBabyButton}
                onPress={openAddBabyModal}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addBabyButtonText}>添加宝宝</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modalMode === 'edit' ? '编辑宝宝资料' : '添加宝宝'}
              </Text>

            <View style={styles.modalAvatarRow}>
              <TouchableOpacity style={styles.modalAvatarWrap} onPress={pickAvatar}>
                {(() => {
                  const displayUrl = pendingPhotoUrl !== null ? pendingPhotoUrl : (modalMode === 'edit' ? currentBaby?.photoUrl : undefined);
                  return displayUrl ? (
                    <Image source={{ uri: displayUrl }} style={styles.modalAvatarImage} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarPlaceholderText}>
                        {(babyName.trim() || currentBaby?.name || '?')[0]}
                      </Text>
                    </View>
                  );
                })()}
              </TouchableOpacity>
              <View style={styles.modalAvatarActions}>
                <TouchableOpacity style={styles.avatarActionBtn} onPress={pickAvatar}>
                  <Text style={styles.avatarActionBtnText}>上传头像</Text>
                </TouchableOpacity>
                {((modalMode === 'edit' && currentBaby?.photoUrl) || (pendingPhotoUrl !== null && pendingPhotoUrl !== '')) ? (
                  <TouchableOpacity
                    style={[styles.avatarActionBtn, styles.avatarActionBtnSecondary]}
                    onPress={() => setPendingPhotoUrl('')}
                  >
                    <Text style={styles.avatarActionBtnTextSecondary}>移除头像</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="宝宝名字"
              placeholderTextColor="#64748B"
              value={babyName}
              onChangeText={setBabyName}
            />

            <Text style={styles.inputLabel}>出生日期</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {birthDateStr.trim()
                  ? format(new Date(birthDateStr.trim() + 'T12:00:00'), 'yyyy年MM月dd日')
                  : '选择日期'}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={
                  birthDateStr.trim()
                    ? new Date(birthDateStr.trim() + 'T12:00:00')
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setBirthDateStr(format(date, 'yyyy-MM-dd'));
                }}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <Modal visible transparent animationType="slide">
                <View style={styles.pickerBackdrop}>
                  <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                    <View style={{ flex: 1 }} />
                  </TouchableWithoutFeedback>
                  <View style={styles.pickerSheet}>
                    <View style={styles.pickerSheetHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerSheetCancel}>取消</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerSheetTitle}>选择日期</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerSheetDone}>确定</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.pickerSheetContent}>
                      <DateTimePicker
                        value={
                          birthDateStr.trim()
                            ? new Date(birthDateStr.trim() + 'T12:00:00')
                            : new Date()
                        }
                        mode="date"
                        display="spinner"
                        locale="zh-CN"
                        themeVariant="light"
                        textColor="#1E293B"
                        onChange={(_, date) => date && setBirthDateStr(format(date, 'yyyy-MM-dd'))}
                        style={styles.bottomDateTimePicker}
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'web' && showDatePicker && (
              <TextInput
                style={styles.input}
                {...({ type: 'date' } as any)}
                value={birthDateStr || format(new Date(), 'yyyy-MM-dd')}
                onChangeText={(v) => {
                  setBirthDateStr(v);
                  setShowDatePicker(false);
                }}
                onBlur={() => setShowDatePicker(false)}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="母亲姓名 (可选)"
              placeholderTextColor="#64748B"
              value={motherName}
              onChangeText={setMotherName}
            />

            <TextInput
              style={styles.input}
              placeholder="父亲姓名 (可选)"
              placeholderTextColor="#64748B"
              value={fatherName}
              onChangeText={setFatherName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={modalMode === 'edit' ? handleSaveEdit : handleAddBaby}
              >
                <Text style={styles.saveButtonText}>
                  {modalMode === 'edit' ? '保存' : '添加'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={restoreModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>从备份恢复</Text>
              <Text style={styles.restoreHint}>
                请将备份 JSON 文件内容粘贴到下方（可从备份文件复制，或从分享保存的内容复制）
              </Text>
              <TextInput
                style={styles.restoreTextInput}
                placeholder='{"version":1,"app":"宝宝记","babies":[...'
                placeholderTextColor="#94A3B8"
                value={restoreJsonText}
                onChangeText={setRestoreJsonText}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setRestoreModalVisible(false);
                    setRestoreJsonText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleRestore}>
                  <Text style={styles.saveButtonText}>解析并恢复</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
  },
  fallbackBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderRadius: 8,
  },
  fallbackBannerText: {
    fontSize: 12,
    color: '#92400E',
  },
  babyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  babyAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  babyAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F766E',
  },
  babyAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  babyInfo: {
    flex: 1,
  },
  editBabyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
  },
  editBabyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F766E',
  },
  babyName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  babyAge: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  babyNextFeed: {
    fontSize: 13,
    color: '#0F766E',
    marginTop: 4,
  },
  babyLastMeal: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 15,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  addBabyButton: {
    backgroundColor: '#2DD4BF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addBabyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: MODAL_MAX_WIDTH,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
  },
  restoreHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 18,
  },
  restoreTextInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 140,
    maxHeight: 220,
    marginBottom: 16,
    color: '#1E293B',
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  modalAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#E0F2F1',
  },
  modalAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  modalAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F766E',
  },
  modalAvatarActions: {
    flex: 1,
    flexDirection: 'column',
    gap: 6,
  },
  avatarActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#14B8A6',
    alignSelf: 'flex-start',
  },
  avatarActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarActionBtnSecondary: {
    backgroundColor: 'transparent',
    marginTop: 6,
  },
  avatarActionBtnTextSecondary: {
    fontSize: 13,
    color: '#64748B',
  },
  inputLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D7377',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerSheetCancel: {
    fontSize: 16,
    color: '#64748B',
  },
  pickerSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerSheetDone: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14B8A6',
  },
  pickerSheetContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDateTimePicker: {
    height: 200,
  },
  lunarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  lunarLabel: {
    fontSize: 15,
    color: '#475569',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2DD4BF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
