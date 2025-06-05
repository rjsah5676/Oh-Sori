'use client';

import { useEffect } from 'react';
import useCallSocket from '@/hooks/useCallSocket';
import useUnlockAudio from '@/hooks/useUnlockAudio';
export default function CallSocketHandler() {
  useCallSocket();
  useUnlockAudio();
  return null;
}
