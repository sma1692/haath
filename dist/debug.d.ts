import { H as HaathFrameState } from './types-TNkY3J3h.js';

interface GesturePreviewOptions {
    container?: HTMLElement | null;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showKinematics?: boolean;
    showSigns?: boolean;
    showSpells?: boolean;
    opacity?: number;
}
interface GesturePreviewController {
    element: HTMLElement | null;
    update: (frameState: HaathFrameState) => void;
    destroy: () => void;
    setVisible: (visible: boolean) => void;
}
declare function initGesturePreview(options?: GesturePreviewOptions): GesturePreviewController;

export { type GesturePreviewController, type GesturePreviewOptions, initGesturePreview };
