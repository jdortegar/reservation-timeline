import { create } from 'zustand';
import { createTimelineSlice, type TimelineState } from './slices/timelineSlice';

export const useStore = create<TimelineState>()((...a) => ({
  ...createTimelineSlice(...a),
}));

