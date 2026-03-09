import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HORIZONTAL_PADDING } from '@/utils/layout';
import { LineChart } from 'react-native-chart-kit';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  startOfDay,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useBaby } from '@/contexts/BabyContext';
import { storage } from '@/utils/storage';
import { DiaperRecord, FeedRecord, GrowthRecord, MedicineRecord, SleepRecord, TemperatureRecord } from '@/types';

const screenWidth = Dimensions.get('window').width;
/** 综合趋势图可用宽度：屏幕宽 - 左右页面边距 - 卡片左右内边距，避免超出边框 */
const chartWidth = screenWidth - HORIZONTAL_PADDING * 2 - 16 * 2;

type ViewMode = 'week' | 'month';
type TrendMetric = 'milk' | 'diaper' | 'sleep' | 'medicine' | 'solid';
/** 综合趋势图类型：总量分布（按天/周汇总） 或 时刻分布（按当日小时汇总） */
type ChartType = 'total' | 'time';

const TREND_METRIC_LABELS: Record<TrendMetric, string> = {
  milk: '奶量',
  diaper: '尿布',
  sleep: '睡眠',
  medicine: '健康',
  solid: '辅食',
};

const TREND_METRIC_COLORS: Record<TrendMetric, string> = {
  milk: '#2DD4BF',
  diaper: '#60A5FA',
  sleep: '#818CF8',
  medicine: '#A78BFA',
  solid: '#F59E0B',
};

function minutesToHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

/** 时刻分布散点图：X=日期，Y=时刻(0~24)，每点为一笔记录 */
function TimeDistributionScatterChart({
  width,
  height,
  points,
  daysInRange,
  color,
  viewMode,
}: {
  width: number;
  height: number;
  points: { dayIndex: number; hour: number }[];
  daysInRange: Date[];
  color: string;
  viewMode: ViewMode;
}) {
  const paddingLeft = 36;
  const paddingRight = 12;
  const paddingTop = 12;
  const paddingBottom = 32;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const numDays = daysInRange.length;
  const dayStep = numDays <= 1 ? 0 : plotWidth / Math.max(1, numDays - 1);

  const toX = (dayIndex: number) => paddingLeft + dayIndex * dayStep;
  const toY = (hour: number) => paddingTop + (1 - hour / 24) * plotHeight;

  const yTicks = Array.from({ length: 25 }, (_, i) => i);
  const dotR = 5;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* 网格线：Y 为时刻 */}
        {yTicks.map((h) => (
          <Line
            key={h}
            x1={paddingLeft}
            y1={toY(h)}
            x2={paddingLeft + plotWidth}
            y2={toY(h)}
            stroke="#E2E8F0"
            strokeWidth={1}
          />
        ))}
        {numDays > 0 && Array.from({ length: numDays }, (_, i) => (
          <Line
            key={i}
            x1={toX(i)}
            y1={paddingTop}
            x2={toX(i)}
            y2={paddingTop + plotHeight}
            stroke="#E2E8F0"
            strokeWidth={1}
          />
        ))}
        {/* 散点 */}
        {points.map((p, idx) => (
          <Circle
            key={idx}
            cx={toX(p.dayIndex)}
            cy={toY(p.hour)}
            r={dotR}
            fill={color}
            opacity={0.85}
          />
        ))}
        {/* Y 轴标签：时刻 */}
        {yTicks.map((h) => (
          <SvgText
            key={h}
            x={paddingLeft - 6}
            y={toY(h) + 4}
            fill="#64748B"
            fontSize={10}
            textAnchor="end"
          >
            {h}
          </SvgText>
        ))}
        {/* X 轴标签：日期 */}
        {daysInRange.map((day, i) => (
          <SvgText
            key={i}
            x={toX(i)}
            y={height - 8}
            fill="#64748B"
            fontSize={10}
            textAnchor="middle"
          >
            {viewMode === 'week'
              ? ['一', '二', '三', '四', '五', '六', '日'][day.getDay() === 0 ? 6 : day.getDay() - 1]
              : format(day, 'M/d')}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export default function StatisticsScreen() {
  const { currentBaby } = useBaby();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('milk');
  const [chartType, setChartType] = useState<ChartType>('total');
  const [trendChartModalVisible, setTrendChartModalVisible] = useState(false);
  const [growthModalVisible, setGrowthModalVisible] = useState(false);
  const [growthChartMetric, setGrowthChartMetric] = useState<'height' | 'weight'>('height');
  const [temperatureModalVisible, setTemperatureModalVisible] = useState(false);
  const [sleepDistModalVisible, setSleepDistModalVisible] = useState(false);
  const [feeds, setFeeds] = useState<FeedRecord[]>([]);
  const [diapers, setDiapers] = useState<DiaperRecord[]>([]);
  const [sleeps, setSleeps] = useState<SleepRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [growths, setGrowths] = useState<GrowthRecord[]>([]);
  const [temperatures, setTemperatures] = useState<TemperatureRecord[]>([]);

  const loadData = useCallback(async () => {
    const [f, d, s, m, g, t] = await Promise.all([
      storage.getFeeds(),
      storage.getDiapers(),
      storage.getSleep(),
      storage.getMedicine(),
      storage.getGrowth(),
      storage.getTemperatures(),
    ]);
    setFeeds(f);
    setDiapers(d);
    setSleeps(s);
    setMedicines(m);
    setGrowths(g);
    setTemperatures(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [currentBaby, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const range = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
      const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
      return { start, end };
    }
    return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
  }, [anchorDate, viewMode]);

  const daysInRange = useMemo(() => {
    return eachDayOfInterval({ start: range.start, end: range.end });
  }, [range.start, range.end]);

  const babyFeeds = useMemo(() => {
    if (!currentBaby) return [];
    return feeds.filter((f) => f.babyId === currentBaby.id);
  }, [feeds, currentBaby]);

  const babyDiapers = useMemo(() => {
    if (!currentBaby) return [];
    return diapers.filter((d) => d.babyId === currentBaby.id);
  }, [diapers, currentBaby]);

  const babySleeps = useMemo(() => {
    if (!currentBaby) return [];
    return sleeps.filter((s) => s.babyId === currentBaby.id);
  }, [sleeps, currentBaby]);

  const babyMedicines = useMemo(() => {
    if (!currentBaby) return [];
    return medicines.filter((m) => m.babyId === currentBaby.id);
  }, [medicines, currentBaby]);

  const babyGrowths = useMemo(() => {
    if (!currentBaby) return [];
    return [...growths.filter((r) => r.babyId === currentBaby.id)].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [growths, currentBaby]);

  const babyTemperatures = useMemo(() => {
    if (!currentBaby) return [];
    return [...temperatures.filter((r) => r.babyId === currentBaby.id)].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [temperatures, currentBaby]);

  const milkFeedsInRange = useMemo(() => {
    return babyFeeds.filter((f) => {
      if (f.type !== 'milk' && f.type !== 'formula') return false;
      const t = new Date(f.timestamp);
      return isWithinInterval(t, { start: range.start, end: range.end });
    });
  }, [babyFeeds, range.start, range.end]);

  const solidFeedsInRange = useMemo(() => {
    return babyFeeds.filter((f) => {
      if (f.type !== 'solid') return false;
      const t = new Date(f.timestamp);
      return isWithinInterval(t, { start: range.start, end: range.end });
    });
  }, [babyFeeds, range.start, range.end]);

  const diapersInRange = useMemo(() => {
    return babyDiapers.filter((d) => {
      const t = new Date(d.timestamp);
      return isWithinInterval(t, { start: range.start, end: range.end });
    });
  }, [babyDiapers, range.start, range.end]);

  const sleepsInRange = useMemo(() => {
    return babySleeps.filter((s) => {
      const t = new Date(s.startTime);
      return isWithinInterval(t, { start: range.start, end: range.end });
    });
  }, [babySleeps, range.start, range.end]);

  const medicinesInRange = useMemo(() => {
    return babyMedicines.filter((m) => {
      const t = new Date(m.timestamp);
      return isWithinInterval(t, { start: range.start, end: range.end });
    });
  }, [babyMedicines, range.start, range.end]);

  const temperaturesInRange = useMemo(() => {
    return babyTemperatures.filter((t) => {
      const ts = new Date(t.timestamp);
      return isWithinInterval(ts, { start: range.start, end: range.end });
    });
  }, [babyTemperatures, range.start, range.end]);

  const milkTotalMl = useMemo(() => {
    return milkFeedsInRange.reduce((sum, f) => sum + (Number.isFinite(f.amount) ? f.amount : 0), 0);
  }, [milkFeedsInRange]);

  const milkAveragePerDay = useMemo(() => {
    const days = Math.max(1, daysInRange.length);
    return milkTotalMl / days;
  }, [milkTotalMl, daysInRange.length]);

  const diaperWetCount = useMemo(() => {
    return diapersInRange.filter((d) => d.type === 'wet' || d.type === 'both').length;
  }, [diapersInRange]);

  const diaperDirtyCount = useMemo(() => {
    return diapersInRange.filter((d) => d.type === 'dirty' || d.type === 'both').length;
  }, [diapersInRange]);

  const sleepTotalMinutes = useMemo(() => {
    return sleepsInRange.reduce((sum, s) => sum + (Number.isFinite(s.durationMinutes) ? s.durationMinutes : 0), 0);
  }, [sleepsInRange]);

  const sleepMaxMinutes = useMemo(() => {
    let max = 0;
    for (const s of sleepsInRange) {
      if (s.durationMinutes > max) max = s.durationMinutes;
    }
    return max;
  }, [sleepsInRange]);

  /** 近 7 天每日睡眠时长（用于睡眠分布图） */
  const sleepDistributionChartData = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    const labels = days.map((d) => format(d, 'M/d', { locale: zhCN }));
    const data = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const totalMinutes = babySleeps
        .filter((s) => format(new Date(s.startTime), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, s) => sum + (Number.isFinite(s.durationMinutes) ? s.durationMinutes : 0), 0);
      return Math.round((totalMinutes / 60) * 10) / 10;
    });
    return { labels, datasets: [{ data, color: () => '#818CF8', strokeWidth: 2 }] };
  }, [babySleeps]);

  const medicineCount = medicinesInRange.length;

  const solidCount = solidFeedsInRange.length;
  const solidLike = solidFeedsInRange.filter((f) => f.solidReaction === 'like').length;
  const solidNeutral = solidFeedsInRange.filter((f) => f.solidReaction === 'neutral').length;
  const solidDislike = solidFeedsInRange.filter((f) => f.solidReaction === 'dislike').length;

  /** 统一趋势图：奶量、尿布、睡眠、健康、辅食 按桶（天/周）汇总后归一化到 0-100，便于同图对比 */
  const unifiedTrendData = useMemo(() => {
    const toNormalized = (arr: number[]) => {
      const max = Math.max(...arr, 1);
      return arr.map((v) => Math.round((v / max) * 100));
    };

    if (viewMode === 'week') {
      const labels = ['一', '二', '三', '四', '五', '六', '日'];
      const milk: number[] = [];
      const diaper: number[] = [];
      const sleep: number[] = [];
      const medicine: number[] = [];
      const solid: number[] = [];

      daysInRange.forEach((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        milk.push(
          milkFeedsInRange
            .filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr)
            .reduce((s, f) => s + f.amount, 0)
        );
        diaper.push(
          diapersInRange.filter((d) => format(new Date(d.timestamp), 'yyyy-MM-dd') === dayStr).length
        );
        sleep.push(
          sleepsInRange
            .filter((s) => format(new Date(s.startTime), 'yyyy-MM-dd') === dayStr)
            .reduce((sum, s) => sum + s.durationMinutes, 0)
        );
        medicine.push(
          medicinesInRange.filter((m) => format(new Date(m.timestamp), 'yyyy-MM-dd') === dayStr).length
        );
        solid.push(
          solidFeedsInRange.filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr).length
        );
      });

      return {
        labels,
        legend: ['奶量', '尿布', '睡眠', '健康', '辅食'],
        datasets: [
          { data: toNormalized(milk), color: () => '#2DD4BF', strokeWidth: 2 },
          { data: toNormalized(diaper), color: () => '#60A5FA', strokeWidth: 2 },
          { data: toNormalized(sleep), color: () => '#818CF8', strokeWidth: 2 },
          { data: toNormalized(medicine), color: () => '#A78BFA', strokeWidth: 2 },
          { data: toNormalized(solid), color: () => '#F59E0B', strokeWidth: 2 },
        ],
      };
    }

    const monthStart = range.start;
    const monthEnd = range.end;
    const bucketStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const bucketEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const bucketDays = eachDayOfInterval({ start: bucketStart, end: bucketEnd });
    const weekCount = Math.ceil(bucketDays.length / 7);
    const milk = Array.from({ length: weekCount }, () => 0);
    const diaper = Array.from({ length: weekCount }, () => 0);
    const sleep = Array.from({ length: weekCount }, () => 0);
    const medicine = Array.from({ length: weekCount }, () => 0);
    const solid = Array.from({ length: weekCount }, () => 0);

    bucketDays.forEach((day, idx) => {
      const weekIndex = Math.floor(idx / 7);
      const dayStr = format(day, 'yyyy-MM-dd');
      milk[weekIndex] += milkFeedsInRange
        .filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr)
        .reduce((s, f) => s + f.amount, 0);
      diaper[weekIndex] += diapersInRange.filter((d) => format(new Date(d.timestamp), 'yyyy-MM-dd') === dayStr).length;
      sleep[weekIndex] += sleepsInRange
        .filter((s) => format(new Date(s.startTime), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      medicine[weekIndex] += medicinesInRange.filter((m) => format(new Date(m.timestamp), 'yyyy-MM-dd') === dayStr).length;
      solid[weekIndex] += solidFeedsInRange.filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr).length;
    });

    const labels = Array.from({ length: weekCount }, (_, i) => `第${i + 1}周`);
    return {
      labels,
      legend: ['奶量', '尿布', '睡眠', '健康', '辅食'],
      datasets: [
        { data: toNormalized(milk), color: () => '#2DD4BF', strokeWidth: 2 },
        { data: toNormalized(diaper), color: () => '#60A5FA', strokeWidth: 2 },
        { data: toNormalized(sleep), color: () => '#818CF8', strokeWidth: 2 },
        { data: toNormalized(medicine), color: () => '#A78BFA', strokeWidth: 2 },
        { data: toNormalized(solid), color: () => '#F59E0B', strokeWidth: 2 },
      ],
    };
  }, [
    viewMode,
    daysInRange,
    range.start,
    range.end,
    milkFeedsInRange,
    diapersInRange,
    sleepsInRange,
    medicinesInRange,
    solidFeedsInRange,
  ]);

  /** 单指标趋势图数据（切换后只显示当前指标的真实值） */
  const singleTrendChartData = useMemo(() => {
    if (viewMode === 'week') {
      const labels = ['一', '二', '三', '四', '五', '六', '日'];
      const milk: number[] = [];
      const diaper: number[] = [];
      const sleep: number[] = [];
      const medicine: number[] = [];
      const solid: number[] = [];
      daysInRange.forEach((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        milk.push(
          milkFeedsInRange
            .filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr)
            .reduce((s, f) => s + f.amount, 0)
        );
        diaper.push(
          diapersInRange.filter((d) => format(new Date(d.timestamp), 'yyyy-MM-dd') === dayStr).length
        );
        sleep.push(
          sleepsInRange
            .filter((s) => format(new Date(s.startTime), 'yyyy-MM-dd') === dayStr)
            .reduce((sum, s) => sum + s.durationMinutes, 0)
        );
        medicine.push(
          medicinesInRange.filter((m) => format(new Date(m.timestamp), 'yyyy-MM-dd') === dayStr).length
        );
        solid.push(
          solidFeedsInRange.filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr).length
        );
      });
      const series = { milk, diaper, sleep, medicine, solid };
      const data = series[trendMetric];
      return {
        labels,
        legend: [TREND_METRIC_LABELS[trendMetric]],
        datasets: [{ data, color: () => TREND_METRIC_COLORS[trendMetric], strokeWidth: 2 }],
      };
    }
    const monthStart = range.start;
    const monthEnd = range.end;
    const bucketStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const bucketEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const bucketDays = eachDayOfInterval({ start: bucketStart, end: bucketEnd });
    const weekCount = Math.ceil(bucketDays.length / 7);
    const milk = Array.from({ length: weekCount }, () => 0);
    const diaper = Array.from({ length: weekCount }, () => 0);
    const sleep = Array.from({ length: weekCount }, () => 0);
    const medicine = Array.from({ length: weekCount }, () => 0);
    const solid = Array.from({ length: weekCount }, () => 0);
    bucketDays.forEach((day, idx) => {
      const weekIndex = Math.floor(idx / 7);
      const dayStr = format(day, 'yyyy-MM-dd');
      milk[weekIndex] += milkFeedsInRange
        .filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr)
        .reduce((s, f) => s + f.amount, 0);
      diaper[weekIndex] += diapersInRange.filter((d) => format(new Date(d.timestamp), 'yyyy-MM-dd') === dayStr).length;
      sleep[weekIndex] += sleepsInRange
        .filter((s) => format(new Date(s.startTime), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      medicine[weekIndex] += medicinesInRange.filter((m) => format(new Date(m.timestamp), 'yyyy-MM-dd') === dayStr).length;
      solid[weekIndex] += solidFeedsInRange.filter((f) => format(new Date(f.timestamp), 'yyyy-MM-dd') === dayStr).length;
    });
    const labels = Array.from({ length: weekCount }, (_, i) => `第${i + 1}周`);
    const series = { milk, diaper, sleep, medicine, solid };
    const data = series[trendMetric];
    return {
      labels,
      legend: [TREND_METRIC_LABELS[trendMetric]],
      datasets: [{ data, color: () => TREND_METRIC_COLORS[trendMetric], strokeWidth: 2 }],
    };
  }, [
    viewMode,
    trendMetric,
    daysInRange,
    range.start,
    range.end,
    milkFeedsInRange,
    diapersInRange,
    sleepsInRange,
    medicinesInRange,
    solidFeedsInRange,
  ]);

  /** 时刻分布散点：(dayIndex, hour) 用于 X=日期、Y=时刻 的散点图，便于对比日期之间的分类分布 */
  const timeDistributionScatterPoints = useMemo(() => {
    const points: { dayIndex: number; hour: number }[] = [];
    const getDayIndex = (d: Date) => {
      const dayStr = format(d, 'yyyy-MM-dd');
      const idx = daysInRange.findIndex((day) => format(day, 'yyyy-MM-dd') === dayStr);
      return idx >= 0 ? idx : -1;
    };
    const toHour = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

    if (trendMetric === 'milk') {
      milkFeedsInRange.forEach((f) => {
        const t = new Date(f.timestamp);
        const i = getDayIndex(t);
        if (i >= 0) points.push({ dayIndex: i, hour: toHour(t) });
      });
    } else if (trendMetric === 'diaper') {
      diapersInRange.forEach((d) => {
        const t = new Date(d.timestamp);
        const i = getDayIndex(t);
        if (i >= 0) points.push({ dayIndex: i, hour: toHour(t) });
      });
    } else if (trendMetric === 'sleep') {
      sleepsInRange.forEach((s) => {
        const t = new Date(s.startTime);
        const i = getDayIndex(t);
        if (i >= 0) points.push({ dayIndex: i, hour: toHour(t) });
      });
    } else if (trendMetric === 'medicine') {
      medicinesInRange.forEach((m) => {
        const t = new Date(m.timestamp);
        const i = getDayIndex(t);
        if (i >= 0) points.push({ dayIndex: i, hour: toHour(t) });
      });
    } else {
      solidFeedsInRange.forEach((f) => {
        const t = new Date(f.timestamp);
        const i = getDayIndex(t);
        if (i >= 0) points.push({ dayIndex: i, hour: toHour(t) });
      });
    }
    return points;
  }, [
    trendMetric,
    daysInRange,
    milkFeedsInRange,
    diapersInRange,
    sleepsInRange,
    medicinesInRange,
    solidFeedsInRange,
  ]);

  /** 综合趋势图当前视图是否有数据（无数据时显示“暂无记录”） */
  const trendChartEmpty = (() => {
    if (chartType === 'total') {
      if (trendMetric === 'milk') return milkFeedsInRange.length === 0;
      if (trendMetric === 'diaper') return diapersInRange.length === 0;
      if (trendMetric === 'sleep') return sleepsInRange.length === 0;
      if (trendMetric === 'medicine') return medicinesInRange.length === 0;
      if (trendMetric === 'solid') return solidFeedsInRange.length === 0;
      return true;
    }
    return timeDistributionScatterPoints.length === 0;
  })();

  /** 次数类 Y 轴由 chartConfig.count = maxVal+1 控制，只生成 0,1,2… 整数刻度，无需四舍五入 */
  const formatTrendYLabel = (value: string) => {
    const v = Number(value);
    if (trendMetric === 'milk') return `${Math.round(v)}`;
    if (trendMetric === 'sleep') return v >= 60 ? `${Math.round(v / 60)}h` : `${Math.round(v)}`;
    if (trendMetric === 'diaper' || trendMetric === 'medicine' || trendMetric === 'solid') {
      if (Math.abs(v - Math.round(v)) > 0.01) return '';
      return `${Math.round(v)}`;
    }
    return `${Math.round(v)}`;
  };

  /** 身高趋势图数据：按时间排序，仅含已填身高的记录；至少 2 个点以便折线显示 */
  const growthHeightChartData = useMemo(() => {
    const list = babyGrowths.filter((r) => r.height != null && Number.isFinite(r.height));
    if (list.length === 0) return { labels: [] as string[], datasets: [{ data: [] as number[] }] };
    const labels = list.map((r) => format(new Date(r.timestamp), 'M/d', { locale: zhCN }));
    const data = list.map((r) => r.height!);
    if (list.length === 1) {
      labels.push(labels[0]);
      data.push(data[0]);
    }
    return { labels, datasets: [{ data }] };
  }, [babyGrowths]);

  /** 体重趋势图数据：按时间排序，仅含已填体重的记录；至少 2 个点以便折线显示 */
  const growthWeightChartData = useMemo(() => {
    const list = babyGrowths.filter((r) => r.weight != null && Number.isFinite(r.weight));
    if (list.length === 0) return { labels: [] as string[], datasets: [{ data: [] as number[] }] };
    const labels = list.map((r) => format(new Date(r.timestamp), 'M/d', { locale: zhCN }));
    const data = list.map((r) => r.weight!);
    if (list.length === 1) {
      labels.push(labels[0]);
      data.push(data[0]);
    }
    return { labels, datasets: [{ data }] };
  }, [babyGrowths]);

  const latestGrowthSummary = useMemo(() => {
    if (babyGrowths.length === 0) return null;
    const last = babyGrowths[babyGrowths.length - 1];
    const hasH = last.height != null && Number.isFinite(last.height);
    const hasW = last.weight != null && Number.isFinite(last.weight);
    if (!hasH && !hasW) return null;
    const parts = [];
    if (hasH) parts.push(`${last.height} cm`);
    if (hasW) parts.push(`${last.weight} kg`);
    return parts.join(' · ');
  }, [babyGrowths]);

  /** 体温趋势图数据：按时间排序；至少 2 个点以便折线显示 */
  const temperatureChartData = useMemo(() => {
    if (babyTemperatures.length === 0) return { labels: [] as string[], datasets: [{ data: [] as number[] }] };
    const labels = babyTemperatures.map((r) => format(new Date(r.timestamp), 'M/d', { locale: zhCN }));
    const data = babyTemperatures.map((r) => r.temperature);
    if (babyTemperatures.length === 1) {
      labels.push(labels[0]);
      data.push(data[0]);
    }
    return { labels, datasets: [{ data }] };
  }, [babyTemperatures]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'week') {
      const ws = startOfWeek(anchorDate, { weekStartsOn: 1 });
      const we = endOfWeek(anchorDate, { weekStartsOn: 1 });
      return `${format(ws, 'M月d日', { locale: zhCN })} - ${format(we, 'M月d日', { locale: zhCN })}`;
    }
    return format(anchorDate, 'yyyy年M月', { locale: zhCN });
  }, [anchorDate, viewMode]);

  const goPrev = () => {
    setAnchorDate((d) => (viewMode === 'week' ? subWeeks(d, 1) : subMonths(d, 1)));
  };
  const goNext = () => {
    setAnchorDate((d) => (viewMode === 'week' ? addWeeks(d, 1) : addMonths(d, 1)));
  };
  const goNow = () => setAnchorDate(new Date());

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
        <View style={styles.viewModeRow}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'week' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewModeBtnText, viewMode === 'week' && styles.viewModeBtnTextActive]}>本周</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'month' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewModeBtnText, viewMode === 'month' && styles.viewModeBtnTextActive]}>本月</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
              <ChevronLeft size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{headerTitle}</Text>
            <TouchableOpacity onPress={goNext} style={styles.navBtn}>
              <ChevronRight size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={goNow} style={styles.nowBtn}>
            <Text style={styles.nowBtnText}>回到{viewMode === 'week' ? '本周' : '本月'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardMint]}
            onPress={() => {
              setTrendMetric('milk');
              setTrendChartModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>奶量合计</Text>
            <Text style={styles.statValue}>{currentBaby ? `${milkTotalMl.toFixed(0)} ml` : '--'}</Text>
            <Text style={styles.statSubtitle}>平均 {milkAveragePerDay.toFixed(0)} ml/天 · 点击查看趋势</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardPurple]}
            onPress={() => {
              setTrendMetric('medicine');
              setTrendChartModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>健康</Text>
            <Text style={styles.statValue}>{currentBaby ? `${medicineCount} 次` : '--'}</Text>
            <Text style={styles.statSubtitle}>本区间内记录次数 · 点击查看趋势</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardBlue]}
            onPress={() => {
              setTrendMetric('diaper');
              setTrendChartModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>尿布</Text>
            <Text style={styles.statValue}>{currentBaby ? `${diapersInRange.length} 次` : '--'}</Text>
            <Text style={styles.statSubtitle}>嘘嘘 {diaperWetCount} · 便便 {diaperDirtyCount} · 点击查看趋势</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardOrange]}
            onPress={() => {
              setTrendMetric('sleep');
              setTrendChartModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>睡眠</Text>
            <Text style={styles.statValue}>{currentBaby ? minutesToHM(sleepTotalMinutes) : '--'}</Text>
            <Text style={styles.statSubtitle}>最长 {sleepMaxMinutes ? minutesToHM(sleepMaxMinutes) : '--'} · 点击查看趋势</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardPurple]}
            onPress={() => setSleepDistModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>睡眠分布</Text>
            <Text style={styles.statValue}>{currentBaby ? '近7天' : '--'}</Text>
            <Text style={styles.statSubtitle}>每日睡眠时长 · 点击查看</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardYellow]}
            onPress={() => {
              setTrendMetric('solid');
              setTrendChartModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>辅食</Text>
            <Text style={styles.statValue}>{currentBaby ? `${solidCount} 次` : '--'}</Text>
            <Text style={styles.statSubtitle}>喜欢 {solidLike} · 一般 {solidNeutral} · 讨厌 {solidDislike} · 点击查看趋势</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardGreen]}
            onPress={() => setGrowthModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>身高/体重</Text>
            <Text style={styles.statValue}>
              {currentBaby && latestGrowthSummary ? latestGrowthSummary : currentBaby ? `${babyGrowths.length} 条记录` : '--'}
            </Text>
            <Text style={styles.statSubtitle}>成长曲线 · 点击查看</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardCoral]}
            onPress={() => setTemperatureModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.statTitle}>体温</Text>
            <Text style={styles.statValue}>
              {currentBaby && babyTemperatures.length > 0
                ? `${babyTemperatures[babyTemperatures.length - 1].temperature}°C`
                : currentBaby
                ? `${temperaturesInRange.length} 次`
                : '--'}
            </Text>
            <Text style={styles.statSubtitle}>本区间 {temperaturesInRange.length} 次 · 点击查看趋势</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={temperatureModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTemperatureModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setTemperatureModalVisible(false)}>
              <View style={styles.modalBackdropTouch} />
            </TouchableWithoutFeedback>
            <View style={styles.trendModalContent}>
              <View style={styles.growthModalHeader}>
                <Text style={styles.trendModalTitle}>体温趋势</Text>
                <TouchableOpacity
                  onPress={() => setTemperatureModalVisible(false)}
                  style={styles.trendModalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.trendModalCloseText}>关闭</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.growthModalBody}>
                <View style={[styles.chartWrap, { width: chartWidth }]}>
                  {temperatureChartData.labels.length === 0 ? (
                    <View style={styles.growthEmptyWrap}>
                      <Text style={styles.growthEmptyText}>暂无体温记录</Text>
                      <Text style={styles.growthEmptySubtext}>在首页「体温」中添加记录后即可查看趋势</Text>
                    </View>
                  ) : (
                    <LineChart
                      data={temperatureChartData as any}
                      width={chartWidth}
                      height={260}
                      withDots={true}
                      withInnerLines={true}
                      withOuterLines={true}
                      fromZero={false}
                      bezier
                      chartConfig={{
                        backgroundColor: '#FFFFFF',
                        backgroundGradientFrom: '#FFFFFF',
                        backgroundGradientTo: '#FFFFFF',
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(225, 29, 72, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                        propsForBackgroundLines: { strokeDasharray: '', stroke: '#E2E8F0' },
                      }}
                      style={styles.chart}
                      formatYLabel={(v) => `${Number(v)}`}
                    />
                  )}
                </View>
                <Text style={styles.helperText}>体温 (°C) · 按记录时间排序</Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={growthModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setGrowthModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setGrowthModalVisible(false)}>
              <View style={styles.modalBackdropTouch} />
            </TouchableWithoutFeedback>
            <View style={styles.trendModalContent}>
              <View style={styles.growthModalHeader}>
                <Text style={styles.trendModalTitle}>成长曲线</Text>
                <TouchableOpacity
                  onPress={() => setGrowthModalVisible(false)}
                  style={styles.trendModalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.trendModalCloseText}>关闭</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.growthModalBody}>
              <View style={styles.growthChartTypeRow}>
                <TouchableOpacity
                  style={[styles.chartTypeBtn, growthChartMetric === 'height' && styles.chartTypeBtnActive]}
                  onPress={() => setGrowthChartMetric('height')}
                >
                  <Text style={[styles.chartTypeBtnText, growthChartMetric === 'height' && styles.chartTypeBtnTextActive]}>
                    身高
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chartTypeBtn, growthChartMetric === 'weight' && styles.chartTypeBtnActive]}
                  onPress={() => setGrowthChartMetric('weight')}
                >
                  <Text style={[styles.chartTypeBtnText, growthChartMetric === 'weight' && styles.chartTypeBtnTextActive]}>
                    体重
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.chartWrap, { width: chartWidth }]}>
                {growthChartMetric === 'height' ? (
                  growthHeightChartData.labels.length === 0 ? (
                    <View style={styles.growthEmptyWrap}>
                      <Text style={styles.growthEmptyText}>暂无身高记录</Text>
                      <Text style={styles.growthEmptySubtext}>在首页「成长」中添加身高后即可查看趋势</Text>
                    </View>
                  ) : (
                    <LineChart
                      data={growthHeightChartData as any}
                      width={chartWidth}
                      height={260}
                      withDots={true}
                      withInnerLines={true}
                      withOuterLines={true}
                      fromZero
                      bezier
                      chartConfig={{
                        backgroundColor: '#FFFFFF',
                        backgroundGradientFrom: '#FFFFFF',
                        backgroundGradientTo: '#FFFFFF',
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(45, 212, 191, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                        propsForBackgroundLines: { strokeDasharray: '', stroke: '#E2E8F0' },
                      }}
                      style={styles.chart}
                      formatYLabel={(v) => `${Number(v)}`}
                    />
                  )
                ) : growthWeightChartData.labels.length === 0 ? (
                  <View style={styles.growthEmptyWrap}>
                    <Text style={styles.growthEmptyText}>暂无体重记录</Text>
                    <Text style={styles.growthEmptySubtext}>在首页「成长」中添加体重后即可查看趋势</Text>
                  </View>
                ) : (
                  <LineChart
                    data={growthWeightChartData as any}
                    width={chartWidth}
                    height={260}
                    withDots={true}
                    withInnerLines={true}
                    withOuterLines={true}
                    fromZero
                    bezier
                    chartConfig={{
                      backgroundColor: '#FFFFFF',
                      backgroundGradientFrom: '#FFFFFF',
                      backgroundGradientTo: '#FFFFFF',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                      propsForBackgroundLines: { strokeDasharray: '', stroke: '#E2E8F0' },
                    }}
                    style={styles.chart}
                    formatYLabel={(v) => `${Number(v)}`}
                  />
                )}
              </View>
              <Text style={styles.helperText}>
                {growthChartMetric === 'height'
                  ? '身高 (cm) · 按记录时间排序'
                  : '体重 (kg) · 按记录时间排序'}
              </Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={sleepDistModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSleepDistModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setSleepDistModalVisible(false)}>
              <View style={styles.modalBackdropTouch} />
            </TouchableWithoutFeedback>
            <View style={styles.trendModalContent}>
              <View style={styles.growthModalHeader}>
                <Text style={styles.trendModalTitle}>睡眠分布</Text>
                <TouchableOpacity
                  onPress={() => setSleepDistModalVisible(false)}
                  style={styles.trendModalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.trendModalCloseText}>关闭</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.growthModalBody}>
                <View style={[styles.chartWrap, { width: chartWidth }]}>
                  {!currentBaby ? (
                    <View style={styles.growthEmptyWrap}>
                      <Text style={styles.growthEmptyText}>请先选择宝宝</Text>
                    </View>
                  ) : (
                    <LineChart
                      data={sleepDistributionChartData as any}
                      width={chartWidth}
                      height={260}
                      withDots={true}
                      withInnerLines={true}
                      withOuterLines={true}
                      fromZero
                      bezier
                      chartConfig={{
                        backgroundColor: '#FFFFFF',
                        backgroundGradientFrom: '#FFFFFF',
                        backgroundGradientTo: '#FFFFFF',
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                        propsForBackgroundLines: { strokeDasharray: '', stroke: '#E2E8F0' },
                      }}
                      style={styles.chart}
                      formatYLabel={(v) => `${Number(v)}h`}
                    />
                  )}
                </View>
                <Text style={styles.helperText}>近 7 天每日睡眠总时长（小时）</Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={trendChartModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTrendChartModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setTrendChartModalVisible(false)}>
              <View style={styles.modalBackdropTouch} />
            </TouchableWithoutFeedback>
            <View style={styles.trendModalContent}>
              <View style={styles.trendModalHeader}>
                <Text style={styles.trendModalTitle}>综合趋势 · {TREND_METRIC_LABELS[trendMetric]}</Text>
                <TouchableOpacity
                  onPress={() => setTrendChartModalVisible(false)}
                  style={styles.trendModalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.trendModalCloseText}>关闭</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.trendModalScroll}
                contentContainerStyle={styles.trendModalScrollContent}
                showsVerticalScrollIndicator={true}
                bounces={false}
                overScrollMode="never"
              >
                <View style={styles.chartTypeRow}>
                  <TouchableOpacity
                    style={[styles.chartTypeBtn, chartType === 'total' && styles.chartTypeBtnActive]}
                    onPress={() => setChartType('total')}
                  >
                    <Text style={[styles.chartTypeBtnText, chartType === 'total' && styles.chartTypeBtnTextActive]}>
                      总量分布
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chartTypeBtn, chartType === 'time' && styles.chartTypeBtnActive]}
                    onPress={() => setChartType('time')}
                  >
                    <Text style={[styles.chartTypeBtnText, chartType === 'time' && styles.chartTypeBtnTextActive]}>
                      时刻分布
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.chartWrap, { width: chartWidth }]}>
                  {trendChartEmpty ? (
                    <View style={styles.growthEmptyWrap}>
                      <Text style={styles.growthEmptyText}>暂无{TREND_METRIC_LABELS[trendMetric]}记录</Text>
                      <Text style={styles.growthEmptySubtext}>在首页添加对应记录后即可查看趋势</Text>
                    </View>
                  ) : chartType === 'total' ? (
                    <LineChart
                      data={singleTrendChartData as any}
                      width={chartWidth}
                      height={260}
                      withDots={true}
                      withInnerLines={true}
                      withOuterLines={true}
                      fromZero
                      bezier
                      yAxisInterval={
                        trendMetric === 'diaper' || trendMetric === 'medicine' || trendMetric === 'solid' ? 1 : undefined
                      }
                      segments={
                        trendMetric === 'diaper' || trendMetric === 'medicine' || trendMetric === 'solid'
                          ? (() => {
                              const data = singleTrendChartData?.datasets?.[0]?.data ?? [];
                              const maxVal = data.length ? Math.max(...(data as number[]), 0) : 0;
                              return maxVal <= 1 ? (maxVal === 0 ? 1 : 2) : Math.floor(maxVal);
                            })()
                          : undefined
                      }
                      chartConfig={{
                        backgroundColor: '#FFFFFF',
                        backgroundGradientFrom: '#FFFFFF',
                        backgroundGradientTo: '#FFFFFF',
                        decimalPlaces: 0,
                        color: (opacity = 1) => {
                          const hex = TREND_METRIC_COLORS[trendMetric];
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                        },
                        labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                        propsForBackgroundLines: { strokeDasharray: '', stroke: '#E2E8F0' },
                      }}
                      style={styles.chart}
                      formatYLabel={formatTrendYLabel}
                    />
                  ) : (
                    <TimeDistributionScatterChart
                      width={chartWidth}
                      height={1200}
                      points={timeDistributionScatterPoints}
                      daysInRange={daysInRange}
                      color={TREND_METRIC_COLORS[trendMetric]}
                      viewMode={viewMode}
                    />
                  )}
                </View>
                {!trendChartEmpty && (
                  <Text style={styles.helperText}>
                    {chartType === 'total'
                      ? viewMode === 'week'
                        ? `按天统计（周一到周日）· ${TREND_METRIC_LABELS[trendMetric]}${trendMetric === 'milk' ? '(ml)' : trendMetric === 'sleep' ? '(分钟)' : '(次)'}`
                        : `按周统计（本月按周汇总）· ${TREND_METRIC_LABELS[trendMetric]}${trendMetric === 'milk' ? '(ml)' : trendMetric === 'sleep' ? '(分钟)' : '(次)'}`
                      : `X 轴=日期，Y 轴=时刻(0~24)· 每点为一笔${TREND_METRIC_LABELS[trendMetric]}记录，可对比各日分布`}
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
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
  viewModeRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#2DD4BF',
  },
  viewModeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  viewModeBtnTextActive: {
    color: '#FFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  nowBtn: {
    alignSelf: 'center',
    marginTop: 8,
  },
  nowBtnText: {
    fontSize: 13,
    color: '#2DD4BF',
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  chartTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chartTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  chartTypeBtnActive: {
    backgroundColor: '#14B8A6',
  },
  chartTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  chartTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  chartWrap: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  trendModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  trendModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  trendModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  trendModalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  trendModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14B8A6',
  },
  trendModalScroll: {
    maxHeight: 500,
  },
  trendModalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (screenWidth - 16 * 2 - 12) / 2,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardMint: {
    backgroundColor: '#CCFBF1',
  },
  statCardBlue: {
    backgroundColor: '#BFDBFE',
  },
  statCardOrange: {
    backgroundColor: '#FED7AA',
  },
  statCardPurple: {
    backgroundColor: '#E9D5FF',
  },
  statCardYellow: {
    backgroundColor: '#FEF9C3',
  },
  statCardGreen: {
    backgroundColor: '#D1FAE5',
  },
  statCardCoral: {
    backgroundColor: '#FFE4E6',
  },
  growthModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  growthModalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  growthChartTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  growthEmptyWrap: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  growthEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  growthEmptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
  },
});
