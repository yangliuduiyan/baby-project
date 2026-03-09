/**
 * 下次喂食提醒：请求权限、预约/取消本地通知（仅 iOS/Android，Web 不支持）
 *
 * ⚠️  expo-notifications 已临时禁用以完成 IPA 打包（描述文件不含 Push Notifications 权限）
 *     恢复步骤：
 *       1. 在 package.json dependencies 中重新加入：
 *            "expo-notifications": "~0.32.16"
 *       2. 取消下方所有注释（删掉 // DISABLED 标记）
 *       3. 删除底部的空实现 stub 函数
 *       4. 运行 npm install
 */

// ---- DISABLED START ----
// import { Platform } from 'react-native';
// import * as Notifications from 'expo-notifications';
//
// const NEXT_FEED_REMINDER_ID = 'next-feed-reminder';
//
// if (Platform.OS !== 'web') {
//   Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//       shouldShowAlert: true,
//       shouldPlaySound: true,
//       shouldSetBadge: false,
//       shouldShowBanner: true,
//       shouldShowList: true,
//     }),
//   });
// }
//
// export async function requestNotificationPermission(): Promise<boolean> {
//   if (Platform.OS === 'web') return true;
//   try {
//     const { status: existing } = await Notifications.getPermissionsAsync();
//     if (existing === 'granted') return true;
//     const { status } = await Notifications.requestPermissionsAsync();
//     return status === 'granted';
//   } catch {
//     return false;
//   }
// }
//
// export async function scheduleNextFeedReminder(at: Date): Promise<void> {
//   if (Platform.OS === 'web') return;
//   const now = new Date();
//   if (at.getTime() <= now.getTime()) return;
//   try {
//     await Notifications.cancelScheduledNotificationAsync(NEXT_FEED_REMINDER_ID);
//     await Notifications.scheduleNotificationAsync({
//       identifier: NEXT_FEED_REMINDER_ID,
//       content: {
//         title: '喂食提醒',
//         body: '该喂宝宝啦～',
//       },
//       trigger: {
//         type: Notifications.SchedulableTriggerInputTypes.DATE,
//         date: at,
//       },
//     });
//   } catch {
//     // 权限未开启或调度失败时静默忽略
//   }
// }
//
// export async function cancelNextFeedReminder(): Promise<void> {
//   if (Platform.OS === 'web') return;
//   try {
//     await Notifications.cancelScheduledNotificationAsync(NEXT_FEED_REMINDER_ID);
//   } catch {
//     // ignore
//   }
// }
// ---- DISABLED END ----

// ---- 空实现 stub（临时）：调用方无需任何改动 ----
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleNextFeedReminder(_at: Date): Promise<void> {
  // expo-notifications 已禁用
}

export async function cancelNextFeedReminder(): Promise<void> {
  // expo-notifications 已禁用
}
