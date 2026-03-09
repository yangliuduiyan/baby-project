export interface Baby {
  id: string;
  name: string;
  birthDate: string;
  photoUrl?: string;
  motherName?: string;
  fatherName?: string;
}

export interface FeedRecord {
  id: string;
  babyId: string;
  type: 'milk' | 'solid' | 'formula';
  amount: number;
  unit: string;
  side?: 'left' | 'right' | 'both';
  timestamp: string;
  notes?: string;
  /** 辅食时宝宝的反应：喜欢、一般、讨厌 */
  solidReaction?: 'like' | 'neutral' | 'dislike';
}

export interface DiaperRecord {
  id: string;
  babyId: string;
  type: 'wet' | 'dirty' | 'both';
  timestamp: string;
  notes?: string;
  /** 便便颜色（仅当 type 为 dirty 或 both 时可填） */
  stoolColor?: string;
  /** 便便形态（仅当 type 为 dirty 或 both 时可填） */
  stoolForm?: string;
}

export interface GrowthRecord {
  id: string;
  babyId: string;
  weight?: number;
  height?: number;
  timestamp: string;
  notes?: string;
}

/** 日程任务类型：买东西、备忘、儿保预约、外出、其他（含旧类型以兼容已有数据） */
export type ScheduleTaskType = 'shopping' | 'memo' | 'checkup' | 'outing' | 'feed' | 'nap' | 'diaper' | 'other';

export interface ScheduleEvent {
  id: string;
  babyId: string;
  title: string;
  type: ScheduleTaskType;
  time: string;
  notes?: string;
  /** 是否已完成，完成后显示在列表底部并红色删除线 */
  completed?: boolean;
}

export interface SleepRecord {
  id: string;
  babyId: string;
  startTime: string;
  durationMinutes: number;
}

/** 健康 / 营养补给记录，如 AD 1粒 */
export interface MedicineRecord {
  id: string;
  babyId: string;
  name: string;
  amount: number;
  unit: string;
  timestamp: string;
  notes?: string;
}

/** 体温记录，单位默认摄氏度 */
export interface TemperatureRecord {
  id: string;
  babyId: string;
  temperature: number;
  unit?: 'celsius';
  timestamp: string;
  notes?: string;
}

/** 礼部：红包/礼金收支记录 */
export type GiftLedgerType = 'income' | 'expense';

export type GiftLedgerCategory =
  | 'wedding'    // 婚礼
  | 'baby_full' // 满月
  | 'birthday'  // 生日
  | 'new_year'  // 过年
  | 'other';

/** 家庭礼部 vs 宝宝收支，区分管理 */
export type GiftLedgerScope = 'family' | 'baby';

export interface GiftLedgerRecord {
  id: string;
  type: GiftLedgerType;
  amount: number;
  date: string;
  category: GiftLedgerCategory;
  note?: string;
  createdAt: string;
  /** 不填或 family = 家庭礼部，baby = 宝宝收支 */
  scope?: GiftLedgerScope;
}
