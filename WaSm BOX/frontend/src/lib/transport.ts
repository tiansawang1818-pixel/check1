export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
    this.name = "ApiError";
  }
}

const apiErrorMessages: Record<string, string> = {
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
  FORBIDDEN: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ",
  BOT_NOT_FOUND: "ไม่พบบอทนี้ หรือบอทถูกลบแล้ว",
  BOT_NOT_PUBLISHED: "บอทนี้ยังไม่ได้เผยแพร่",
  BOT_DISABLED: "บอทนี้ถูกปิดใช้งานชั่วคราว",
  BOT_BLOCKED: "บอทนี้ถูกระงับการใช้งาน",
  INVALID_API_KEY: "กุญแจ API ไม่ถูกต้อง",
  API_KEY_REVOKED: "กุญแจ API นี้ถูกยกเลิกแล้ว",
  API_DISABLED: "การใช้งานผ่าน API ถูกปิดไว้",
  RATE_LIMITED: "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
  LIMIT_REACHED: "บัญชีนี้ใช้งานถึงขีดจำกัดแล้ว",
  PAYLOAD_TOO_LARGE: "ข้อมูลมีขนาดใหญ่เกินไป",
  OUTPUT_TOO_LARGE: "ผลลัพธ์มีขนาดใหญ่เกินไป กรุณาลดข้อมูลที่ส่งกลับ",
  VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง กรุณาตรวจข้อมูลแล้วลองใหม่",
  WASM_ERROR: "บอทประมวลผลไม่สำเร็จ กรุณาตรวจเงื่อนไขแล้วลองใหม่",
  CONFIGURATION_ERROR: "ระบบยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแล",
  DATABASE_ERROR: "ระบบจัดเก็บข้อมูลขัดข้อง กรุณาลองใหม่",
  INTERNAL_ERROR: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่",
  METHOD_NOT_ALLOWED: "วิธีเรียกบริการนี้ไม่ถูกต้อง",
  NOT_FOUND: "ไม่พบบริการหรือข้อมูลที่ขอ",
};

/** Cancel obsolete reads and bound network waits without retrying writes. */
export async function requestJson<T>(
  url: string,
  init: RequestInit,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 30_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let result;
    try {
      result = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", response.status);
    }
    if (!response.ok || result?.success !== true) {
      const code = typeof result?.error?.code === "string"
        ? result.error.code
        : "";
      const serverMessage = typeof result?.error?.message === "string"
        ? result.error.message
        : "";
      const message = apiErrorMessages[code] || (/[ก-๙]/.test(serverMessage)
        ? serverMessage
        : response.status === 404
        ? "ไม่พบบริการหรือข้อมูลที่ขอ หากเพิ่งติดตั้งระบบ ให้ตรวจการ deploy Edge Functions"
        : response.status === 401
        ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"
        : response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ"
        : response.status === 429
        ? "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่"
        : `ไม่สามารถดำเนินการได้ (${response.status}) กรุณาลองใหม่`);
      throw new ApiError(message, response.status);
    }
    return result as T;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timedOut) throw new ApiError("รอเซิร์ฟเวอร์นานเกินไป หากกำลังบันทึกข้อมูล ให้ตรวจผลก่อนลองซ้ำ");
    if (error instanceof TypeError) {
      throw new ApiError("เชื่อมต่อบริการไม่ได้ กรุณาตรวจอินเทอร์เน็ตและการตั้งค่า Supabase / Edge Functions");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
