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
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HORIZONTAL_PADDING, MODAL_MAX_WIDTH } from '@/utils/layout';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, ArrowDownCircle, ArrowUpCircle, Trash2, Wallet, Baby, Search } from 'lucide-react-native';
import { storage } from '@/utils/storage';
import {
  GiftLedgerRecord,
  GiftLedgerType,
  GiftLedgerCategory,
  GiftLedgerScope,
} from '@/types';

const CATEGORY_LABELS: Record<GiftLedgerCategory, string> = {
  wedding: '婚礼',
  baby_full: '满月',
  birthday: '生日',
  new_year: '过年',
  other: '其他',
};

type FilterType = 'all' | 'income' | 'expense';

export default function CommunityScreen() {
  const [records, setRecords] = useState<GiftLedgerRecord[]>([]);
  /** 当前查看/记一笔的账本：家庭礼部 或 宝宝收支 */
  const [ledgerScope, setLedgerScope] = useState<GiftLedgerScope>('family');
  const [filter, setFilter] = useState<FilterType>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [formType, setFormType] = useState<GiftLedgerType>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDateStr, setFormDateStr] = useState('');
  const [formCategory, setFormCategory] = useState<GiftLedgerCategory>('other');
  const [formNote, setFormNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const loadRecords = useCallback(async () => {
    const list = await storage.getGiftLedger();
    setRecords(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  /** 当前账本下的记录（家庭礼部 或 宝宝收支） */
  const scopeRecords = useMemo(
    () => records.filter((r) => (r.scope ?? 'family') === ledgerScope),
    [records, ledgerScope]
  );

  const totalIncome = useMemo(
    () => scopeRecords.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0),
    [scopeRecords]
  );
  const totalExpense = useMemo(
    () => scopeRecords.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
    [scopeRecords]
  );
  const balance = totalIncome - totalExpense;

  /** 按分类统计：各分类的收入与支出 */
  const categoryStats = useMemo(() => {
    const categories: GiftLedgerCategory[] = ['wedding', 'baby_full', 'birthday', 'new_year', 'other'];
    return categories.map((category) => {
      const list = scopeRecords.filter((r) => r.category === category);
      const income = list.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
      const expense = list.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      return { category, income, expense, count: list.length };
    }).filter((row) => row.count > 0);
  }, [scopeRecords]);

  const filteredRecords = useMemo(() => {
    let list = [...scopeRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (filter === 'income') list = list.filter((r) => r.type === 'income');
    if (filter === 'expense') list = list.filter((r) => r.type === 'expense');
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter((r) => {
        const note = (r.note ?? '').toLowerCase();
        const categoryLabel = CATEGORY_LABELS[r.category].toLowerCase();
        const dateStr = r.date;
        const dateDisplay = format(new Date(r.date), 'yyyy年M月d日', { locale: zhCN }).toLowerCase();
        const amountStr = String(r.amount);
        return (
          note.includes(kw) ||
          categoryLabel.includes(kw) ||
          dateStr.includes(kw) ||
          dateDisplay.includes(kw) ||
          amountStr.includes(kw)
        );
      });
    }
    return list;
  }, [scopeRecords, filter, searchKeyword]);

  const openAddModal = useCallback(() => {
    setFormType('income');
    setFormAmount('');
    setFormDateStr(format(new Date(), 'yyyy-MM-dd'));
    setFormCategory('other');
    setFormNote('');
    setShowDatePicker(false);
    setModalVisible(true);
  }, []);

  const saveRecord = useCallback(async () => {
    const amount = parseFloat(formAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const dateStr = formDateStr.trim() || format(new Date(), 'yyyy-MM-dd');
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return;
    const record: GiftLedgerRecord = {
      id: Date.now().toString(),
      type: formType,
      amount: Math.round(amount * 100) / 100,
      date: parsed.toISOString().slice(0, 10),
      category: formCategory,
      note: formNote.trim() || undefined,
      createdAt: new Date().toISOString(),
      scope: ledgerScope,
    };
    await storage.saveGiftLedgerRecord(record);
    await loadRecords();
    setModalVisible(false);
  }, [ledgerScope, formType, formAmount, formDateStr, formCategory, formNote, loadRecords]);

  const deleteRecord = useCallback(
    (record: GiftLedgerRecord) => {
      const msg = `确定删除这条${record.type === 'income' ? '收入' : '支出'}记录？`;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm(`删除记录\n\n${msg}`)) {
          storage.deleteGiftLedgerRecord(record.id);
          loadRecords();
        }
        return;
      }
      Alert.alert('删除记录', msg, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteGiftLedgerRecord(record.id);
            loadRecords();
          },
        },
      ]);
    },
    [loadRecords]
  );

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
        <View style={styles.scopeTabs}>
          <TouchableOpacity
            style={[styles.scopeTab, ledgerScope === 'family' && styles.scopeTabActive]}
            onPress={() => setLedgerScope('family')}
          >
            <Wallet size={20} color={ledgerScope === 'family' ? '#FFF' : '#64748B'} />
            <Text
              style={[
                styles.scopeTabText,
                ledgerScope === 'family' && styles.scopeTabTextActive,
              ]}
            >
              家庭礼部
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeTab, ledgerScope === 'baby' && styles.scopeTabActive]}
            onPress={() => setLedgerScope('baby')}
          >
            <Baby size={20} color={ledgerScope === 'baby' ? '#FFF' : '#64748B'} />
            <Text
              style={[
                styles.scopeTabText,
                ledgerScope === 'baby' && styles.scopeTabTextActive,
              ]}
            >
              宝宝收支
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ArrowDownCircle size={20} color="#22C55E" />
              <Text style={styles.summaryLabel}>总收入</Text>
              <Text style={[styles.summaryValue, styles.incomeValue]}>
                ¥{totalIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <ArrowUpCircle size={20} color="#EF4444" />
              <Text style={styles.summaryLabel}>总支出</Text>
              <Text style={[styles.summaryValue, styles.expenseValue]}>
                ¥{totalExpense.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>结余</Text>
            <Text
              style={[
                styles.balanceValue,
                balance >= 0 ? styles.balancePositive : styles.balanceNegative,
              ]}
            >
              ¥{balance.toFixed(2)}
            </Text>
          </View>
        </View>

        {categoryStats.length > 0 && (
          <View style={styles.categoryStatsCard}>
            <Text style={styles.categoryStatsTitle}>按分类统计</Text>
            {categoryStats.map(({ category, income, expense, count }) => (
              <View key={category} style={styles.categoryStatsRow}>
                <Text style={styles.categoryStatsLabel}>{CATEGORY_LABELS[category]}</Text>
                <View style={styles.categoryStatsValues}>
                  <Text style={styles.categoryStatsIncome}>收 ¥{income.toFixed(2)}</Text>
                  <Text style={styles.categoryStatsExpense}>支 ¥{expense.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && styles.filterChipTextActive,
                ]}
              >
                {f === 'all' ? '全部' : f === 'income' ? '收入' : '支出'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchWrap}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索备注、分类、日期或金额"
            placeholderTextColor="#94A3B8"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            returnKeyType="search"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity
              style={styles.searchClear}
              onPress={() => setSearchKeyword('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.searchClearText}>清除</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>收支记录</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={18} color="#FFF" />
            <Text style={styles.addButtonText}>记一笔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordList}>
          {filteredRecords.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchKeyword.trim()
                ? `未找到匹配「${searchKeyword.trim()}」的记录`
                : filter === 'all'
                ? '暂无记录，点击「记一笔」添加'
                : filter === 'income'
                ? '暂无收入记录'
                : '暂无支出记录'}
            </Text>
          ) : (
            filteredRecords.map((record) => (
              <View key={record.id} style={styles.recordItem}>
                <View
                  style={[
                    styles.recordIconWrap,
                    record.type === 'income'
                      ? styles.recordIconIncome
                      : styles.recordIconExpense,
                  ]}
                >
                  {record.type === 'income' ? (
                    <ArrowDownCircle size={20} color="#22C55E" />
                  ) : (
                    <ArrowUpCircle size={20} color="#EF4444" />
                  )}
                </View>
                <View style={styles.recordBody}>
                  <Text style={styles.recordCategory}>
                    {CATEGORY_LABELS[record.category]}
                    {record.note ? ` · ${record.note}` : ''}
                  </Text>
                  <Text style={styles.recordDate}>
                    {format(new Date(record.date), 'yyyy年M月d日', { locale: zhCN })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.recordAmount,
                    record.type === 'income' ? styles.recordAmountIncome : styles.recordAmountExpense,
                  ]}
                >
                  {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteRecord(record)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {ledgerScope === 'family' ? '记一笔 · 家庭礼部' : '记一笔 · 宝宝收支'}
              </Text>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  formType === 'income' && styles.typeBtnIncome,
                ]}
                onPress={() => setFormType('income')}
              >
                <ArrowDownCircle size={20} color={formType === 'income' ? '#FFF' : '#22C55E'} />
                <Text
                  style={[
                    styles.typeBtnText,
                    formType === 'income' && styles.typeBtnTextActive,
                  ]}
                >
                  收入
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  formType === 'expense' && styles.typeBtnExpense,
                ]}
                onPress={() => setFormType('expense')}
              >
                <ArrowUpCircle size={20} color={formType === 'expense' ? '#FFF' : '#EF4444'} />
                <Text
                  style={[
                    styles.typeBtnText,
                    formType === 'expense' && styles.typeBtnTextActive,
                  ]}
                >
                  支出
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>金额（元）</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              value={formAmount}
              onChangeText={setFormAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>日期</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formDateStr.trim()
                  ? format(new Date(formDateStr.trim() + 'T12:00:00'), 'yyyy年MM月dd日')
                  : '选择日期'}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={
                  formDateStr.trim()
                    ? new Date(formDateStr.trim() + 'T12:00:00')
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setFormDateStr(format(date, 'yyyy-MM-dd'));
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
                          formDateStr.trim()
                            ? new Date(formDateStr.trim() + 'T12:00:00')
                            : new Date()
                        }
                        mode="date"
                        display="spinner"
                        locale="zh-CN"
                        themeVariant="light"
                        textColor="#1E293B"
                        onChange={(_, date) => date && setFormDateStr(format(date, 'yyyy-MM-dd'))}
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
                value={formDateStr || format(new Date(), 'yyyy-MM-dd')}
                onChangeText={(v) => {
                  setFormDateStr(v);
                  setShowDatePicker(false);
                }}
                onBlur={() => setShowDatePicker(false)}
              />
            )}

            <Text style={styles.label}>分类</Text>
            <View style={styles.categoryRow}>
              {(
                ['wedding', 'baby_full', 'birthday', 'new_year', 'other'] as GiftLedgerCategory[]
              ).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.categoryChip,
                    formCategory === c && styles.categoryChipActive,
                  ]}
                  onPress={() => setFormCategory(c)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formCategory === c && styles.categoryChipTextActive,
                    ]}
                  >
                    {CATEGORY_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>备注（可选）</Text>
            <TextInput
              style={styles.input}
              placeholder="如：张三结婚"
              placeholderTextColor="#64748B"
              value={formNote}
              onChangeText={setFormNote}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRecord}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
  },
  scopeTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scopeTabActive: {
    backgroundColor: '#0F766E',
  },
  scopeTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeTabTextActive: {
    color: '#FFF',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  incomeValue: {
    color: '#22C55E',
  },
  expenseValue: {
    color: '#EF4444',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  balancePositive: {
    color: '#0F766E',
  },
  balanceNegative: {
    color: '#EF4444',
  },
  categoryStatsCard: {
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
  categoryStatsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  categoryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryStatsLabel: {
    fontSize: 14,
    color: '#475569',
  },
  categoryStatsValues: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryStatsIncome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  categoryStatsExpense: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: '#0F766E',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 0,
    paddingRight: 12,
  },
  searchClear: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  searchClearText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  recordList: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    paddingVertical: 32,
    textAlign: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recordIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordIconIncome: {
    backgroundColor: '#DCFCE7',
  },
  recordIconExpense: {
    backgroundColor: '#FEE2E2',
  },
  recordBody: {
    flex: 1,
  },
  recordCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  recordDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  recordAmountIncome: {
    color: '#22C55E',
  },
  recordAmountExpense: {
    color: '#EF4444',
  },
  deleteBtn: {
    padding: 6,
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
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  typeBtnIncome: {
    backgroundColor: '#22C55E',
  },
  typeBtnExpense: {
    backgroundColor: '#EF4444',
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#FFF',
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  categoryChipActive: {
    backgroundColor: '#0F766E',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryChipTextActive: {
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
