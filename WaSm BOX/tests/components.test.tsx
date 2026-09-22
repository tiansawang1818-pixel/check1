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
    screen.getByRole("button", { name: "Run bot" }).closest("form")!,
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
    screen.getByRole("button", { name: "Run bot" }).closest("form")!,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Bot disabled")
  );
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
});
it("escapes output text rather than rendering HTML", () => {
  render(<Output value={"<script>alert(1)</script>"} type="text" />);
  expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
  expect(document.querySelector("script")).toBeNull();
});
