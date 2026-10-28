import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../frontend/src/lib/api", () => ({ appUrl: "http://localhost", supabase: null }));
vi.mock("../frontend/src/lib/context", () => ({ useAuth: () => ({ refresh: vi.fn() }), useAction: () => ({ busy: false, run: vi.fn() }) }));
import { AuthPage } from "../frontend/src/pages/Auth";
afterEach(cleanup);
it("does not carry a password from login into registration", () => {
  render(<MemoryRouter initialEntries={["/login"]}><Routes><Route path="/:mode" element={<AuthPage />} /></Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "test-only-password" } });
  fireEvent.click(screen.getByRole("link", { name: "สมัครสมาชิก" }));
  expect((screen.getByLabelText("รหัสผ่าน") as HTMLInputElement).value).toBe("");
  expect(screen.getByLabelText("ชื่อที่แสดง")).toBeTruthy();
});
