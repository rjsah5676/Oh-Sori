'use client';

import { useEffect } from 'react';
import useCallSocket from '@/hooks/useCallSocket';

export default function CallSocketHandler() {
  useCallSocket();
  return null;
}
