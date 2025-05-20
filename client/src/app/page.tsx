"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}`)
      .then((res) => res.text())
      .then((text) => setData(text))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-bold">응답: {data}</h1>
    </main>
  );
}