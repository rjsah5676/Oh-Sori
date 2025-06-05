"use client"

import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { logout } from "@/store/authSlice";

export default function Admin() {
    const dispatch = useDispatch();
    const router = useRouter();

    return (
        <div>
            관리자 페이지<br/>
            공지사항 등록/수정/삭제<br/>
            알림?<br/>
            신고/차단<br/>
            
        

            <button
              onClick={async () => {
                try {
                  await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
                    {
                      method: "POST",
                      credentials: "include",
                    }
                  );
                  dispatch(logout());
                  router.push("/");
                } catch (e) {
                  console.error("Logout failed:", e);
                }
              }}
              className="hover:text-black dark:hover:text-white transition"
            >로그아웃
            </button>
        </div>
    )
}