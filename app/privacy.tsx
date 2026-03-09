import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { HORIZONTAL_PADDING } from '@/utils/layout';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1E293B" />
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>隐私政策与用户协议</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Text style={styles.sectionTitle}>一、隐私政策</Text>
        <Text style={styles.paragraph}>
          「宝宝记录」是一款本地使用的育儿记录应用。我们重视您的隐私，特此说明如下：
        </Text>
        <Text style={styles.subTitle}>1. 数据存储方式</Text>
        <Text style={styles.paragraph}>
          本应用所有数据（包括宝宝档案、喂养/睡眠/用药/尿布等记录、日程、人情账、宝宝头像等）均仅保存在您的设备本地，不会上传至任何服务器，也不需要联网使用。
        </Text>
        <Text style={styles.subTitle}>2. 收集与使用的信息</Text>
        <Text style={styles.paragraph}>
          您主动填写或选择的内容仅用于在本机内展示与统计，例如：宝宝姓名、出生日期、家庭成员称呼、记录内容、照片（仅用于宝宝头像展示）。我们不会收集、上传或与任何第三方共享这些信息。
        </Text>
        <Text style={styles.subTitle}>3. 权限说明</Text>
        <Text style={styles.paragraph}>
          • 相册：仅用于您选择宝宝头像图片，我们不会主动访问或上传您的相册内容。{'\n'}
          • 通知：仅用于在您开启「喂食提醒」时，在设定时间发送本地提醒，不会用于推送营销或第三方消息。
        </Text>
        <Text style={styles.subTitle}>4. 数据安全与删除</Text>
        <Text style={styles.paragraph}>
          数据仅存于您的设备。若您卸载本应用，所有相关数据将随之删除。您也可以随时在应用内删除或修改宝宝档案及各类记录。
        </Text>
        <Text style={styles.subTitle}>5. 政策更新</Text>
        <Text style={styles.paragraph}>
          我们可能会适时更新本隐私政策，更新后的版本将在应用内展示。继续使用即视为接受更新后的政策。
        </Text>

        <Text style={[styles.sectionTitle, styles.sectionTitleMargin]}>二、用户协议</Text>
        <Text style={styles.paragraph}>
          使用本应用即表示您同意以下条款：
        </Text>
        <Text style={styles.paragraph}>
          • 本应用仅供个人育儿记录使用，不构成任何医疗或专业建议。{'\n'}
          • 您应妥善保管设备，避免他人未经授权查看或修改您的记录。{'\n'}
          • 我们不对因设备丢失、损坏或卸载应用导致的数据丢失承担责任。{'\n'}
          • 本应用可能随版本更新而调整功能，我们会尽量保持数据兼容。
        </Text>
        <Text style={styles.paragraph}>
          如有疑问，可通过应用内「个人资料」或应用商店页面提供的联系方式与我们联系。
        </Text>
        <Text style={styles.footer}>感谢您使用「宝宝记录」。</Text>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleMargin: {
    marginTop: 28,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 8,
  },
  footer: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 24,
    textAlign: 'center',
  },
});
