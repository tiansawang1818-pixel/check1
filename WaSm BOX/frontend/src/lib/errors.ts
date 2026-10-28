const translations: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "อีเมลหรือรหัสผ่านไม่ถูกต้อง"],
  [/email not confirmed/i, "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"],
  [/user already registered/i, "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือขอรหัสผ่านใหม่"],
  [/password should be at least|password must be at least/i, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
  [/new password should be different/i, "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม"],
  [/unable to validate email address|invalid email/i, "รูปแบบอีเมลไม่ถูกต้อง"],
  [/email rate limit exceeded|rate limit.*email/i, "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่"],
  [/for security purposes.*seconds/i, "เพื่อความปลอดภัย กรุณารอสักครู่แล้วลองใหม่"],
  [/session is invalid|session.*expired|jwt expired/i, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"],
  [/bot disabled/i, "บอทนี้ถูกปิดใช้งานชั่วคราว"],
  [/failed to fetch|networkerror|network request failed|load failed/i, "เชื่อมต่อบริการไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่"],
];

export function friendlyError(
  error: unknown,
  fallback = "ดำเนินการไม่สำเร็จ กรุณาลองใหม่",
) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
    ? error
    : "";
  if (!message) return fallback;
  if (/[ก-๙]/.test(message)) return message;
  for (const [pattern, translated] of translations) {
    if (pattern.test(message)) return translated;
  }
  return fallback;
}
