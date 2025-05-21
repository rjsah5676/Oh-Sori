'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import Image from 'next/image';
import { Mic, Headphones, Settings } from 'lucide-react';
import { logout } from '@/store/authSlice';

export default function MainRedirectPage() {
  const router = useRouter();
  const nickname = useSelector((state: RootState) => state.auth.user?.nickname);
  const profileImage = useSelector((state: RootState) => state.auth.user?.profileImage);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!nickname) router.replace('/');
  }, [nickname, router]);

  if (!nickname) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 w-[304px] h-[60px] bg-zinc-200 dark:bg-zinc-900 border-t border-r border-zinc-300 dark:border-zinc-700 px-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-white/20">
            <Image
              src={profileImage || '/images/default_profile.png'}
              alt="profile"
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
          <span className="text-sm font-medium text-black dark:text-white truncate">{nickname}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <button className="hover:text-black dark:hover:text-white transition"><Mic size={16} /></button>
          <button className="hover:text-black dark:hover:text-white transition"><Headphones size={16} /></button>
          <button
            onClick={async () => {
              try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                });
                dispatch(logout());
                router.refresh();
              } catch (e) {
                console.error('Logout failed:', e);
              }
            }}
            className="hover:text-black dark:hover:text-white transition"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <main className="min-h-screen flex bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white">
        <aside className="w-16 bg-zinc-200 dark:bg-zinc-900 text-black dark:text-white flex flex-col pt-4 pb-[60px] items-center space-y-4">
          <button className="w-10 h-10 bg-zinc-300 dark:bg-zinc-700 rounded-full hover:bg-zinc-400 dark:hover:bg-zinc-600">#</button>
          <button className="w-10 h-10 bg-zinc-300 dark:bg-zinc-700 rounded-full hover:bg-zinc-400 dark:hover:bg-zinc-600">+</button>
        </aside>

        <aside className="w-60 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white flex flex-col pt-4 pb-[60px] border-r border-zinc-200 dark:border-zinc-700">
          <div className="flex flex-col space-y-2 px-2">
            <button className="hover:bg-zinc-200 dark:hover:bg-zinc-700 p-3 rounded-md text-left">친구1</button>
            <button className="hover:bg-zinc-200 dark:hover:bg-zinc-700 p-3 rounded-md text-left">친구2</button>
            <button className="hover:bg-zinc-200 dark:hover:bg-zinc-700 p-3 rounded-md text-left">친구3</button>
          </div>
        </aside>

        <section className="flex-1 p-6 overflow-y-auto">
          {/* 콘텐츠 자리 */}
        </section>
      </main>
    </>
  );
}
