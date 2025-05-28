'use client';

import Image from 'next/image';

interface UserAvatarProps {
  profileImage?: string | null;
  color?: string;
  size?: number;
  alt?: string;
  userStatus?: 'online' | 'offline' | 'away' | 'dnd' | null;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
}

export default function UserAvatar({
  profileImage,
  color = '#888',
  size = 44,
  alt = 'profile',
  userStatus = 'offline',
  badgeOffsetX = 1,
  badgeOffsetY = 1,
}: UserAvatarProps) {
  const badgeColor =
    userStatus === 'online'
      ? 'bg-green-500'
      : userStatus === 'away'
      ? 'bg-yellow-400'
      : userStatus === 'dnd'
      ? 'bg-red-500'
      : 'bg-gray-400';

  return (
    <div
      className="relative rounded-full border border-white/20"
      style={{
        backgroundColor: profileImage ? 'transparent' : color,
        width: size,
        height: size,
        overflow: 'visible',
      }}
    >
      <div className="rounded-full overflow-hidden w-full h-full">
        <Image
          src={profileImage || '/images/default_profile.png'}
          alt={alt}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>

      {userStatus && (
        <span
          className={`absolute w-3.5 h-3.5 rounded-full border-2 border-white ${badgeColor}`}
          style={{
            right: badgeOffsetX,
            bottom: badgeOffsetY,
          }}
        />
      )}
    </div>
  );
}
