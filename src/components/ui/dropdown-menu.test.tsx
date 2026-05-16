import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("renders its popup above dialog overlays", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <DropdownMenu open>
            <DropdownMenuTrigger>Advanced settings</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Keep remote bookmarks</DropdownMenuItem>
              <DropdownMenuItem>Keep local bookmarks</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogContent>
      </Dialog>,
    );

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    const content = document.querySelector('[data-slot="dropdown-menu-content"]');

    expect(overlay).toHaveClass("z-[18000]");
    expect(content).toHaveClass("z-[18020]");
  });
});
