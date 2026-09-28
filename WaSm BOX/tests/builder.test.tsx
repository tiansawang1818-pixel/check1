import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Builder } from "../frontend/src/components/Builder";
import { gradeTemplate } from "../supabase/functions/_shared/schema";
afterEach(cleanup);
const rules = () =>
  fireEvent.click(screen.getByRole("button", { name: "3 ตั้งเงื่อนไข" }));
it("saves the shipping starter with numeric outputs and Thai province values", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<Builder onSave={save} />);
  fireEvent.click(screen.getByRole("button", { name: /คิดค่าจัดส่ง/ }));
  rules();
  fireEvent.change(screen.getAllByLabelText("คำตอบเมื่อเข้าเงื่อนไข")[1], {
    target: { value: "45" },
  });
  fireEvent.click(screen.getByRole("button", { name: "บันทึกบอท" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const bot = save.mock.calls[0][0];
  expect(bot.output_schema.type).toBe("number");
  expect(bot.rule_definition.rules[1].output).toBe(45);
  expect(bot.rule_definition.rules[1].conditions[0].value).toBe("กรุงเทพฯ");
});
it("preserves numeric-looking text outputs without requiring JSON quotes", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<Builder onSave={save} />);
  rules();
  fireEvent.change(screen.getAllByLabelText("คำตอบเมื่อเข้าเงื่อนไข")[0], {
    target: { value: "00123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "บันทึกบอท" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].rule_definition.rules[0].output).toBe("00123");
});
it("validates the name before advancing and protects fields used in rules", () => {
  render(<Builder onSave={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("ชื่อบอท"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
  expect(screen.getByRole("alert").textContent).toContain("อย่างน้อย 2");
  fireEvent.change(screen.getByLabelText("ชื่อบอท"), {
    target: { value: "บอทใหม่" },
  });
  fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
  expect(
    screen.getByRole("button", { name: "ลบช่อง คะแนน" }).hasAttribute(
      "disabled",
    ),
  ).toBe(true);
});
it("hides the comparison value for empty checks", () => {
  render(<Builder onSave={vi.fn()} />);
  rules();
  fireEvent.change(screen.getAllByLabelText("เงื่อนไข")[0], {
    target: { value: "is_empty" },
  });
  expect(screen.getAllByLabelText("เปรียบเทียบกับ")).toHaveLength(3);
});
it("keeps incomplete JSON visible and prevents saving it", async () => {
  const save = vi.fn();
  const initial = structuredClone(gradeTemplate);
  initial.output_schema.type = "json";
  render(<Builder initial={initial} onSave={save} />);
  rules();
  const output = screen.getAllByLabelText(
    "คำตอบเมื่อเข้าเงื่อนไข",
  )[0] as HTMLTextAreaElement;
  fireEvent.change(output, { target: { value: '{"answer":' } });
  expect(output.value).toBe('{"answer":');
  fireEvent.click(screen.getByRole("button", { name: "บันทึกบอท" }));
  await waitFor(() =>
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
  );
  expect(save).not.toHaveBeenCalled();
});
