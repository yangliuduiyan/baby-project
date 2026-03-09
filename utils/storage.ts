/**
 * 持久化存储：优先使用 AsyncStorage；在 Expo Go 等环境下若 Native 模块不可用（如报错
 * "Native module is null, cannot access legacy storage"），自动降级为内存存储（仅当前会话有效）。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Baby,
  FeedRecord,
  DiaperRecord,
  GrowthRecord,
  SleepRecord,
  ScheduleEvent,
  MedicineRecord,
  GiftLedgerRecord,
  TemperatureRecord,
} from '@/types';

const KEYS = {
  BABIES: 'babies',
  CURRENT_BABY: 'currentBaby',
  FEEDS: 'feeds',
  DIAPERS: 'diapers',
  GROWTH: 'growth',
  SLEEP: 'sleep',
  SCHEDULE: 'schedule',
  MEDICINE: 'medicine',
  TEMPERATURES: 'temperatures',
  FEED_INTERVAL_HOURS: 'feedIntervalHours',
  FEED_REMINDER_ENABLED: 'feedReminderEnabled',
  GIFT_LEDGER: 'giftLedger',
};

const LEGACY_ERROR_PATTERNS = /Native module is null|cannot access legacy storage|AsyncStorage is null/i;

const memoryFallback = new Map<string, string>();
let useFallback: boolean | null = null;

async function getItem(key: string): Promise<string | null> {
  if (useFallback === true) return memoryFallback.get(key) ?? null;
  try {
    const value = await AsyncStorage.getItem(key);
    return value;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (LEGACY_ERROR_PATTERNS.test(msg)) {
      useFallback = true;
      return memoryFallback.get(key) ?? null;
    }
    throw e;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (useFallback === true) {
    memoryFallback.set(key, value);
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (LEGACY_ERROR_PATTERNS.test(msg)) {
      useFallback = true;
      memoryFallback.set(key, value);
      return;
    }
    throw e;
  }
}

/** 当前是否在使用内存回退（无持久化，关闭应用后数据丢失） */
export function isStorageUsingFallback(): boolean {
  return useFallback === true;
}

export const storage = {
  async getBabies(): Promise<Baby[]> {
    const data = await getItem(KEYS.BABIES);
    return data ? JSON.parse(data) : [];
  },

  async saveBaby(baby: Baby): Promise<void> {
    const babies = await this.getBabies();
    const index = babies.findIndex((b) => b.id === baby.id);
    if (index >= 0) {
      babies[index] = baby;
    } else {
      babies.push(baby);
    }
    await setItem(KEYS.BABIES, JSON.stringify(babies));
  },

  async getCurrentBabyId(): Promise<string | null> {
    return await getItem(KEYS.CURRENT_BABY);
  },

  async setCurrentBabyId(id: string): Promise<void> {
    await setItem(KEYS.CURRENT_BABY, id);
  },

  async getFeeds(): Promise<FeedRecord[]> {
    const data = await getItem(KEYS.FEEDS);
    return data ? JSON.parse(data) : [];
  },

  async saveFeed(feed: FeedRecord): Promise<void> {
    const feeds = await this.getFeeds();
    feeds.push(feed);
    await setItem(KEYS.FEEDS, JSON.stringify(feeds));
  },

  async updateFeed(feed: FeedRecord): Promise<void> {
    const feeds = await this.getFeeds();
    const idx = feeds.findIndex((f) => f.id === feed.id);
    if (idx >= 0) feeds[idx] = feed;
    else feeds.push(feed);
    await setItem(KEYS.FEEDS, JSON.stringify(feeds));
  },

  async deleteFeed(id: string): Promise<void> {
    const feeds = (await this.getFeeds()).filter((f) => f.id !== id);
    await setItem(KEYS.FEEDS, JSON.stringify(feeds));
  },

  async getDiapers(): Promise<DiaperRecord[]> {
    const data = await getItem(KEYS.DIAPERS);
    return data ? JSON.parse(data) : [];
  },

  async saveDiaper(diaper: DiaperRecord): Promise<void> {
    const diapers = await this.getDiapers();
    diapers.push(diaper);
    await setItem(KEYS.DIAPERS, JSON.stringify(diapers));
  },

  async updateDiaper(diaper: DiaperRecord): Promise<void> {
    const diapers = await this.getDiapers();
    const idx = diapers.findIndex((d) => d.id === diaper.id);
    if (idx >= 0) diapers[idx] = diaper;
    else diapers.push(diaper);
    await setItem(KEYS.DIAPERS, JSON.stringify(diapers));
  },

  async deleteDiaper(id: string): Promise<void> {
    const diapers = (await this.getDiapers()).filter((d) => d.id !== id);
    await setItem(KEYS.DIAPERS, JSON.stringify(diapers));
  },

  async getGrowth(): Promise<GrowthRecord[]> {
    const data = await getItem(KEYS.GROWTH);
    return data ? JSON.parse(data) : [];
  },

  async saveGrowth(growth: GrowthRecord): Promise<void> {
    const growths = await this.getGrowth();
    growths.push(growth);
    await setItem(KEYS.GROWTH, JSON.stringify(growths));
  },

  async getSleep(): Promise<SleepRecord[]> {
    const data = await getItem(KEYS.SLEEP);
    return data ? JSON.parse(data) : [];
  },

  async saveSleep(sleep: SleepRecord): Promise<void> {
    const sleeps = await this.getSleep();
    sleeps.push(sleep);
    await setItem(KEYS.SLEEP, JSON.stringify(sleeps));
  },

  async updateSleep(sleep: SleepRecord): Promise<void> {
    const sleeps = await this.getSleep();
    const idx = sleeps.findIndex((s) => s.id === sleep.id);
    if (idx >= 0) sleeps[idx] = sleep;
    else sleeps.push(sleep);
    await setItem(KEYS.SLEEP, JSON.stringify(sleeps));
  },

  async deleteSleep(id: string): Promise<void> {
    const sleeps = (await this.getSleep()).filter((s) => s.id !== id);
    await setItem(KEYS.SLEEP, JSON.stringify(sleeps));
  },

  async getSchedule(): Promise<ScheduleEvent[]> {
    const data = await getItem(KEYS.SCHEDULE);
    return data ? JSON.parse(data) : [];
  },

  async saveScheduleEvent(event: ScheduleEvent): Promise<void> {
    const events = await this.getSchedule();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) events[idx] = event;
    else events.push(event);
    await setItem(KEYS.SCHEDULE, JSON.stringify(events));
  },

  async updateScheduleEvent(event: ScheduleEvent): Promise<void> {
    await this.saveScheduleEvent(event);
  },

  async deleteScheduleEvent(id: string): Promise<void> {
    const events = (await this.getSchedule()).filter((e) => e.id !== id);
    await setItem(KEYS.SCHEDULE, JSON.stringify(events));
  },

  async getMedicine(): Promise<MedicineRecord[]> {
    const data = await getItem(KEYS.MEDICINE);
    return data ? JSON.parse(data) : [];
  },

  async saveMedicine(record: MedicineRecord): Promise<void> {
    const list = await this.getMedicine();
    list.push(record);
    await setItem(KEYS.MEDICINE, JSON.stringify(list));
  },

  async updateMedicine(record: MedicineRecord): Promise<void> {
    const list = await this.getMedicine();
    const idx = list.findIndex((m) => m.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await setItem(KEYS.MEDICINE, JSON.stringify(list));
  },

  async deleteMedicine(id: string): Promise<void> {
    const list = (await this.getMedicine()).filter((m) => m.id !== id);
    await setItem(KEYS.MEDICINE, JSON.stringify(list));
  },

  async getTemperatures(): Promise<TemperatureRecord[]> {
    const data = await getItem(KEYS.TEMPERATURES);
    return data ? JSON.parse(data) : [];
  },

  async saveTemperature(record: TemperatureRecord): Promise<void> {
    const list = await this.getTemperatures();
    list.push(record);
    await setItem(KEYS.TEMPERATURES, JSON.stringify(list));
  },

  async updateTemperature(record: TemperatureRecord): Promise<void> {
    const list = await this.getTemperatures();
    const idx = list.findIndex((t) => t.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await setItem(KEYS.TEMPERATURES, JSON.stringify(list));
  },

  async deleteTemperature(id: string): Promise<void> {
    const list = (await this.getTemperatures()).filter((t) => t.id !== id);
    await setItem(KEYS.TEMPERATURES, JSON.stringify(list));
  },

  async getFeedIntervalHours(): Promise<number> {
    const v = await getItem(KEYS.FEED_INTERVAL_HOURS);
    if (v == null) return 4;
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 24 ? n : 4;
  },

  async setFeedIntervalHours(hours: number): Promise<void> {
    await setItem(KEYS.FEED_INTERVAL_HOURS, String(Math.max(1, Math.min(24, hours))));
  },

  async getFeedReminderEnabled(): Promise<boolean> {
    const v = await getItem(KEYS.FEED_REMINDER_ENABLED);
    return v === 'true';
  },

  async setFeedReminderEnabled(enabled: boolean): Promise<void> {
    await setItem(KEYS.FEED_REMINDER_ENABLED, enabled ? 'true' : 'false');
  },

  async getGiftLedger(): Promise<GiftLedgerRecord[]> {
    const data = await getItem(KEYS.GIFT_LEDGER);
    return data ? JSON.parse(data) : [];
  },

  async saveGiftLedgerRecord(record: GiftLedgerRecord): Promise<void> {
    const list = await this.getGiftLedger();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await setItem(KEYS.GIFT_LEDGER, JSON.stringify(list));
  },

  async deleteGiftLedgerRecord(id: string): Promise<void> {
    const list = (await this.getGiftLedger()).filter((r) => r.id !== id);
    await setItem(KEYS.GIFT_LEDGER, JSON.stringify(list));
  },

  /**
   * 从备份数据恢复，覆盖当前所有数据。payload 需包含与备份导出一致的结构。
   */
  async restoreFromBackup(payload: {
    babies?: Baby[];
    currentBabyId?: string | null;
    feeds?: FeedRecord[];
    diapers?: DiaperRecord[];
    growth?: GrowthRecord[];
    sleep?: SleepRecord[];
    schedule?: ScheduleEvent[];
    medicine?: MedicineRecord[];
    temperatures?: TemperatureRecord[];
    giftLedger?: GiftLedgerRecord[];
    feedIntervalHours?: number;
    feedReminderEnabled?: boolean;
  }): Promise<void> {
    const babies = Array.isArray(payload.babies) ? payload.babies : [];
    await setItem(KEYS.BABIES, JSON.stringify(babies));
    const currentId = payload.currentBabyId != null ? String(payload.currentBabyId) : '';
    await setItem(KEYS.CURRENT_BABY, currentId);
    await setItem(KEYS.FEEDS, JSON.stringify(Array.isArray(payload.feeds) ? payload.feeds : []));
    await setItem(KEYS.DIAPERS, JSON.stringify(Array.isArray(payload.diapers) ? payload.diapers : []));
    await setItem(KEYS.GROWTH, JSON.stringify(Array.isArray(payload.growth) ? payload.growth : []));
    await setItem(KEYS.SLEEP, JSON.stringify(Array.isArray(payload.sleep) ? payload.sleep : []));
    await setItem(KEYS.SCHEDULE, JSON.stringify(Array.isArray(payload.schedule) ? payload.schedule : []));
    await setItem(KEYS.MEDICINE, JSON.stringify(Array.isArray(payload.medicine) ? payload.medicine : []));
    await setItem(KEYS.TEMPERATURES, JSON.stringify(Array.isArray(payload.temperatures) ? payload.temperatures : []));
    await setItem(KEYS.GIFT_LEDGER, JSON.stringify(Array.isArray(payload.giftLedger) ? payload.giftLedger : []));
    const rawHours = payload.feedIntervalHours;
    const hours = typeof rawHours === 'number' && Number.isFinite(rawHours) ? Math.max(1, Math.min(24, rawHours)) : 4;
    await setItem(KEYS.FEED_INTERVAL_HOURS, String(hours));
    await setItem(KEYS.FEED_REMINDER_ENABLED, payload.feedReminderEnabled === true ? 'true' : 'false');
  },
};
