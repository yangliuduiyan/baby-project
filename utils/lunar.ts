/**
 * 年龄计算（公历，基于 date-fns）
 */
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  addMonths,
  addYears,
} from 'date-fns';
import type { Baby } from '@/types';

/** 公历年龄文案（未满整月按天，满月后 X月零X天，满岁 X岁零X月X天） */
export function getSolarAgeText(birthDateIso: string): string {
  const now = new Date();
  const birth = new Date(birthDateIso);
  const totalDays = differenceInDays(now, birth);
  if (totalDays < 30) return `${totalDays}天`;
  const fullMonths = differenceInMonths(now, birth);
  if (fullMonths < 12) {
    const afterMonths = addMonths(birth, fullMonths);
    const remainderDays = differenceInDays(now, afterMonths);
    if (remainderDays === 0) return `${fullMonths}个月`;
    return `${fullMonths}月零${remainderDays}天`;
  }
  const years = differenceInYears(now, birth);
  const afterYears = addYears(birth, years);
  const months = differenceInMonths(now, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInDays(now, afterMonths);
  if (months > 0 && days > 0) return `${years}岁零${months}月${days}天`;
  if (months > 0) return `${years}岁零${months}月`;
  if (days > 0) return `${years}岁零${days}天`;
  return `${years}岁`;
}

/** 根据宝宝资料返回年龄文案（公历） */
export function getAgeText(baby: Baby | null): string {
  if (!baby) return '';
  return getSolarAgeText(baby.birthDate);
}
