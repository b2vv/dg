export type WheelBehavior = 'zoom-modifier' | 'zoom' | 'pan';

export interface WheelConfig {
  behavior?: WheelBehavior;
  gestures?: {
    zoom?: 'ctrl' | 'meta' | 'none';
    panHorizontal?: false | 'shift';
  };
}

export interface ResolvedWheel {
  behavior: WheelBehavior;
  zoom: 'ctrl' | 'meta' | 'none';
  panHorizontal: false | 'shift';
  platform: 'mac' | 'other';
}

export function resolveWheelConfig(
  cfg: WheelConfig | undefined,
  platform: 'mac' | 'other' | undefined,
): ResolvedWheel {
  const behavior = cfg?.behavior;
  const zoom = cfg?.gestures?.zoom;
  return {
    behavior: behavior === 'zoom' || behavior === 'pan' ? behavior : 'zoom-modifier',
    zoom: zoom === 'meta' || zoom === 'none' ? zoom : 'ctrl',
    panHorizontal: cfg?.gestures?.panHorizontal === 'shift' ? 'shift' : false,
    platform: platform === 'mac' ? 'mac' : 'other',
  };
}

export function wheelAction(
  resolved: ResolvedWheel,
  event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
): 'zoom' | 'pan-vertical' | 'pan-horizontal' | 'none' {
  if (event.shiftKey) return resolved.panHorizontal === 'shift' ? 'pan-horizontal' : 'none';
  if (resolved.behavior === 'pan' || resolved.zoom === 'none') return 'pan-vertical';
  // Mac priority preserves synthetic ctrl+wheel pinch as well as explicit Command.
  const modifier = resolved.platform === 'mac'
    ? event.ctrlKey || event.metaKey
    : resolved.zoom === 'ctrl' ? event.ctrlKey : event.metaKey;
  return resolved.behavior === 'zoom' || modifier ? 'zoom' : 'pan-vertical';
}
