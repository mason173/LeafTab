import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("Select", () => {
  it("renders its popup above dialog overlays", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <Select open value="zh">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">简体中文</SelectItem>
              <SelectItem value="zh-TW">繁體中文</SelectItem>
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>,
    );

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    const content = document.querySelector('[data-slot="select-content"]');
    const viewport = document.querySelector('[data-slot="select-content"] [data-radix-select-viewport]');

    expect(overlay).toHaveClass("z-[18000]");
    expect(content).toHaveClass("z-[18010]");
    expect(viewport).toHaveClass("max-h-[min(16rem,var(--radix-select-content-available-height))]");
    expect(viewport).not.toHaveClass("h-[var(--radix-select-trigger-height)]");
  });
});
