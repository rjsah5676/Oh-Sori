'use client';

import Image from 'next/image';

interface UserAvatarProps {
  profileImage?: string | null;
  color?: string;
  size?: number;
  alt?: string;
}

export default function UserAvatar({
  profileImage,
  color = '#888',
  size = 44,
  alt = 'profile',
}: UserAvatarProps) {
  return (
    <div
      className="rounded-full overflow-hidden border border-white/20"
      style={{
        backgroundColor: profileImage ? 'transparent' : color,
        width: size,
        height: size,
      }}
    >
      <Image
        src={profileImage || '/images/default_profile.png'}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
      />
    </div>
  );
}
