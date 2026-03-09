import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 水平安全边距（左右），小屏 12，常规 16 */
export const HORIZONTAL_PADDING = SCREEN_WIDTH <= 360 ? 12 : 16;

/** 弹窗最大宽度，避免平板过宽 */
export const MODAL_MAX_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 400);
