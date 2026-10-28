import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BotForm, Output } from "../frontend/src/components/BotForm";
import { gradeTemplate } from "../supabase/functions/_shared/schema";
afterEach(cleanup);
it("schema form sends numeric input rather than string", async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  render(<BotForm fields={gradeTemplate.input_schema.fields} onRun={run} />);
  fireEvent.change(screen.getByLabelText(/Score/), { target: { value: "85" } });
  fireEvent.submit(
    screen.getByRole("button", { name: "รันบอท" }).closest("form")!,
  );
  await waitFor(() => expect(run).toHaveBeenCalledWith({ score: 85 }));
});
it("shows execution failure and recovers loading state", async () => {
  render(
    <BotForm
      fields={gradeTemplate.input_schema.fields}
      onRun={async () => {
        throw new Error("Bot disabled");
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText(/Score/), { target: { value: "85" } });
  fireEvent.submit(
    screen.getByRole("button", { name: "รันบอท" }).closest("form")!,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "บอทนี้ถูกปิดใช้งานชั่วคราว",
    )
  );
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
});
it("escapes output text rather than rendering HTML", () => {
  render(<Output value={"<script>alert(1)</script>"} type="text" />);
  expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
  expect(document.querySelector("script")).toBeNull();
});

it("ignores a second submission while execution is pending", async () => {
  let finish!: () => void;
  const run = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<BotForm fields={[]} onRun={run} />);
  const form = screen.getByRole("button").closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(run).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false));
});
it("excludes removed fields when a schema changes", async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  const { rerender } = render(<BotForm fields={gradeTemplate.input_schema.fields} onRun={run} />);
  fireEvent.change(screen.getByLabelText(/Score/), { target: { value: "85" } });
  rerender(<BotForm fields={[]} onRun={run} />);
  fireEvent.submit(screen.getByRole("button").closest("form")!);
  await waitFor(() => expect(run).toHaveBeenCalledWith({}));
});
it("names the malformed JSON field without sending a request", async () => {
  const run = vi.fn();
  render(<BotForm fields={[{ name: "payload", label: "ข้อมูล", type: "json", required: true }]} onRun={run} />);
  fireEvent.change(screen.getByLabelText(/ข้อมูล/), { target: { value: "{broken" } });
  fireEvent.submit(screen.getByRole("button").closest("form")!);
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("ข้อมูล: กรุณากรอก JSON ให้ถูกต้อง"));
  expect(run).not.toHaveBeenCalled();
});
