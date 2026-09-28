import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminGuard } from "../frontend/src/components/AdminLayout";
import { Layout } from "../frontend/src/components/Layout";
const state = vi.hoisted(() => ({
  session: { user: { id: "test" } } as object | null,
  profile: { role: "USER", status: "ACTIVE", username: "Tester" } as {
    role: string;
    status: string;
    username: string;
  } | null,
  loading: false,
  error: "",
}));
vi.mock(
  "../frontend/src/lib/context",
  () => ({
    useAuth: () => state,
    useAction: () => ({ run: vi.fn(), busy: false }),
    useToast: () => vi.fn(),
  }),
);
afterEach(() => {
  cleanup();
  state.session = { user: { id: "test" } };
  state.profile = { role: "USER", status: "ACTIVE", username: "Tester" };
  state.loading = false;
  state.error = "";
});
function showGuard() {
  const mount = vi.fn();
  function Secret() {
    mount();
    return <div>ADMIN SECRET</div>;
  }
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <Secret />
            </AdminGuard>
          }
        />
        <Route path="/dashboard" element={<div>USER HOME</div>} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return mount;
}
it("redirects ordinary users without mounting admin content", () => {
  const mount = showGuard();
  expect(screen.getByText("USER HOME")).toBeTruthy();
  expect(mount).not.toHaveBeenCalled();
});
it("redirects visitors to sign in", () => {
  state.session = null;
  const mount = showGuard();
  expect(screen.getByText("LOGIN")).toBeTruthy();
  expect(mount).not.toHaveBeenCalled();
});
it("waits for authentication without revealing admin content", () => {
  state.loading = true;
  expect(showGuard()).not.toHaveBeenCalled();
});
it("rejects suspended administrators", () => {
  state.profile!.role = "ADMIN";
  state.profile!.status = "SUSPENDED";
  const mount = showGuard();
  expect(screen.getByText("USER HOME")).toBeTruthy();
  expect(mount).not.toHaveBeenCalled();
});
it("allows active administrators", () => {
  state.profile!.role = "ADMIN";
  showGuard();
  expect(screen.getByText("ADMIN SECRET")).toBeTruthy();
});
it("keeps the user navigation free of admin links", () => {
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  );
  expect(document.querySelector('a[href^="/admin"]')).toBeNull();
  expect(screen.getByRole("link", { name: "สร้างบอท" })).toBeTruthy();
});
