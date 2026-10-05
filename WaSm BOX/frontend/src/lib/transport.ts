export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
    this.name = "ApiError";
  }
}

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
      const message = typeof result?.error?.message === "string"
        ? result.error.message
        : response.status === 404
        ? "ไม่พบบริการหรือข้อมูลที่ขอ หากเพิ่งติดตั้งระบบ ให้ตรวจการ deploy Edge Functions"
        : response.status === 401
        ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"
        : response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ"
        : response.status === 429
        ? "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่"
        : `ไม่สามารถดำเนินการได้ (${response.status}) กรุณาลองใหม่`;
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
