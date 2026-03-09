# 宝宝记录

一款基于 Expo + React Native 的宝宝成长记录应用，帮助新手父母便捷记录宝宝的喂奶、换尿布、睡眠、成长数据、体温、日程安排以及礼部收支等信息。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)

---

## 功能概览

| 模块 | 功能 |
|------|------|
| **首页** | 宝宝信息、喂奶/换尿布/睡眠/成长/体温快捷记录、下次喂食提醒倒计时 |
| **统计** | 成长曲线（身高/体重）、睡眠分布、奶量/尿布/体温/健康趋势图 |
| **日程** | 日程事项管理、到点推送提醒、农历日历视图 |
| **礼部** | 家庭礼金收支记录、按分类统计、人情往来搜索 |
| **我的** | 多宝宝管理、数据备份与恢复、个人设置 |

所有数据存储在本地设备，不上传任何服务器，完全离线可用。

---

## 技术栈

- **框架**：Expo SDK 54、React Native 0.81、React 19
- **路由**：expo-router（文件系统路由）
- **语言**：TypeScript 5.9
- **状态与存储**：React Context、AsyncStorage（本地持久化）
- **图表**：react-native-chart-kit、react-native-svg
- **UI 组件**：lucide-react-native、react-native-safe-area-context

---

## 环境要求

- Node.js 18+（建议 LTS）
- npm 或 yarn
- Expo Go（真机预览）：[下载地址](https://expo.dev/go)
- iOS 打包：macOS + Xcode 16+（或 EAS Build 云端）
- Android 打包：Android Studio 或 EAS Build

---

## 安装与运行

```bash
# 克隆仓库
git clone https://github.com/yangliuduiyan/baby-project.git
cd baby-project

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

启动后在终端按 `i` 打开 iOS 模拟器，按 `a` 打开 Android 模拟器；或使用 Expo Go 扫描二维码连接真机。

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务（端口 8082，离线模式） |
| `npm run dev:clear` | 同上并清除缓存 |
| `npm run build:web` | 导出 Web 版本 |
| `npm run build:ios` | 使用 EAS Build 构建 iOS 应用 |
| `npm run build:android` | 使用 EAS Build 构建 Android APK |
| `npm run lint` | 代码检查 |
| `npm run typecheck` | TypeScript 类型检查 |

---

## 项目结构

```
├── app/                   # 页面与路由（expo-router）
│   ├── (tabs)/            # 底部 Tab 页面
│   │   ├── index.tsx      # 首页（记录入口）
│   │   ├── statistics.tsx # 统计页
│   │   ├── schedule.tsx   # 日程页
│   │   ├── community.tsx  # 礼部页
│   │   └── profile.tsx    # 个人页
│   ├── _layout.tsx        # 根布局
│   ├── settings.tsx       # 设置页
│   └── about.tsx          # 关于页
├── assets/                # 图片、图标等静态资源
├── contexts/              # React Context（宝宝信息全局状态）
├── hooks/                 # 自定义 Hooks
├── types/                 # TypeScript 类型定义
├── utils/                 # 工具函数（存储、提醒、布局等）
├── app.json               # Expo 应用配置
├── eas.json               # EAS Build 配置
└── package.json
```

---

## 数据安全说明

- 所有数据（宝宝信息、记录、礼部账本等）均**仅保存在本机**，使用 AsyncStorage 存储。
- 本应用**不采集、不上传、不共享**任何用户数据。
- 数据备份功能会将数据导出为 JSON 文件，**由用户自行管理**，开发者无法访问。

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/你的功能名`
3. 提交改动：`git commit -m "feat: 描述改动内容"`
4. 推送分支：`git push origin feature/你的功能名`
5. 发起 Pull Request

**提交规范（Commit Message）：**

| 前缀 | 说明 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `style:` | 样式/UI 调整 |
| `refactor:` | 代码重构 |
| `docs:` | 文档修改 |
| `chore:` | 构建/依赖等杂项 |

---

## 免责声明

本项目以"**按现状（AS IS）**"提供，仅供学习与参考使用。

- 本应用提供的喂食提醒、健康记录等功能**不构成任何医疗建议**，不能替代专业医生的诊断与指导。涉及宝宝健康的决策，请务必咨询专业医疗机构。
- 开发者**不对因使用本软件导致的任何直接或间接损失承担责任**，包括但不限于数据丢失、设备故障等。
- 用户应定期使用内置的"数据备份"功能导出数据，以防数据意外丢失，开发者不保证数据的持久性与完整性。
- 本软件可能存在未知缺陷，**请勿将其作为唯一的记录或提醒手段**。

---

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

你可以自由地使用、复制、修改、合并、发布、分发、再授权及销售本软件的副本，但须在所有副本中保留版权声明和许可声明。

---

## 仓库

- GitHub：https://github.com/yangliuduiyan/baby-project
