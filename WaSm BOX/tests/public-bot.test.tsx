import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../frontend/src/lib/api", () => ({ api: mocks.api, supabase: null }));
import { PublicBot } from "../frontend/src/pages/PublicBot";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const bot = (name: string) => ({ name, description: "ตัวอย่าง", widget: { showBotName: true }, input_schema: { fields: [] }, output_schema: { type: "text" } });
function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/b/new")}>เปลี่ยนบอท</button>;
}
function setup() {
  render(<MemoryRouter initialEntries={["/b/old"]}><Navigation /><Routes><Route path="/b/:slug" element={<PublicBot />} /></Routes></MemoryRouter>);
}
it("clears old bot and ignores its delayed execution after navigation", async () => {
  let finishRun!: (value: unknown) => void;
  let finishRead!: (value: unknown) => void;
  mocks.api.mockResolvedValueOnce({ bot: bot("บอทเดิม") })
    .mockImplementationOnce(() => new Promise(resolve => { finishRun = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  setup();
  await screen.findByRole("heading", { name: "บอทเดิม" });
  const signal = mocks.api.mock.calls[0][4].signal;
  fireEvent.click(screen.getByRole("button", { name: "เริ่มใช้งานบอท" }));
  fireEvent.click(screen.getByRole("button", { name: "เปลี่ยนบอท" }));
  expect(screen.queryByRole("heading", { name: "บอทเดิม" })).toBeNull();
  expect(signal.aborted).toBe(true);
  await act(async () => finishRun({ output: "OLD RESULT", version: 1 }));
  await act(async () => finishRead({ bot: bot("บอทใหม่") }));
  expect(screen.getByRole("heading", { name: "บอทใหม่" })).toBeTruthy();
  expect(screen.queryByText("OLD RESULT")).toBeNull();
});
it("allows retrying a failed public read", async () => {
  mocks.api.mockRejectedValueOnce(new Error("โหลดไม่สำเร็จ"))
    .mockResolvedValueOnce({ bot: bot("โหลดสำเร็จ") });
  setup();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "โหลดสำเร็จ" })).toBeTruthy());
  expect(screen.queryByRole("alert")).toBeNull();
});
