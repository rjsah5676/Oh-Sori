import { Phone, Video, Search, Paintbrush } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

interface DMHeaderProps {
  nickname: string;
  tag: string;
  profileImage?: string;
  color?: string;
  userStatus?: 'online' | 'offline' | 'away' | 'dnd';
}

export default function DMHeader({ nickname, tag, profileImage, color = '#ccc', userStatus }: DMHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 min-w-0">
        <UserAvatar
          userStatus={userStatus || 'offline'}
          profileImage={profileImage}
          color={color}
          size={30}
        />
        <div className="truncate">
          <div className="text-sm font-medium text-black dark:text-white">
            {nickname}#{tag}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <Phone size={18} className="text-zinc-600 dark:text-zinc-300" />
        </button>
        <button className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <Paintbrush size={18} className="text-zinc-600 dark:text-zinc-300" />
        </button>
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="검색"
            className="pl-3 pr-10 py-1.5 rounded-md text-sm bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border border-zinc-300 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}
