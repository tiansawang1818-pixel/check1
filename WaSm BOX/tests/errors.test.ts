import { describe, expect, it } from "vitest";
import { friendlyError } from "../frontend/src/lib/errors";

describe("friendlyError", () => {
  it("translates common Supabase Auth errors", () => {
    expect(friendlyError(new Error("Invalid login credentials"))).toBe(
      "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    );
    expect(friendlyError(new Error("Email not confirmed"))).toBe(
      "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ",
    );
    expect(friendlyError(new Error("Bot disabled"))).toBe(
      "บอทนี้ถูกปิดใช้งานชั่วคราว",
    );
  });

  it("preserves useful Thai errors and hides unknown internal messages", () => {
    expect(friendlyError(new Error("ข้อมูลไม่ถูกต้อง"))).toBe("ข้อมูลไม่ถูกต้อง");
    expect(friendlyError(new Error("sensitive internal detail"))).toBe(
      "ดำเนินการไม่สำเร็จ กรุณาลองใหม่",
    );
  });
});
