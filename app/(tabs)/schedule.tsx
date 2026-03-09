import React, { useCallback, useMemo, useState } from 'react';
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
  Keyboard,
  Platform,
  PanResponder,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HORIZONTAL_PADDING, MODAL_MAX_WIDTH } from '@/utils/layout';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react-native';
import { storage } from '@/utils/storage';
import { scheduleEventNotification, cancelEventNotification, syncScheduleNotifications } from '@/utils/scheduleReminder';
import { ScheduleEvent, ScheduleTaskType } from '@/types';

const TASK_TYPES = ['shopping', 'memo', 'checkup', 'outing', 'other'] as const;
type TaskTypeKey = (typeof TASK_TYPES)[number];

const TASK_TYPE_COLORS: Record<TaskTypeKey, string> = {
  shopping: '#F97316',
  memo: '#EAB308',
  checkup: '#3B82F6',
  outing: '#22C55E',
  other: '#94A3B8',
};

const TASK_TYPE_LABELS: Record<TaskTypeKey, string> = {
  shopping: '购物',
  memo: '备忘',
  checkup: '宝宝相关',
  outing: '外出',
  other: '其他',
};

function getTaskColor(type: ScheduleTaskType): string {
  return TASK_TYPE_COLORS[type as TaskTypeKey] ?? TASK_TYPE_COLORS.other;
}
function getTaskLabel(type: ScheduleTaskType): string {
  return TASK_TYPE_LABELS[type as TaskTypeKey] ?? TASK_TYPE_LABELS.other;
}

const NEW_TASK_TYPES: TaskTypeKey[] = ['shopping', 'memo', 'checkup', 'outing', 'other'];

/** 日程与宝宝无关，统一使用此 id 存储与筛选 */
const SCHEDULE_OWNER_ID = '_schedule';

export default function ScheduleScreen() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<TaskTypeKey>('other');
  const [eventDateStr, setEventDateStr] = useState('');
  const [eventTimeStr, setEventTimeStr] = useState('12:00');
  const [eventNotes, setEventNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [monthViewExpanded, setMonthViewExpanded] = useState(false);
  /** 本月全览当前显示的月份（当月 1 号），用于切换上月/下月 */
  const [monthViewMonth, setMonthViewMonth] = useState(() => startOfMonth(new Date()));
  /** 正在编辑的任务，非空时弹窗为编辑模式 */
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const loadEvents = useCallback(async () => {
    const all = await storage.getSchedule();
    setEvents(all);
    await syncScheduleNotifications(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  /** 某天有任务的颜色集合（去重，用于日历上的点） */
  const getDayColors = useCallback(
    (day: Date) => {
      const dayEvents = events.filter(
        (e) => e.babyId === SCHEDULE_OWNER_ID && isSameDay(new Date(e.time), day)
      );
      const colors = Array.from(new Set(dayEvents.map((e) => getTaskColor(e.type))));
      return colors.slice(0, 4);
    },
    [events]
  );

  /** 某天全部任务（按时间排序，用于月历格子下多行任务标题） */
  const getDayEvents = useCallback(
    (day: Date): ScheduleEvent[] => {
      return events
        .filter(
          (e) => e.babyId === SCHEDULE_OWNER_ID && isSameDay(new Date(e.time), day)
        )
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    },
    [events]
  );

  /** 下滑展开本月全览、上滑收起（用 PanResponder 避免 Expo Go 闪退） */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, { dy, vy }) => {
          const swipeDown = dy > 15 && vy > 0;
          const swipeUp = dy < -15 && vy < 0;
          return swipeDown || swipeUp;
        },
        onPanResponderRelease: (_, { dy, vy }) => {
          if (dy > 40 && vy > 0) {
            setMonthViewExpanded(true);
            setMonthViewMonth(startOfMonth(weekStart));
          }
          if (dy < -40 && vy < 0) setMonthViewExpanded(false);
        },
      }),
    [weekStart]
  );

  /** 本月全览：以周为行的日期格，由 monthViewMonth 决定显示哪月 */
  const monthViewGrid = useMemo(() => {
    const monthStart = startOfMonth(monthViewMonth);
    const monthEnd = endOfMonth(monthViewMonth);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });
    const rows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      rows.push(allDays.slice(i, i + 7));
    }
    return { monthStart, monthEnd, rows };
  }, [monthViewMonth]);

  /** 选中日期的任务：未完成在上，已完成在下 */
  const selectedDayEvents = useMemo(() => {
    const dayEvents = events
      .filter(
        (e) => e.babyId === SCHEDULE_OWNER_ID && isSameDay(new Date(e.time), selectedDate)
      )
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const pending = dayEvents.filter((e) => !e.completed);
    const completed = dayEvents.filter((e) => e.completed);
    return { pending, completed };
  }, [events, selectedDate]);

  const toggleComplete = useCallback(
    async (evt: ScheduleEvent) => {
      const updated = { ...evt, completed: !evt.completed };
      await storage.updateScheduleEvent(updated);
      if (updated.completed) await cancelEventNotification(evt.id);
      await loadEvents();
    },
    [loadEvents]
  );

  const openAddModal = useCallback(() => {
    setEditingEvent(null);
    setEventTitle('');
    setEventType('other');
    setEventDateStr(format(selectedDate, 'yyyy-MM-dd'));
    setEventTimeStr(format(new Date(), 'HH:mm'));
    setEventNotes('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setModalVisible(true);
  }, [selectedDate]);

  const openEditModal = useCallback((evt: ScheduleEvent) => {
    setEditingEvent(evt);
    setEventTitle(evt.title);
    setEventType(evt.type as TaskTypeKey);
    setEventDateStr(format(new Date(evt.time), 'yyyy-MM-dd'));
    setEventTimeStr(format(new Date(evt.time), 'HH:mm'));
    setEventNotes(evt.notes ?? '');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setModalVisible(true);
  }, []);

  const handleDeleteEvent = useCallback(
    (evt: ScheduleEvent) => {
      Alert.alert('删除任务', `确定删除「${evt.title}」吗？`, [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: async () => {
          await storage.deleteScheduleEvent(evt.id);
          await cancelEventNotification(evt.id);
          await loadEvents();
          if (editingEvent?.id === evt.id) {
            setModalVisible(false);
            setEditingEvent(null);
          }
        }},
      ]);
    },
    [loadEvents, editingEvent]
  );

  const saveNewEvent = useCallback(async () => {
    if (!eventTitle.trim()) return;
    const datePart = eventDateStr.trim() || format(selectedDate, 'yyyy-MM-dd');
    const [y, mo, d] = datePart.split('-').map(Number);
    const [h, min] = eventTimeStr.split(':').map(Number);
    const eventDate = new Date(
      Number.isFinite(y) ? y : selectedDate.getFullYear(),
      Number.isFinite(mo) ? mo - 1 : selectedDate.getMonth(),
      Number.isFinite(d) ? d : selectedDate.getDate(),
      Number.isFinite(h) ? h : 12,
      Number.isFinite(min) ? min : 0,
      0,
      0
    );
    if (editingEvent) {
      const updated: ScheduleEvent = {
        ...editingEvent,
        title: eventTitle.trim(),
        type: eventType,
        time: eventDate.toISOString(),
        notes: eventNotes.trim() || undefined,
      };
      await storage.updateScheduleEvent(updated);
      await scheduleEventNotification(updated);
    } else {
      const newEvent: ScheduleEvent = {
        id: Date.now().toString(),
        babyId: SCHEDULE_OWNER_ID,
        title: eventTitle.trim(),
        type: eventType,
        time: eventDate.toISOString(),
        notes: eventNotes.trim() || undefined,
        completed: false,
      };
      await storage.saveScheduleEvent(newEvent);
      await scheduleEventNotification(newEvent);
    }
    await loadEvents();
    setModalVisible(false);
    setEditingEvent(null);
  }, [editingEvent, eventTitle, eventDateStr, eventTimeStr, eventNotes, eventType, selectedDate, loadEvents]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* 日程栏：不参与整页滚动，下滑此区域展开本月全览 */}
        <View style={[styles.calendarCard, styles.calendarCardFixed]} {...panResponder.panHandlers}>
            {!monthViewExpanded ? (
              <>
                <View style={styles.weekNav}>
                  <TouchableOpacity onPress={() => setWeekStart((d) => subWeeks(d, 1))} style={styles.navBtn}>
                    <ChevronLeft size={24} color="#64748B" />
                  </TouchableOpacity>
                  <Text style={styles.weekTitle}>
                    {format(weekStart, 'M月d日', { locale: zhCN })} - {format(weekEnd, 'M月d日', { locale: zhCN })}
                  </Text>
                  <TouchableOpacity onPress={() => setWeekStart((d) => addWeeks(d, 1))} style={styles.navBtn}>
                    <ChevronRight size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.weekDays}>
                  {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                    <Text key={d} style={styles.weekDayLabel}>
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={styles.daysRow}>
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    const dayColors = getDayColors(day);
                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.dayCell,
                          isToday && styles.dayToday,
                          isSelected && styles.daySelected,
                        ]}
                        onPress={() => setSelectedDate(day)}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            isToday && styles.dayTodayText,
                            isSelected && styles.daySelectedText,
                          ]}
                        >
                          {format(day, 'd')}
                        </Text>
                        <View style={styles.dotsRow}>
                          {dayColors.map((c, i) => (
                            <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.calendarPullHint}>下滑展开本月全览</Text>
              </>
            ) : (
              <>
                <View style={styles.monthViewNav}>
                  <TouchableOpacity
                    onPress={() => setMonthViewMonth((m) => subMonths(m, 1))}
                    style={styles.monthViewNavBtn}
                  >
                    <ChevronLeft size={24} color="#64748B" />
                  </TouchableOpacity>
                  <Text style={styles.monthViewTitle}>
                    {format(monthViewGrid.monthStart, 'yyyy年M月', { locale: zhCN })} 全览 · 上滑收起
                  </Text>
                  <TouchableOpacity
                    onPress={() => setMonthViewMonth((m) => addMonths(m, 1))}
                    style={styles.monthViewNavBtn}
                  >
                    <ChevronRight size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.monthViewWeekDays}>
                  {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                    <Text key={d} style={styles.monthViewWeekDayLabel}>
                      {d}
                    </Text>
                  ))}
                </View>
                {monthViewGrid.rows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.monthViewRow}>
                    {row.map((day) => {
                      const inMonth = isWithinInterval(day, {
                        start: monthViewGrid.monthStart,
                        end: monthViewGrid.monthEnd,
                      });
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);
                      const dayEvents = getDayEvents(day);
                      return (
                        <TouchableOpacity
                          key={day.toISOString()}
                          style={[
                            styles.monthViewCell,
                            !inMonth && styles.monthViewCellOut,
                            isToday && styles.monthViewCellToday,
                            isSelected && styles.monthViewCellSelected,
                          ]}
                          onPress={() => setSelectedDate(day)}
                        >
                          {inMonth ? (
                            <>
                              <Text
                                style={[
                                  styles.monthViewDayNum,
                                  isToday && styles.monthViewDayNumToday,
                                  isSelected && styles.monthViewDayNumSelected,
                                ]}
                              >
                                {format(day, 'd')}
                              </Text>
                              <View style={styles.monthViewTasksWrap}>
                                {dayEvents.map((evt) => (
                                  <View
                                    key={evt.id}
                                    style={[
                                      styles.monthViewTaskChip,
                                      { backgroundColor: getTaskColor(evt.type) },
                                      isSelected && styles.monthViewTaskChipSelected,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.monthViewTaskTitle,
                                        isSelected && styles.monthViewTaskTitleSelected,
                                      ]}
                                      numberOfLines={1}
                                      ellipsizeMode="tail"
                                    >
                                      {evt.title}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </>
                          ) : (
                            <Text style={styles.monthViewDayNumOut}>{format(day, 'd')}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </View>

        {/* 选中日期与任务列表（仅此区域可滚动） */}
        <ScrollView
          style={styles.tasksScroll}
          contentContainerStyle={styles.tasksScrollContent}
          showsVerticalScrollIndicator={true}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.tasksSection}>
            <View style={styles.tasksHeader}>
              <View>
                <Text style={styles.tasksTitle}>
                  {isSameDay(selectedDate, new Date()) ? '今天' : '所选日期'}
                </Text>
                <Text style={styles.tasksDate}>
                  {format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
                </Text>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                <Plus size={20} color="#FFF" />
                <Text style={styles.addButtonText}>新建任务</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tasksList}>
              {selectedDayEvents.pending.length === 0 && selectedDayEvents.completed.length === 0 && (
                <Text style={styles.emptyText}>当日暂无任务</Text>
              )}
              {selectedDayEvents.pending.map((evt) => (
                <TaskItem
                  key={evt.id}
                  event={evt}
                  completed={false}
                  onPress={() => toggleComplete(evt)}
                  onEdit={() => openEditModal(evt)}
                  onDelete={() => handleDeleteEvent(evt)}
                />
              ))}
              {selectedDayEvents.completed.length > 0 && (
                <View style={styles.completedBlock}>
                  <Text style={styles.completedLabel}>已完成</Text>
                  {selectedDayEvents.completed.map((evt) => (
                    <TaskItem
                      key={evt.id}
                      event={evt}
                      completed
                      onPress={() => toggleComplete(evt)}
                      onEdit={() => openEditModal(evt)}
                      onDelete={() => handleDeleteEvent(evt)}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingEvent ? '编辑任务' : '新建任务'}</Text>
            <TextInput
              style={styles.input}
              placeholder="任务标题（如：买奶粉、宝宝儿保）"
              placeholderTextColor="#64748B"
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            <Text style={styles.label}>类型</Text>
            <View style={styles.typeRow}>
              {NEW_TASK_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: TASK_TYPE_COLORS[t as TaskTypeKey] },
                    eventType === t && { backgroundColor: TASK_TYPE_COLORS[t as TaskTypeKey] },
                  ]}
                  onPress={() => setEventType(t)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      eventType === t && styles.typeChipTextActive,
                    ]}
                  >
                    {TASK_TYPE_LABELS[t as TaskTypeKey]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>日期</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {eventDateStr.trim()
                  ? format(new Date(eventDateStr.trim() + 'T12:00:00'), 'yyyy年MM月dd日')
                  : format(selectedDate, 'yyyy年MM月dd日')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>时间</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {eventTimeStr.trim() || '12:00'}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={
                  eventDateStr.trim()
                    ? new Date(eventDateStr.trim() + 'T12:00:00')
                    : selectedDate
                }
                mode="date"
                display="default"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setEventDateStr(format(date, 'yyyy-MM-dd'));
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
                          eventDateStr.trim()
                            ? new Date(eventDateStr.trim() + 'T12:00:00')
                            : selectedDate
                        }
                        mode="date"
                        display="spinner"
                        locale="zh-CN"
                        themeVariant="light"
                        textColor="#1E293B"
                        onChange={(_, date) => date && setEventDateStr(format(date, 'yyyy-MM-dd'))}
                        style={styles.bottomDateTimePicker}
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [h, m] = eventTimeStr.split(':').map(Number);
                  const d = eventDateStr.trim()
                    ? new Date(eventDateStr.trim() + 'T12:00:00')
                    : new Date(selectedDate.getTime());
                  if (Number.isFinite(h)) d.setHours(h);
                  if (Number.isFinite(m)) d.setMinutes(m);
                  return d;
                })()}
                mode="time"
                display="default"
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) setEventTimeStr(format(date, 'HH:mm'));
                }}
              />
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
                        value={(() => {
                          const [h, m] = eventTimeStr.split(':').map(Number);
                          const d = eventDateStr.trim()
                            ? new Date(eventDateStr.trim() + 'T12:00:00')
                            : new Date(selectedDate.getTime());
                          if (Number.isFinite(h)) d.setHours(h);
                          if (Number.isFinite(m)) d.setMinutes(m);
                          return d;
                        })()}
                        mode="time"
                        display="spinner"
                        themeVariant="light"
                        textColor="#1E293B"
                        onChange={(_, date) => date && setEventTimeStr(format(date, 'HH:mm'))}
                        style={styles.bottomDateTimePicker}
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'web' && (showDatePicker || showTimePicker) && (
              <View style={styles.webDateTimeRow}>
                {showDatePicker && (
                  <TextInput
                    style={styles.webDateInput}
                    {...({ type: 'date' } as any)}
                    value={eventDateStr || format(selectedDate, 'yyyy-MM-dd')}
                    onChangeText={(v) => {
                      setEventDateStr(v);
                      setShowDatePicker(false);
                    }}
                    onBlur={() => setShowDatePicker(false)}
                  />
                )}
                {showTimePicker && (
                  <TextInput
                    style={styles.webDateInput}
                    {...({ type: 'time' } as any)}
                    value={eventTimeStr}
                    onChangeText={(v) => {
                      setEventTimeStr(v);
                      setShowTimePicker(false);
                    }}
                    onBlur={() => setShowTimePicker(false)}
                  />
                )}
              </View>
            )}
            <Text style={styles.label}>备注（可选）</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="补充说明"
              placeholderTextColor="#64748B"
              value={eventNotes}
              onChangeText={setEventNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveNewEvent}>
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

function TaskItem({
  event,
  completed,
  onPress,
  onEdit,
  onDelete,
}: {
  event: ScheduleEvent;
  completed: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = getTaskColor(event.type);
  return (
    <View style={styles.taskItem}>
      <TouchableOpacity
        style={styles.taskItemMain}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.taskColorBar, { backgroundColor: color }]} />
        <View style={styles.taskBody}>
          <Text
            style={[
              styles.taskTitle,
              completed && styles.taskTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <Text style={styles.taskMeta}>
            {format(new Date(event.time), 'HH:mm')}
            {' · '}
            {getTaskLabel(event.type)}
            {event.notes ? ` · ${event.notes}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.taskItemAction}
        onPress={onEdit}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Pencil size={18} color="#64748B" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.taskItemAction}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Trash2 size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  /** 周历区域固定高度，便于下滑手势识别，且不随整页滚动 */
  calendarCardFixed: {
    minHeight: 200,
  },
  tasksScroll: {
    flex: 1,
  },
  tasksScrollContent: {
    paddingBottom: 24,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  weekTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  dayToday: {
    backgroundColor: '#FEF08A',
  },
  daySelected: {
    backgroundColor: '#0F766E',
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayTodayText: {
    color: '#0F766E',
  },
  daySelectedText: {
    color: '#FFF',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarPullHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  monthViewNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthViewNavBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  monthViewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthViewWeekDays: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  monthViewWeekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  monthViewRow: {
    flexDirection: 'row',
  },
  monthViewCell: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
    margin: 1,
    borderRadius: 8,
  },
  monthViewTasksWrap: {
    width: '100%',
    marginTop: 4,
    gap: 2,
  },
  monthViewTaskChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '100%',
  },
  monthViewTaskChipSelected: {
    opacity: 0.95,
  },
  monthViewCellOut: {
    opacity: 0.35,
  },
  monthViewCellToday: {
    backgroundColor: '#FEF08A',
  },
  monthViewCellSelected: {
    backgroundColor: '#0F766E',
  },
  monthViewDayNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthViewDayNumToday: {
    color: '#0F766E',
  },
  monthViewDayNumSelected: {
    color: '#FFF',
  },
  monthViewDayNumOut: {
    fontSize: 12,
    color: '#94A3B8',
  },
  monthViewTaskTitle: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '500',
    maxWidth: '100%',
  },
  monthViewTaskTitleSelected: {
    color: '#FFF',
  },
  tasksSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  tasksDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  tasksList: {
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    paddingVertical: 24,
    textAlign: 'center',
  },
  completedBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  completedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  taskColorBar: {
    width: 4,
  },
  taskBody: {
    flex: 1,
    padding: 12,
  },
  taskItemAction: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#EF4444',
  },
  taskMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
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
  webDateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  typeChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
