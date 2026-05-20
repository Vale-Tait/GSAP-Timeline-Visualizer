export type TweenType = 'to' | 'from' | 'fromTo' | 'set';

export interface ParsedItem {
  id: string;
  type: 'tween' | 'label';
  method?: TweenType;
  target?: string | string[];
  duration: number;
  startTime: number;
  endTime: number;
  vars?: Record<string, any>;
  originalPosition?: string | number;
  labelName?: string;
}

export interface ParsedTimeline {
  items: ParsedItem[];
  labels: Record<string, number>;
  totalDuration: number;
}
