/**
 * 日程到点推送：为日程任务在设定时间触发本地通知（仅 iOS/Android，Web 不支持）
 *
 * ⚠️  expo-notifications 已临时禁用以完成 IPA 打包（描述文件不含 Push Notifications 权限）
 *     恢复步骤：
 *       1. 在 package.json dependencies 中重新加入：
 *            "expo-notifications": "~0.32.16"
 *       2. 取消下方所有注释（删掉 // DISABLED 标记）
 *       3. 删除底部的空实现 stub 函数
 *       4. 运行 npm install
 */

import type { ScheduleEvent } from '@/types';

// ---- DISABLED START ----
// import { Platform } from 'react-native';
// import * as Notifications from 'expo-notifications';
// import { requestNotificationPermission } from '@/utils/feedReminder';
//
// const SCHEDULE_PREFIX = 'schedule-';
//
// function notificationId(eventId: string): string {
//   return SCHEDULE_PREFIX + eventId;
// }
//
// export async function scheduleEventNotification(event: ScheduleEvent): Promise<void> {
//   if (Platform.OS === 'web') return;
//   const at = new Date(event.time);
//   if (at.getTime() <= Date.now()) return;
//   try {
//     const granted = await requestNotificationPermission();
//     if (!granted) return;
//     await Notifications.cancelScheduledNotificationAsync(notificationId(event.id));
//     await Notifications.scheduleNotificationAsync({
//       identifier: notificationId(event.id),
//       content: {
//         title: '日程提醒',
//         body: event.title || '您有一条日程',
//       },
//       trigger: {
//         type: Notifications.SchedulableTriggerInputTypes.DATE,
//         date: at,
//       },
//     });
//   } catch {
//     // 权限或调度失败时静默忽略
//   }
// }
//
// export async function cancelEventNotification(eventId: string): Promise<void> {
//   if (Platform.OS === 'web') return;
//   try {
//     await Notifications.cancelScheduledNotificationAsync(notificationId(eventId));
//   } catch {
//     // ignore
//   }
// }
//
// export async function syncScheduleNotifications(events: ScheduleEvent[]): Promise<void> {
//   if (Platform.OS === 'web') return;
//   const now = Date.now();
//   const futureIds = new Set(
//     events
//       .filter((e) => new Date(e.time).getTime() > now)
//       .map((e) => notificationId(e.id))
//   );
//   try {
//     const scheduled = await Notifications.getAllScheduledNotificationsAsync();
//     for (const n of scheduled) {
//       if (n.identifier.startsWith(SCHEDULE_PREFIX) && !futureIds.has(n.identifier)) {
//         await Notifications.cancelScheduledNotificationAsync(n.identifier);
//       }
//     }
//   } catch {
//     // ignore
//   }
//   for (const e of events) {
//     const t = new Date(e.time).getTime();
//     if (t > now) await scheduleEventNotification(e);
//   }
// }
// ---- DISABLED END ----

// ---- 空实现 stub（临时）：调用方无需任何改动 ----
export async function scheduleEventNotification(_event: ScheduleEvent): Promise<void> {
  // expo-notifications 已禁用
}

export async function cancelEventNotification(_eventId: string): Promise<void> {
  // expo-notifications 已禁用
}

export async function syncScheduleNotifications(_events: ScheduleEvent[]): Promise<void> {
  // expo-notifications 已禁用
}
