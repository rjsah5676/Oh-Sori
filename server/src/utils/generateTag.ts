import User from "../models/User";

export async function generateUniqueTag(nickname: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const tag = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const exists = await User.exists({ nickname, tag });
    if (!exists) return tag;
  }
  throw new Error("태그 생성 실패");
}
