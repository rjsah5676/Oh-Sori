'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from './authSlice';

export default function InitAuthLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        dispatch(setUser(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
  }, [dispatch]);

  return <>{children}</>;
}
