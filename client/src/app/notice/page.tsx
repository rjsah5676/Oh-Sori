'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    setPosts([
      {
        id: 1,
        title: '타입스크립트 어려워..',
        author: '익명1',
        image: '/images/sample1.png',
      },
      {
        id: 2,
        title: '귀여운 오소리',
        author: '익명2',
        image: '/images/logo.png',
      },
      {
        id: 3,
        title: '망한 게임',
        author: '로악귀',
        image: '/images/LOSTARK.ico',
      },

    ]);
  }, []);

  return (
    <main className="min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-white p-6">
      <h1 className="text-3xl font-bold mb-6">🎶오늘의 소리</h1>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow hover:shadow-md transition cursor-pointer"
            onClick={() => router.push(`/post/${post.id}`)}
          >
            <Image
              src={post.image}
              alt={post.title}
              width={400}
              height={200}
              className="rounded-xl w-full h-[200px] object-cover mb-3"
            />
            <h2 className="text-lg font-semibold mb-1 truncate">{post.title}</h2>
            <p className="text-sm text-zinc-500">by {post.author}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
