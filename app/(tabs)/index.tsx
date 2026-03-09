import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HORIZONTAL_PADDING, MODAL_MAX_WIDTH } from '@/utils/layout';
import { format, addHours, differenceInMinutes, subDays, addDays, isToday } from 'date-fns';
import { getAgeText } from '@/utils/lunar';
import { scheduleNextFeedReminder, cancelNextFeedReminder } from '@/utils/feedReminder';
import { Milk, Utensils, Baby as BabyIcon, TrendingUp, Moon, Pill, Trash2, Palette, Layers, Thermometer, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useBaby } from '@/contexts/BabyContext';
import { storage } from '@/utils/storage';
import { FeedRecord, DiaperRecord, SleepRecord, GrowthRecord, MedicineRecord, TemperatureRecord } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';

// 日期选择器使用中文，使月份显示为一月、二月等
const datePickerLocale = 'zh-CN';

export default function HomeScreen() {
  const { currentBaby } = useBaby();
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [initialTab, setInitialTab] = useState<'feed' | 'solid' | 'diaper' | 'sleep' | 'growth' | 'medicine' | 'temperature'>('feed');
  const [editingRecord, setEditingRecord] = useState<
    | { type: 'feed'; data: FeedRecord }
    | { type: 'diaper'; data: DiaperRecord }
    | { type: 'sleep'; data: SleepRecord }
    | { type: 'medicine'; data: MedicineRecord }
    | { type: 'temperature'; data: TemperatureRecord }
    | null
  >(null);
  const [todaysFeeds, setTodaysFeeds] = useState<FeedRecord[]>([]);
  const [todaysDiapers, setTodaysDiapers] = useState<DiaperRecord[]>([]);
  const [todaysSleep, setTodaysSleep] = useState<SleepRecord[]>([]);
  const [todaysMedicine, setTodaysMedicine] = useState<MedicineRecord[]>([]);
  const [todaysTemperatures, setTodaysTemperatures] = useState<TemperatureRecord[]>([]);
  const [feedIntervalHours, setFeedIntervalHours] = useState(4);
  const [feedReminderEnabled, setFeedReminderEnabled] = useState(false);
  /** 列表当前查看的日期（默认今天），用于左右箭头切换 */
  const [listViewDate, setListViewDate] = useState<Date>(() => new Date());
  /** 非“今日”时，该日期的记录（今日用 todays*） */
  const [listViewFeeds, setListViewFeeds] = useState<FeedRecord[]>([]);
  const [listViewDiapers, setListViewDiapers] = useState<DiaperRecord[]>([]);
  const [listViewSleep, setListViewSleep] = useState<SleepRecord[]>([]);
  const [listViewMedicine, setListViewMedicine] = useState<MedicineRecord[]>([]);
  const [listViewTemperatures, setListViewTemperatures] = useState<TemperatureRecord[]>([]);

  const loadTodaysData = useCallback(async () => {
    if (!currentBaby) return;

    const [allFeeds, allDiapers, allSleep, allMedicine, allTemperatures, intervalHours, reminderOn] = await Promise.all([
      storage.getFeeds(),
      storage.getDiapers(),
      storage.getSleep(),
      storage.getMedicine(),
      storage.getTemperatures(),
      storage.getFeedIntervalHours(),
      storage.getFeedReminderEnabled(),
    ]);
    setFeedIntervalHours(intervalHours);
    setFeedReminderEnabled(reminderOn);

    const today = format(new Date(), 'yyyy-MM-dd');
    const feeds = allFeeds.filter(
      (f) =>
        f.babyId === currentBaby.id &&
        format(new Date(f.timestamp), 'yyyy-MM-dd') === today
    );
    const diapers = allDiapers.filter(
      (d) =>
        d.babyId === currentBaby.id &&
        format(new Date(d.timestamp), 'yyyy-MM-dd') === today
    );
    const sleep = allSleep.filter(
      (s) =>
        s.babyId === currentBaby.id &&
        format(new Date(s.startTime), 'yyyy-MM-dd') === today
    );
    const medicine = allMedicine.filter(
      (m) =>
        m.babyId === currentBaby.id &&
        format(new Date(m.timestamp), 'yyyy-MM-dd') === today
    );
    const temperatures = allTemperatures.filter(
      (t) =>
        t.babyId === currentBaby.id &&
        format(new Date(t.timestamp), 'yyyy-MM-dd') === today
    );

    setTodaysFeeds(feeds);
    setTodaysDiapers(diapers);
    setTodaysSleep(sleep);
    setTodaysMedicine(medicine);
    setTodaysTemperatures(temperatures);
  }, [currentBaby]);

  /** 加载指定日期的记录，用于列表切换日期（仅非今日时写入 listView*） */
  const loadDataForDate = useCallback(
    async (date: Date) => {
      if (!currentBaby) return;
      const dateStr = format(date, 'yyyy-MM-dd');
      const [allFeeds, allDiapers, allSleep, allMedicine, allTemperatures] = await Promise.all([
        storage.getFeeds(),
        storage.getDiapers(),
        storage.getSleep(),
        storage.getMedicine(),
        storage.getTemperatures(),
      ]);
      const feeds = allFeeds.filter(
        (f) =>
          f.babyId === currentBaby.id &&
          format(new Date(f.timestamp), 'yyyy-MM-dd') === dateStr
      );
      const diapers = allDiapers.filter(
        (d) =>
          d.babyId === currentBaby.id &&
          format(new Date(d.timestamp), 'yyyy-MM-dd') === dateStr
      );
      const sleep = allSleep.filter(
        (s) =>
          s.babyId === currentBaby.id &&
          format(new Date(s.startTime), 'yyyy-MM-dd') === dateStr
      );
      const medicine = allMedicine.filter(
        (m) =>
          m.babyId === currentBaby.id &&
          format(new Date(m.timestamp), 'yyyy-MM-dd') === dateStr
      );
      const temperatures = allTemperatures.filter(
        (t) =>
          t.babyId === currentBaby.id &&
          format(new Date(t.timestamp), 'yyyy-MM-dd') === dateStr
      );
      setListViewFeeds(feeds);
      setListViewDiapers(diapers);
      setListViewSleep(sleep);
      setListViewMedicine(medicine);
      setListViewTemperatures(temperatures);
    },
    [currentBaby]
  );

  useEffect(() => {
    loadTodaysData();
  }, [loadTodaysData]);

  useFocusEffect(
    useCallback(() => {
      loadTodaysData();
      if (!isToday(listViewDate)) loadDataForDate(listViewDate);
    }, [loadTodaysData, listViewDate, loadDataForDate])
  );

  const ageText = useMemo(() => getAgeText(currentBaby), [currentBaby]);

  /** 最近一次奶/配方奶（不含辅食），用于计算下次喂食时间 */
  const lastMilkFormulaFeed = useMemo(() => {
    const milkFeeds = todaysFeeds
      .filter((f) => f.type === 'milk' || f.type === 'formula')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return milkFeeds[0] ?? null;
  }, [todaysFeeds]);

  /** 下次喂食时间（上次进食 + 间隔小时），仅显示时间 HH:mm */
  const nextFeedTime = useMemo(() => {
    if (!lastMilkFormulaFeed) return '--';
    const next = addHours(new Date(lastMilkFormulaFeed.timestamp), feedIntervalHours);
    return format(next, 'HH:mm');
  }, [lastMilkFormulaFeed, feedIntervalHours]);

  /** 下次喂食的完整时间点，用于预约通知 */
  const nextFeedDate = useMemo(() => {
    if (!lastMilkFormulaFeed) return null;
    return addHours(new Date(lastMilkFormulaFeed.timestamp), feedIntervalHours);
  }, [lastMilkFormulaFeed, feedIntervalHours]);

  /** 最近一次进食（任意类型），用于展示「上次进食」 */
  const lastFeed = useMemo(() => {
    const feeds = [...todaysFeeds].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return feeds[0] ?? null;
  }, [todaysFeeds]);

  useEffect(() => {
    if (!feedReminderEnabled || !nextFeedDate || nextFeedDate.getTime() <= Date.now()) {
      cancelNextFeedReminder();
      return;
    }
    scheduleNextFeedReminder(nextFeedDate);
  }, [feedReminderEnabled, nextFeedDate]);

  /** 今日按分类汇总：奶量(ml)、辅食次数、尿布次数、睡眠总分钟、健康次数、体温次数 */
  const todayStats = useMemo(() => {
    const milkTotalMl = todaysFeeds
      .filter((f) => f.type === 'milk' || f.type === 'formula')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const solidCount = todaysFeeds.filter((f) => f.type === 'solid').length;
    const diaperCount = todaysDiapers.length;
    const sleepTotalMinutes = todaysSleep.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const medicineCount = todaysMedicine.length;
    const temperatureCount = todaysTemperatures.length;
    const lastTemperature = todaysTemperatures.length > 0
      ? todaysTemperatures.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;
    const sleepText =
      sleepTotalMinutes >= 60
        ? `${Math.floor(sleepTotalMinutes / 60)}h ${sleepTotalMinutes % 60}m`
        : `${sleepTotalMinutes}m`;
    return { milkTotalMl, solidCount, diaperCount, sleepTotalMinutes, sleepText, medicineCount, temperatureCount, lastTemperature };
  }, [todaysFeeds, todaysDiapers, todaysSleep, todaysMedicine, todaysTemperatures]);

  /** 今日状态统一按时间排序：时间越靠近当前越在上（倒序） */
  const sortedTodayRecords = useMemo(() => {
    type Item =
      | { type: 'feed'; data: FeedRecord }
      | { type: 'diaper'; data: DiaperRecord }
      | { type: 'sleep'; data: SleepRecord }
      | { type: 'medicine'; data: MedicineRecord }
      | { type: 'temperature'; data: TemperatureRecord };
    const getTime = (item: Item) =>
      item.type === 'sleep'
        ? new Date(item.data.startTime).getTime()
        : new Date((item.data as FeedRecord | DiaperRecord | MedicineRecord | TemperatureRecord).timestamp).getTime();
    const items: Item[] = [
      ...todaysFeeds.map((data) => ({ type: 'feed' as const, data })),
      ...todaysDiapers.map((data) => ({ type: 'diaper' as const, data })),
      ...todaysSleep.map((data) => ({ type: 'sleep' as const, data })),
      ...todaysMedicine.map((data) => ({ type: 'medicine' as const, data })),
      ...todaysTemperatures.map((data) => ({ type: 'temperature' as const, data })),
    ];
    items.sort((a, b) => getTime(b) - getTime(a));
    return items;
  }, [todaysFeeds, todaysDiapers, todaysSleep, todaysMedicine, todaysTemperatures]);

  /** 列表当前查看日期的记录（今日用 todays*，其他日期用 listView*），按时间倒序 */
  const sortedListRecords = useMemo(() => {
    type Item =
      | { type: 'feed'; data: FeedRecord }
      | { type: 'diaper'; data: DiaperRecord }
      | { type: 'sleep'; data: SleepRecord }
      | { type: 'medicine'; data: MedicineRecord }
      | { type: 'temperature'; data: TemperatureRecord };
    const getTime = (item: Item) =>
      item.type === 'sleep'
        ? new Date(item.data.startTime).getTime()
        : new Date((item.data as FeedRecord | DiaperRecord | MedicineRecord | TemperatureRecord).timestamp).getTime();
    const feeds = isToday(listViewDate) ? todaysFeeds : listViewFeeds;
    const diapers = isToday(listViewDate) ? todaysDiapers : listViewDiapers;
    const sleep = isToday(listViewDate) ? todaysSleep : listViewSleep;
    const medicine = isToday(listViewDate) ? todaysMedicine : listViewMedicine;
    const temperatures = isToday(listViewDate) ? todaysTemperatures : listViewTemperatures;
    const items: Item[] = [
      ...feeds.map((data) => ({ type: 'feed' as const, data })),
      ...diapers.map((data) => ({ type: 'diaper' as const, data })),
      ...sleep.map((data) => ({ type: 'sleep' as const, data })),
      ...medicine.map((data) => ({ type: 'medicine' as const, data })),
      ...temperatures.map((data) => ({ type: 'temperature' as const, data })),
    ];
    items.sort((a, b) => getTime(b) - getTime(a));
    return items;
  }, [
    listViewDate,
    todaysFeeds,
    todaysDiapers,
    todaysSleep,
    todaysMedicine,
    todaysTemperatures,
    listViewFeeds,
    listViewDiapers,
    listViewSleep,
    listViewMedicine,
    listViewTemperatures,
  ]);

  const openRecordModal = (tab: 'feed' | 'solid' | 'diaper' | 'sleep' | 'growth' | 'medicine' | 'temperature') => {
    setEditingRecord(null);
    setInitialTab(tab);
    setRecordModalVisible(true);
  };

  const openEditRecord = (
    record: { type: 'feed'; data: FeedRecord } | { type: 'diaper'; data: DiaperRecord } | { type: 'sleep'; data: SleepRecord } | { type: 'medicine'; data: MedicineRecord } | { type: 'temperature'; data: TemperatureRecord }
  ) => {
    setEditingRecord(record);
    const tab = record.type === 'feed' ? ((record.data as FeedRecord).type === 'solid' ? 'solid' : 'feed') : record.type;
    setInitialTab(tab);
    setRecordModalVisible(true);
  };

  const performDelete = async (
    type: 'feed' | 'diaper' | 'sleep' | 'medicine' | 'temperature',
    id: string
  ) => {
    if (type === 'feed') await storage.deleteFeed(id);
    else if (type === 'diaper') await storage.deleteDiaper(id);
    else if (type === 'sleep') await storage.deleteSleep(id);
    else if (type === 'medicine') await storage.deleteMedicine(id);
    else await storage.deleteTemperature(id);
    loadTodaysData();
    if (!isToday(listViewDate)) loadDataForDate(listViewDate);
  };

  const handleDeleteRecord = (
    type: 'feed' | 'diaper' | 'sleep' | 'medicine' | 'temperature',
    id: string,
    label: string
  ) => {
    const message = `确定要删除这条「${label}」记录吗？`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`删除记录\n\n${message}`)) {
        performDelete(type, id);
      }
      return;
    }
    Alert.alert('删除记录', message, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => performDelete(type, id) },
    ]);
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
        {currentBaby ? (
          <>
            <View style={styles.babyCard}>
              {currentBaby.photoUrl ? (
                <Image source={{ uri: currentBaby.photoUrl }} style={styles.babyAvatarImage} />
              ) : (
                <View style={styles.babyAvatar}>
                  <Text style={styles.babyAvatarText}>{currentBaby.name[0]}</Text>
                </View>
              )}
              <View style={styles.babyInfo}>
                <Text style={styles.babyName}>{currentBaby.name}</Text>
                <Text style={styles.babyAge}>{ageText || '--'}</Text>
                <Text style={styles.babyNextFeed}>下次喂食: {nextFeedTime}（间隔 {feedIntervalHours} 小时）</Text>
                {lastFeed && (
                  <Text style={styles.babyLastMeal}>
                    上次进食:{' '}
                    {lastFeed.type === 'milk'
                      ? '母乳'
                      : lastFeed.type === 'formula'
                      ? '配方奶'
                      : '辅食'}{' '}
                    ({lastFeed.amount} {lastFeed.unit}
                    {lastFeed.notes ? `, ${lastFeed.notes}` : ''}) @{' '}
                    {format(new Date(lastFeed.timestamp), 'HH:mm')}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.dailyStatsSection}>
              <Text style={styles.dailyStatsTitle}>今日统计</Text>
              <View style={styles.dailyStatsGrid}>
                <TouchableOpacity
                  style={[styles.dailyStatCard, styles.dailyStatCardMint]}
                  onPress={() => openRecordModal('feed')}
                  activeOpacity={0.8}
                >
                  <Milk size={20} color="#0D9488" />
                  <Text style={styles.dailyStatLabel}>奶量</Text>
                  <Text style={styles.dailyStatValue}>{todayStats.milkTotalMl} ml</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dailyStatCard, styles.dailyStatCardBlue]}
                  onPress={() => openRecordModal('diaper')}
                  activeOpacity={0.8}
                >
                  <BabyIcon size={20} color="#2563EB" />
                  <Text style={styles.dailyStatLabel}>尿布</Text>
                  <Text style={styles.dailyStatValue}>{todayStats.diaperCount} 次</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dailyStatCard, styles.dailyStatCardYellow]}
                  onPress={() => openRecordModal('solid')}
                  activeOpacity={0.8}
                >
                  <Utensils size={20} color="#B45309" />
                  <Text style={styles.dailyStatLabel}>辅食</Text>
                  <Text style={styles.dailyStatValue}>{todayStats.solidCount} 次</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dailyStatCard, styles.dailyStatCardPurple]}
                  onPress={() => openRecordModal('sleep')}
                  activeOpacity={0.8}
                >
                  <Moon size={20} color="#6D28D9" />
                  <Text style={styles.dailyStatLabel}>睡眠</Text>
                  <Text style={styles.dailyStatValue}>{todayStats.sleepText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dailyStatCard, styles.dailyStatCardViolet]}
                  onPress={() => openRecordModal('medicine')}
                  activeOpacity={0.8}
                >
                  <Pill size={20} color="#7C3AED" />
                  <Text style={styles.dailyStatLabel}>健康</Text>
                  <Text style={styles.dailyStatValue}>{todayStats.medicineCount} 次</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dailyStatCard, styles.dailyStatCardCoral]}
                  onPress={() => openRecordModal('temperature')}
                  activeOpacity={0.8}
                >
                  <Thermometer size={20} color="#E11D48" />
                  <Text style={styles.dailyStatLabel}>体温</Text>
                  <Text style={styles.dailyStatValue}>
                    {todayStats.lastTemperature ? `${todayStats.lastTemperature.temperature}°C` : `${todayStats.temperatureCount} 次`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {(isToday(listViewDate) ? sortedTodayRecords.length > 0 : true) && (
            <View style={styles.logSection}>
              <View style={styles.logHeader}>
                <TouchableOpacity
                  style={styles.logHeaderArrow}
                  onPress={() => {
                    const newDate = subDays(listViewDate, 1);
                    setListViewDate(newDate);
                    loadDataForDate(newDate);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ChevronLeft size={24} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.logTitleCenter} numberOfLines={1}>
                  {isToday(listViewDate) ? '今日' : format(listViewDate, 'yyyy年MM月dd日')}
                </Text>
                <TouchableOpacity
                  style={styles.logHeaderArrow}
                  onPress={() => {
                    const next = addDays(listViewDate, 1);
                    const today = new Date();
                    const todayStr = format(today, 'yyyy-MM-dd');
                    const nextStr = format(next, 'yyyy-MM-dd');
                    const newDate = nextStr > todayStr ? new Date(todayStr + 'T12:00:00') : next;
                    setListViewDate(newDate);
                    if (!isToday(newDate)) loadDataForDate(newDate);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isToday(listViewDate)}
                >
                  <ChevronRight size={24} color={isToday(listViewDate) ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {sortedListRecords.map((item) => {
                if (item.type === 'feed') {
                  const feed = item.data;
                  const feedLabel = feed.type === 'milk' ? '母乳' : feed.type === 'formula' ? '配方奶' : '辅食';
                  return (
                    <View key={`feed-${feed.id}`} style={styles.logItem}>
                      <TouchableOpacity
                        style={styles.logItemContent}
                        onPress={() => openEditRecord({ type: 'feed', data: feed })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.logTime}>
                          {format(new Date(feed.timestamp), 'HH:mm')}
                        </Text>
                        <View style={styles.logContent}>
                          {feed.type === 'solid' ? (
                            <Utensils size={20} color="#F59E0B" />
                          ) : (
                            <Milk size={20} color="#2DD4BF" />
                          )}
                          <View style={styles.logDetails}>
                            <Text style={styles.logLabel}>
                              {feed.type === 'milk'
                                ? '母乳喂养'
                                : feed.type === 'formula'
                                ? '配方奶'
                                : '辅食'}
                            </Text>
                            <Text style={styles.logDescription}>
                              {feed.type === 'solid'
                                ? [
                                    feed.notes,
                                    `${feed.amount} ${feed.unit}`,
                                    feed.solidReaction === 'like' ? '喜欢' : feed.solidReaction === 'neutral' ? '一般' : feed.solidReaction === 'dislike' ? '讨厌' : null,
                                  ].filter(Boolean).join(' · ')
                                : `${feed.amount} ${feed.unit}${feed.type === 'milk' ? `, ${feed.side === 'left' ? '左侧' : feed.side === 'right' ? '右侧' : '两侧'}` : ''}`}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.logDeleteBtn}
                        onPress={() => handleDeleteRecord('feed', feed.id, feedLabel)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                }
                if (item.type === 'diaper') {
                  const diaper = item.data;
                  return (
                    <View key={`diaper-${diaper.id}`} style={styles.logItem}>
                      <TouchableOpacity
                        style={styles.logItemContent}
                        onPress={() => openEditRecord({ type: 'diaper', data: diaper })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.logTime}>
                          {format(new Date(diaper.timestamp), 'HH:mm')}
                        </Text>
                        <View style={styles.logContent}>
                          <BabyIcon size={20} color="#60A5FA" />
                          <View style={styles.logDetails}>
                            <Text style={styles.logLabel}>尿布</Text>
                            <Text style={styles.logDescription}>
                              {[
                                diaper.type === 'wet' ? '嘘嘘' : diaper.type === 'dirty' ? '便便' : '嘘嘘+便便',
                                diaper.stoolColor && (diaper.type === 'dirty' || diaper.type === 'both')
                                  ? `颜色: ${diaper.stoolColor}`
                                  : null,
                                diaper.stoolForm && (diaper.type === 'dirty' || diaper.type === 'both')
                                  ? `形态: ${diaper.stoolForm}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.logDeleteBtn}
                        onPress={() => handleDeleteRecord('diaper', diaper.id, '尿布')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                }
                if (item.type === 'sleep') {
                  const sleep = item.data;
                  return (
                    <View key={`sleep-${sleep.id}`} style={styles.logItem}>
                      <TouchableOpacity
                        style={styles.logItemContent}
                        onPress={() => openEditRecord({ type: 'sleep', data: sleep })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.logTime}>
                          {format(new Date(sleep.startTime), 'HH:mm')}
                        </Text>
                        <View style={styles.logContent}>
                          <Moon size={20} color="#818CF8" />
                          <View style={styles.logDetails}>
                            <Text style={styles.logLabel}>睡眠</Text>
                            <Text style={styles.logDescription}>
                              时长: {Math.floor(sleep.durationMinutes / 60)} 小时 {sleep.durationMinutes % 60} 分钟
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.logDeleteBtn}
                        onPress={() => handleDeleteRecord('sleep', sleep.id, '睡眠')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                }
                if (item.type === 'temperature') {
                  const temp = item.data;
                  return (
                    <View key={`temperature-${temp.id}`} style={styles.logItem}>
                      <TouchableOpacity
                        style={styles.logItemContent}
                        onPress={() => openEditRecord({ type: 'temperature', data: temp })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.logTime}>
                          {format(new Date(temp.timestamp), 'HH:mm')}
                        </Text>
                        <View style={styles.logContent}>
                          <Thermometer size={20} color="#E11D48" />
                          <View style={styles.logDetails}>
                            <Text style={styles.logLabel}>体温</Text>
                            <Text style={styles.logDescription}>
                              {temp.temperature}°C{temp.notes ? ` · ${temp.notes}` : ''}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.logDeleteBtn}
                        onPress={() => handleDeleteRecord('temperature', temp.id, '体温')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                }
                const med = item.data;
                return (
                  <View key={`medicine-${med.id}`} style={styles.logItem}>
                    <TouchableOpacity
                      style={styles.logItemContent}
                      onPress={() => openEditRecord({ type: 'medicine', data: med })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.logTime}>
                        {format(new Date(med.timestamp), 'HH:mm')}
                      </Text>
                      <View style={styles.logContent}>
                        <Pill size={20} color="#A78BFA" />
                        <View style={styles.logDetails}>
                          <Text style={styles.logLabel}>健康</Text>
                          <Text style={styles.logDescription}>
                            {med.name} {med.amount} {med.unit}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.logDeleteBtn}
                      onPress={() => handleDeleteRecord('medicine', med.id, '健康')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>未找到宝宝档案</Text>
            <Text style={styles.emptySubtext}>
              请在个人资料标签中添加宝宝
            </Text>
          </View>
        )}
      </ScrollView>

      <UnifiedRecordModal
        visible={recordModalVisible}
        onClose={() => {
          setRecordModalVisible(false);
          setEditingRecord(null);
        }}
        onSave={() => {
          loadTodaysData();
          if (!isToday(listViewDate)) loadDataForDate(listViewDate);
        }}
        initialTab={initialTab}
        editingRecord={editingRecord}
        onClearEditing={() => setEditingRecord(null)}
      />
    </SafeAreaView>
  );
}

function UnifiedRecordModal({
  visible,
  onClose,
  onSave,
  initialTab,
  editingRecord,
  onClearEditing,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initialTab: 'feed' | 'solid' | 'diaper' | 'sleep' | 'growth' | 'medicine' | 'temperature';
  editingRecord: { type: 'feed'; data: FeedRecord } | { type: 'diaper'; data: DiaperRecord } | { type: 'sleep'; data: SleepRecord } | { type: 'medicine'; data: MedicineRecord } | { type: 'temperature'; data: TemperatureRecord } | null;
  onClearEditing?: () => void;
}) {
  const { currentBaby } = useBaby();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // 记录日期时间（底部弹出选择）
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Feed state
  const [amount, setAmount] = useState('');
  const [feedType, setFeedType] = useState<'milk' | 'formula'>('milk');
  const [feedSide, setFeedSide] = useState<'left' | 'right' | 'both'>('both');

  // Diaper state
  const [diaperType, setDiaperType] = useState<'wet' | 'dirty' | 'both'>('wet');
  const [diaperStoolColor, setDiaperStoolColor] = useState('');
  const [diaperStoolForm, setDiaperStoolForm] = useState('');

  // Sleep state：开始时间、结束时间（未设置则时长为 0）
  const [sleepStartTime, setSleepStartTime] = useState(() => new Date());
  const [sleepEndTime, setSleepEndTime] = useState<Date | null>(null);
  /** 当前日期/时间选择器在编辑哪一项：记录时间 / 睡眠开始 / 睡眠结束 */
  const [pickerTarget, setPickerTarget] = useState<'record' | 'sleepStart' | 'sleepEnd'>('record');

  // Solid state
  const [solidFood, setSolidFood] = useState('');
  const [solidReaction, setSolidReaction] = useState<'like' | 'neutral' | 'dislike'>('like');

  // Growth state
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Medicine state（健康/营养补给）
  const [medicineName, setMedicineName] = useState('');
  const [medicineAmount, setMedicineAmount] = useState('');
  const [medicineUnit, setMedicineUnit] = useState('粒');

  // Temperature state（体温，单位 ℃）
  const [temperatureValue, setTemperatureValue] = useState('');

  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        const tab = editingRecord.type === 'feed'
          ? ((editingRecord.data as FeedRecord).type === 'solid' ? 'solid' : 'feed')
          : editingRecord.type;
        setActiveTab(tab);
        if (editingRecord.type === 'feed') {
          const f = editingRecord.data as FeedRecord;
          setSelectedTime(new Date(f.timestamp));
          setAmount(String(f.amount));
          setFeedType(f.type === 'formula' ? 'formula' : 'milk');
          setFeedSide((f.side as 'left' | 'right' | 'both') ?? 'both');
          setSolidFood(f.notes ?? '');
          setSolidReaction(f.solidReaction ?? 'like');
        } else if (editingRecord.type === 'diaper') {
          const d = editingRecord.data as DiaperRecord;
          setSelectedTime(new Date(d.timestamp));
          setDiaperType(d.type);
          setDiaperStoolColor(d.stoolColor ?? '');
          setDiaperStoolForm(d.stoolForm ?? '');
        } else if (editingRecord.type === 'sleep') {
          const s = editingRecord.data as SleepRecord;
          setSleepStartTime(new Date(s.startTime));
          setSleepEndTime(s.durationMinutes > 0 ? new Date(new Date(s.startTime).getTime() + s.durationMinutes * 60000) : null);
        } else if (editingRecord.type === 'temperature') {
          const t = editingRecord.data as TemperatureRecord;
          setSelectedTime(new Date(t.timestamp));
          setTemperatureValue(String(t.temperature));
        } else {
          const m = editingRecord.data as MedicineRecord;
          setSelectedTime(new Date(m.timestamp));
          setMedicineName(m.name);
          setMedicineAmount(String(m.amount));
          setMedicineUnit(m.unit);
        }
      } else {
        const now = new Date();
        setActiveTab(initialTab);
        setSelectedTime(now);
        setAmount('');
        setFeedType('milk');
        setFeedSide('both');
        setDiaperType('wet');
        setDiaperStoolColor('');
        setDiaperStoolForm('');
        setSleepStartTime(now);
        setSleepEndTime(null);
        setSolidFood('');
        setSolidReaction('like');
        setHeight('');
        setWeight('');
        setMedicineName('');
        setMedicineAmount('');
        setMedicineUnit('粒');
        setTemperatureValue('');
      }
    }
  }, [visible, initialTab, editingRecord]);

  // 切换 tab 时重置当前表单内容（编辑模式下不重置，保留预填）
  useEffect(() => {
    if (!visible || editingRecord) return;
    setAmount('');
    setFeedType('milk');
    setFeedSide('both');
    setDiaperType('wet');
    setDiaperStoolColor('');
    setDiaperStoolForm('');
    const now = new Date();
    setSleepStartTime(now);
    setSleepEndTime(null);
    setSolidFood('');
    setSolidReaction('like');
    setHeight('');
    setWeight('');
    setMedicineName('');
    setMedicineAmount('');
    setMedicineUnit('粒');
    setTemperatureValue('');
  }, [activeTab, visible]);

  /** 保存时使用当前选择的日期时间 */
  const getSaveTimestamp = () => selectedTime.toISOString();

  const handleSave = async () => {
    if (!currentBaby) return;

    const isEdit = editingRecord !== null;
    if (activeTab === 'feed') {
      if (!amount) return;
      const feed: FeedRecord = {
        id: isEdit && editingRecord.type === 'feed' ? editingRecord.data.id : Date.now().toString(),
        babyId: currentBaby.id,
        type: feedType,
        amount: parseFloat(amount),
        unit: 'ml',
        side: feedType === 'milk' ? feedSide : undefined,
        timestamp: getSaveTimestamp()
      };
      if (isEdit && editingRecord.type === 'feed') await storage.updateFeed(feed);
      else await storage.saveFeed(feed);
    } else if (activeTab === 'diaper') {
      const diaper: DiaperRecord = {
        id: isEdit && editingRecord.type === 'diaper' ? editingRecord.data.id : Date.now().toString(),
        babyId: currentBaby.id,
        type: diaperType,
        timestamp: getSaveTimestamp(),
        ...((diaperType === 'dirty' || diaperType === 'both') && {
          ...(diaperStoolColor ? { stoolColor: diaperStoolColor } : {}),
          ...(diaperStoolForm ? { stoolForm: diaperStoolForm } : {}),
        }),
      };
      if (isEdit && editingRecord.type === 'diaper') await storage.updateDiaper(diaper);
      else await storage.saveDiaper(diaper);
    } else if (activeTab === 'sleep') {
      const durationMinutes = sleepEndTime
        ? Math.max(0, differenceInMinutes(sleepEndTime, sleepStartTime))
        : 0;

      const sleep: SleepRecord = {
        id: isEdit && editingRecord.type === 'sleep' ? editingRecord.data.id : Date.now().toString(),
        babyId: currentBaby.id,
        startTime: sleepStartTime.toISOString(),
        durationMinutes,
      };
      if (isEdit && editingRecord.type === 'sleep') await storage.updateSleep(sleep);
      else await storage.saveSleep(sleep);
    } else if (activeTab === 'solid') {
      const amountNum = parseFloat(amount || '0');
      if (!solidFood.trim() && amountNum <= 0) return;
      const feed: FeedRecord = {
        id: isEdit && editingRecord.type === 'feed' ? editingRecord.data.id : Date.now().toString(),
        babyId: currentBaby.id,
        type: 'solid',
        amount: amountNum || 0,
        unit: '份',
        timestamp: getSaveTimestamp(),
        notes: solidFood.trim() || undefined,
        solidReaction,
      };
      if (isEdit && editingRecord.type === 'feed') await storage.updateFeed(feed);
      else await storage.saveFeed(feed);
    } else if (activeTab === 'growth') {
      const weightNum = weight ? parseFloat(weight) : undefined;
      const heightNum = height ? parseFloat(height) : undefined;
      const hasWeight = weightNum != null && !isNaN(weightNum);
      const hasHeight = heightNum != null && !isNaN(heightNum);
      if (!hasWeight && !hasHeight) return;
      const growth: GrowthRecord = {
        id: Date.now().toString(),
        babyId: currentBaby.id,
        weight: hasWeight ? weightNum : undefined,
        height: hasHeight ? heightNum : undefined,
        timestamp: getSaveTimestamp(),
      };
      await storage.saveGrowth(growth);
    } else if (activeTab === 'medicine') {
      if (!medicineName.trim()) return;
      const amountNum = parseFloat(medicineAmount || '0');
      const record: MedicineRecord = {
        id: isEdit && editingRecord.type === 'medicine' ? editingRecord.data.id : Date.now().toString(),
        babyId: currentBaby.id,
        name: medicineName.trim(),
        amount: amountNum || 1,
        unit: medicineUnit || '粒',
        timestamp: getSaveTimestamp(),
      };
      if (isEdit && editingRecord.type === 'medicine') await storage.updateMedicine(record);
      else await storage.saveMedicine(record);
    } else if (activeTab === 'temperature') {
      const tempNum = parseFloat(temperatureValue?.replace(/,/g, '.') || '');
      if (Number.isNaN(tempNum)) return;
      const record: TemperatureRecord = {
        id: isEdit && editingRecord.type === 'temperature' ? editingRecord.data.id : Date.now().toString(),
        babyId: currentBaby.id,
        temperature: tempNum,
        unit: 'celsius',
        timestamp: getSaveTimestamp(),
      };
      if (isEdit && editingRecord.type === 'temperature') await storage.updateTemperature(record);
      else await storage.saveTemperature(record);
    }
    onSave();
    onClose();
  };

  const tabs = [
    { key: 'feed', icon: Milk, label: '喂食' },
    { key: 'solid', icon: Utensils, label: '辅食' },
    { key: 'diaper', icon: BabyIcon, label: '尿布' },
    { key: 'sleep', icon: Moon, label: '睡眠' },
    { key: 'growth', icon: TrendingUp, label: '成长' },
    { key: 'medicine', icon: Pill, label: '健康' },
    { key: 'temperature', icon: Thermometer, label: '体温' },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>记录{tabs.find(t => t.key === activeTab)?.label}</Text>

          <View style={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  activeTab === tab.key && styles.tabButtonActive,
                ]}
                onPress={() => {
                  setActiveTab(tab.key);
                  onClearEditing?.();
                }}
              >
                <tab.icon
                  size={20}
                  color={activeTab === tab.key ? '#0F766E' : '#94A3B8'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'feed' && (
            <>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    feedType === 'milk' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFeedType('milk')}
                >
                  <Text style={[styles.typeButtonText, feedType === 'milk' && styles.typeButtonTextActive]}>母乳</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    feedType === 'formula' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFeedType('formula')}
                >
                  <Text style={[styles.typeButtonText, feedType === 'formula' && styles.typeButtonTextActive]}>配方奶</Text>
                </TouchableOpacity>
              </View>
              {feedType === 'milk' && (
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeButton, feedSide === 'left' && styles.typeButtonActive]}
                    onPress={() => setFeedSide('left')}
                  >
                    <Text style={[styles.typeButtonText, feedSide === 'left' && styles.typeButtonTextActive]}>左侧</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, feedSide === 'right' && styles.typeButtonActive]}
                    onPress={() => setFeedSide('right')}
                  >
                    <Text style={[styles.typeButtonText, feedSide === 'right' && styles.typeButtonTextActive]}>右侧</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, feedSide === 'both' && styles.typeButtonActive]}
                    onPress={() => setFeedSide('both')}
                  >
                    <Text style={[styles.typeButtonText, feedSide === 'both' && styles.typeButtonTextActive]}>两侧</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                style={styles.input}
                placeholder="数量 (ml)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </>
          )}

          {activeTab === 'solid' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="食物名称 (例如: 苹果泥)"
                placeholderTextColor="#64748B"
                value={solidFood}
                onChangeText={setSolidFood}
              />
              <Text style={styles.inputLabel}>宝宝喜欢的反应</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, solidReaction === 'like' && styles.typeButtonActive]}
                  onPress={() => setSolidReaction('like')}
                >
                  <Text style={[styles.typeButtonText, solidReaction === 'like' && styles.typeButtonTextActive]}>喜欢</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, solidReaction === 'neutral' && styles.typeButtonActive]}
                  onPress={() => setSolidReaction('neutral')}
                >
                  <Text style={[styles.typeButtonText, solidReaction === 'neutral' && styles.typeButtonTextActive]}>一般</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, solidReaction === 'dislike' && styles.typeButtonActive]}
                  onPress={() => setSolidReaction('dislike')}
                >
                  <Text style={[styles.typeButtonText, solidReaction === 'dislike' && styles.typeButtonTextActive]}>讨厌</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="数量 (例如: 2勺)"
                placeholderTextColor="#64748B"
                value={amount}
                onChangeText={setAmount}
              />
            </>
          )}

          {activeTab === 'diaper' && (
            <>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, diaperType === 'wet' && styles.typeButtonActive]}
                  onPress={() => setDiaperType('wet')}
                >
                  <Text style={[styles.typeButtonText, diaperType === 'wet' && styles.typeButtonTextActive]}>嘘嘘</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, diaperType === 'dirty' && styles.typeButtonActive]}
                  onPress={() => setDiaperType('dirty')}
                >
                  <Text style={[styles.typeButtonText, diaperType === 'dirty' && styles.typeButtonTextActive]}>便便</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, diaperType === 'both' && styles.typeButtonActive]}
                  onPress={() => setDiaperType('both')}
                >
                  <Text style={[styles.typeButtonText, diaperType === 'both' && styles.typeButtonTextActive]}>两者</Text>
                </TouchableOpacity>
              </View>
              {(diaperType === 'dirty' || diaperType === 'both') && (
                <>
                  <View style={styles.diaperStoolRow}>
                    <Palette size={18} color="#B45309" style={styles.diaperStoolIcon} />
                    <Text style={styles.diaperStoolLabel}>便便颜色</Text>
                  </View>
                  <View style={styles.diaperStoolChips}>
                    {['黄色', '黄绿', '绿色', '褐色', '棕色', '黑色', '白色', '其他'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.diaperStoolChip, diaperStoolColor === c && styles.diaperStoolChipActive]}
                        onPress={() => setDiaperStoolColor(c)}
                      >
                        <Text style={[styles.diaperStoolChipText, diaperStoolColor === c && styles.diaperStoolChipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.diaperStoolRow}>
                    <Layers size={18} color="#6D28D9" style={styles.diaperStoolIcon} />
                    <Text style={styles.diaperStoolLabel}>便便形态</Text>
                  </View>
                  <View style={styles.diaperStoolChips}>
                    {['稀水样', '糊状', '软便', '成型', '干硬', '其他'].map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.diaperStoolChip, diaperStoolForm === f && styles.diaperStoolChipActive]}
                        onPress={() => setDiaperStoolForm(f)}
                      >
                        <Text style={[styles.diaperStoolChipText, diaperStoolForm === f && styles.diaperStoolChipTextActive]}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {activeTab === 'sleep' && (
            <>
              <Text style={styles.timePickerLabel}>开始时间</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButtonDate}
                  onPress={() => {
                    setPickerTarget('sleepStart');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.dateTimeButtonText}>{format(sleepStartTime, 'yyyy年MM月dd日')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButtonTime}
                  onPress={() => {
                    setPickerTarget('sleepStart');
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.dateTimeButtonText}>{format(sleepStartTime, 'HH:mm')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sleepEndLabelRow}>
                <Text style={styles.timePickerLabel}>结束时间</Text>
                {sleepEndTime !== null && (
                  <TouchableOpacity
                    style={styles.sleepEndClearBtn}
                    onPress={() => setSleepEndTime(null)}
                  >
                    <Text style={styles.sleepEndClearText}>清除</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButtonDate}
                  onPress={() => {
                    setPickerTarget('sleepEnd');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.dateTimeButtonText}>
                    {sleepEndTime ? format(sleepEndTime, 'yyyy年MM月dd日') : '未设置'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButtonTime}
                  onPress={() => {
                    setPickerTarget('sleepEnd');
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.dateTimeButtonText}>
                    {sleepEndTime ? format(sleepEndTime, 'HH:mm') : '未设置'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {sleepEndTime
                  ? (() => {
                      const mins = Math.max(0, differenceInMinutes(sleepEndTime, sleepStartTime));
                      return `睡眠时长: ${Math.floor(mins / 60)} 小时 ${mins % 60} 分钟`;
                    })()
                  : '未设置结束时间，时长为 0'}
              </Text>
            </>
          )}

          {activeTab === 'growth' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="身高 (cm)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
              <TextInput
                style={styles.input}
                placeholder="体重 (kg)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </>
          )}

          {activeTab === 'medicine' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="名称 (如 AD、D3、钙)"
                placeholderTextColor="#64748B"
                value={medicineName}
                onChangeText={setMedicineName}
              />
              <View style={styles.medicineRow}>
                <TextInput
                  style={[styles.input, styles.medicineAmountInput]}
                  placeholder="数量"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={medicineAmount}
                  onChangeText={setMedicineAmount}
                />
                <View style={styles.medicineUnitRow}>
                  {['粒', '滴', 'ml', '包'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.typeButton, medicineUnit === u && styles.typeButtonActive]}
                      onPress={() => setMedicineUnit(u)}
                    >
                      <Text style={[styles.typeButtonText, medicineUnit === u && styles.typeButtonTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {activeTab === 'temperature' && (
            <TextInput
              style={styles.input}
              placeholder="体温 (°C)，如 36.5"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={temperatureValue}
              onChangeText={setTemperatureValue}
            />
          )}

          <View style={styles.timePickerWrap}>
            {activeTab !== 'sleep' && (
              <>
                <View style={styles.timePickerLabelRow}>
                  <Text style={styles.timePickerLabel}>记录时间</Text>
                  <TouchableOpacity
                    style={styles.timeNowButton}
                    onPress={() => setSelectedTime(new Date())}
                  >
                    <Text style={styles.timeNowButtonText}>此刻</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeButtonDate}
                    onPress={() => {
                      setPickerTarget('record');
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={styles.dateTimeButtonText}>{format(selectedTime, 'yyyy年MM月dd日')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateTimeButtonTime}
                    onPress={() => {
                      setPickerTarget('record');
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={styles.dateTimeButtonText}>{format(selectedTime, 'HH:mm')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={
                  pickerTarget === 'record'
                    ? selectedTime
                    : pickerTarget === 'sleepStart'
                    ? sleepStartTime
                    : sleepEndTime ?? sleepStartTime
                }
                mode="date"
                display="default"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (!date) return;
                  if (pickerTarget === 'record') setSelectedTime(date);
                  else if (pickerTarget === 'sleepStart') setSleepStartTime(date);
                  else setSleepEndTime(date);
                }}
              />
            )}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={
                  pickerTarget === 'record'
                    ? selectedTime
                    : pickerTarget === 'sleepStart'
                    ? sleepStartTime
                    : sleepEndTime ?? sleepStartTime
                }
                mode="time"
                display="default"
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (!date) return;
                  if (pickerTarget === 'record') setSelectedTime(date);
                  else if (pickerTarget === 'sleepStart') setSleepStartTime(date);
                  else setSleepEndTime(date);
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
                          pickerTarget === 'record'
                            ? selectedTime
                            : pickerTarget === 'sleepStart'
                            ? sleepStartTime
                            : sleepEndTime ?? sleepStartTime
                        }
                        mode="date"
                        display="spinner"
                        locale={datePickerLocale}
                        themeVariant="light"
                        textColor="#1E293B"
                        onChange={(_, date) => {
                          if (!date) return;
                          if (pickerTarget === 'record') setSelectedTime(date);
                          else if (pickerTarget === 'sleepStart') setSleepStartTime(date);
                          else setSleepEndTime(date);
                        }}
                        style={styles.bottomDateTimePicker}
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'ios' && showTimePicker && (
              <Modal visible transparent animationType="slide">
                <View style={styles.pickerBackdrop}>
                  <TouchableWithoutFeedback onPress={() => setShowTimePicker(false)}>
                    <View style={{ flex: 1 }} />
                  </TouchableWithoutFeedback>
                  <View style={styles.pickerSheet}>
                    <View style={styles.pickerSheetHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerSheetCancel}>取消</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerSheetTitle}>选择时间</Text>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerSheetDone}>确定</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.pickerSheetContent}>
                      <DateTimePicker
                        value={
                          pickerTarget === 'record'
                            ? selectedTime
                            : pickerTarget === 'sleepStart'
                            ? sleepStartTime
                            : sleepEndTime ?? sleepStartTime
                        }
                        mode="time"
                        display="spinner"
                        themeVariant="light"
                        textColor="#1E293B"
                        onChange={(_, date) => {
                          if (!date) return;
                          if (pickerTarget === 'record') setSelectedTime(date);
                          else if (pickerTarget === 'sleepStart') setSleepStartTime(date);
                          else setSleepEndTime(date);
                        }}
                        style={styles.bottomDateTimePicker}
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'web' && (showDatePicker || showTimePicker) && activeTab !== 'sleep' && (
              <View style={styles.webDateTimeRow}>
                {showDatePicker && (
                  <TextInput
                    style={styles.webDateInput}
                    {...({ type: 'date' } as any)}
                    value={format(selectedTime, 'yyyy-MM-dd')}
                    onChangeText={(v) => {
                      const d = new Date(v + 'T' + format(selectedTime, 'HH:mm:ss'));
                      if (!isNaN(d.getTime())) setSelectedTime(d);
                    }}
                    onBlur={() => setShowDatePicker(false)}
                  />
                )}
                {showTimePicker && (
                  <TextInput
                    style={styles.webDateInput}
                    {...({ type: 'time' } as any)}
                    value={format(selectedTime, 'HH:mm')}
                    onChangeText={(v) => {
                      const [h, m] = v.split(':').map(Number);
                      const d = new Date(selectedTime);
                      if (Number.isFinite(h)) d.setHours(h);
                      if (Number.isFinite(m)) d.setMinutes(m);
                      setSelectedTime(d);
                    }}
                    onBlur={() => setShowTimePicker(false)}
                  />
                )}
              </View>
            )}
            {Platform.OS === 'web' && (showDatePicker || showTimePicker) && activeTab === 'sleep' && (
              <View style={styles.webDateTimeRow}>
                {showDatePicker && (
                  <TextInput
                    style={styles.webDateInput}
                    {...({ type: 'date' } as any)}
                    value={
                      pickerTarget === 'sleepStart'
                        ? format(sleepStartTime, 'yyyy-MM-dd')
                        : format(sleepEndTime ?? sleepStartTime, 'yyyy-MM-dd')
                    }
                    onChangeText={(v) => {
                      const base = pickerTarget === 'sleepStart' ? sleepStartTime : sleepEndTime ?? sleepStartTime;
                      const d = new Date(v + 'T' + format(base, 'HH:mm:ss'));
                      if (!isNaN(d.getTime())) {
                        if (pickerTarget === 'sleepStart') setSleepStartTime(d);
                        else setSleepEndTime(d);
                      }
                    }}
                    onBlur={() => setShowDatePicker(false)}
                  />
                )}
                {showTimePicker && (
                  <TextInput
                    style={styles.webDateInput}
                    {...({ type: 'time' } as any)}
                    value={
                      pickerTarget === 'sleepStart'
                        ? format(sleepStartTime, 'HH:mm')
                        : format(sleepEndTime ?? sleepStartTime, 'HH:mm')
                    }
                    onChangeText={(v) => {
                      const base = pickerTarget === 'sleepStart' ? sleepStartTime : sleepEndTime ?? sleepStartTime;
                      const [h, m] = v.split(':').map(Number);
                      const d = new Date(base);
                      if (Number.isFinite(h)) d.setHours(h);
                      if (Number.isFinite(m)) d.setMinutes(m);
                      if (pickerTarget === 'sleepStart') setSleepStartTime(d);
                      else setSleepEndTime(d);
                    }}
                    onBlur={() => setShowTimePicker(false)}
                  />
                )}
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
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
  babyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0,
    marginVertical: 12,
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  babyAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C7F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  babyAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0D9488',
  },
  babyAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  babyInfo: {
    flex: 1,
  },
  babyName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  babyAge: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 3,
    fontWeight: '500',
  },
  babyNextFeed: {
    fontSize: 12,
    color: '#0D9488',
    marginTop: 6,
    fontWeight: '600',
  },
  babyLastMeal: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    gap: 12,
  },
  actionButton: {
    width: '48%',
    padding: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  actionButtonMint: {
    backgroundColor: '#CCFBF1',
  },
  actionButtonOrange: {
    backgroundColor: '#FECACA',
  },
  actionButtonBlue: {
    backgroundColor: '#A5F3FC',
  },
  actionButtonYellow: {
    backgroundColor: '#FEF3C7',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  actionTime: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 6,
    fontWeight: '600',
  },
  dailyStatsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  dailyStatsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  dailyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dailyStatCard: {
    width: '30%',
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  dailyStatCardMint: {
    backgroundColor: '#CCFBF1',
  },
  dailyStatCardYellow: {
    backgroundColor: '#FEF3C7',
  },
  dailyStatCardBlue: {
    backgroundColor: '#DBEAFE',
  },
  dailyStatCardPurple: {
    backgroundColor: '#E9D5FF',
  },
  dailyStatCardViolet: {
    backgroundColor: '#EDE9FE',
  },
  dailyStatCardCoral: {
    backgroundColor: '#FFE4E6',
  },
  dailyStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dailyStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  logSection: {
    marginHorizontal: 0,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logHeaderArrow: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  logTitleCenter: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    width: 70,
  },
  logDeleteBtn: {
    padding: 8,
    marginLeft: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logDetails: {
    flex: 1,
  },
  logLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  logDescription: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 3,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '90%',
    maxWidth: MODAL_MAX_WIDTH,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#14B8A6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  rowInput: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  medicineRow: {
    marginBottom: 8,
  },
  medicineAmountInput: {
    marginBottom: 12,
  },
  medicineUnitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  halfInputContainer: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 20,
    marginTop: 4,
  },
  sleepEndLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sleepEndClearBtn: {
    paddingVertical: 0,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  sleepEndClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  diaperStoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  diaperStoolIcon: {
    marginRight: 8,
  },
  diaperStoolLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  diaperStoolChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  diaperStoolChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  diaperStoolChipActive: {
    backgroundColor: '#E8D5B7',
    borderWidth: 1,
    borderColor: '#B45309',
  },
  diaperStoolChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  diaperStoolChipTextActive: {
    color: '#92400E',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  timePickerButton: {
    backgroundColor: '#CCFBF1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#14B8A6',
  },
  timePickerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D7377',
    textAlign: 'center',
  },
  timePickerWrap: {
    marginBottom: 16,
    position: 'relative',
    paddingHorizontal: 20,
    width: '100%',
  },
  timePickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 8,
  },
  dateTimeButtonDate: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  dateTimeButtonTime: {
    width: 72,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D7377',
    textAlign: 'center',
  },
  timeNowButton: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeNowButtonText: {
    fontSize: 13,
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
  webDateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  webDateInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  timePickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  timeInput: {
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    width: 55,
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  timeColon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
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
    borderRadius: 10,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
