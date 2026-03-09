# 宝宝记录

一款基于 Expo + React Native 的宝宝成长记录应用，支持喂奶提醒、数据统计、日程与礼部等模块。

## 功能概览

- **首页**：宝宝信息、快捷记录与动态
- **统计**：成长数据与图表展示
- **日程**：日程与提醒（含喂奶提醒）
- **礼部**：礼金/礼单相关功能
- **我的**：个人设置、关于与隐私政策（应用内静态页）

应用内提供隐私政策与用户协议静态页，无需联网即可查看。

## 技术栈

- **框架**：Expo SDK 54、React Native、React 19
- **路由**：expo-router（文件系统路由）
- **语言**：TypeScript
- **状态与存储**：React Context、AsyncStorage
- **图表**：react-native-chart-kit、react-native-svg
- **农历**：lunar-javascript

## 环境要求

- Node.js（建议 LTS）
- npm 或 yarn
- iOS：Xcode（模拟器或真机）
- Android：Android Studio 或 Expo Go
- 真机预览：安装 [Expo Go](https://expo.dev/go)

## 安装与运行

```bash
# 克隆仓库
git clone https://gitee.com/zhong-ziy/baby.git
cd baby

# 安装依赖
npm install

# 启动开发服务（默认端口 8082，离线模式）
npm run dev
```

在终端中按 `i` 打开 iOS 模拟器，按 `a` 打开 Android 模拟器；或使用 Expo Go 扫描二维码连接真机。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务（端口 8082，离线） |
| `npm run dev:clear` | 同上并清除缓存 |
| `npm run dev:8007` | 端口 8007，并设置打包机主机名（局域网真机） |
| `npm run dev:qr` | 启动并配合二维码服务 |
| `npm run build:web` | 导出 Web 版本 |
| `npm run build:ios` | 使用 EAS 构建 iOS 应用 |
| `npm run lint` | 代码检查 |
| `npm run typecheck` | TypeScript 类型检查 |

## 项目结构（简要）

```
├── app/                 # 页面与路由（expo-router）
│   ├── (tabs)/          # 底部 Tab：首页、统计、日程、礼部、我的
│   ├── _layout.tsx      # 根布局与路由配置
│   └── privacy.tsx      # 隐私政策与用户协议（静态页）
├── assets/              # 图片、字体等静态资源
├── contexts/            # React Context（如宝宝信息）
├── hooks/               # 自定义 Hooks
├── utils/               # 工具函数与存储
├── scripts/             # 构建与辅助脚本
├── docs/                # 文档（如 App Store 上架清单）
├── app.json             # Expo 应用配置
├── eas.json             # EAS Build 配置
└── package.json
```

## 构建与上架

- **iOS**：使用 `npm run build:ios`（EAS Build），或参考 `scripts/` 与 `docs/` 中的说明。
- **上架前自检**：见 `docs/AppStore上架审核清单.md`。

## 许可证

私有项目，未指定开源协议前请勿外部分发。

## 仓库

- Gitee：https://gitee.com/zhong-ziy/baby
