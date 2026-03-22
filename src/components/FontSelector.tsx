import React, { useEffect } from 'react';
import { googleFonts, loadGoogleFont } from '../utils/googleFonts';
import { RiCheckFill } from '@/icons/ri-compat';
import { cn } from './ui/utils';
import { ScrollArea } from './ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

interface FontSelectorProps {
  currentFont: string;
  onSelect: (font: string) => void;
}

export function FontSelector({ currentFont, onSelect }: FontSelectorProps) {
  useEffect(() => {
    // Preload all fonts when selector opens to ensure preview works
    googleFonts.forEach(font => loadGoogleFont(font.family));
  }, []);

  return (
    <Command className="w-[300px] rounded-xl overflow-hidden">
      <div className="flex items-center px-3 pt-2" cmdk-input-wrapper="">
        <CommandInput 
          placeholder="Search font..." 
          className="border-none focus:ring-0"
        />
      </div>
      <CommandList>
        <CommandEmpty>No font found.</CommandEmpty>
        <ScrollArea className="h-[300px]">
          <CommandGroup heading="Fonts" className="p-2">
            {googleFonts.map((font) => (
              <CommandItem
                key={font.family}
                value={font.name}
                onSelect={() => onSelect(font.family)}
                className="cursor-pointer rounded-xl aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <RiCheckFill
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentFont === font.family ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col items-start">
                  <span style={{ fontFamily: font.family }} className="text-base">
                    {font.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans">
                    {font.category}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </Command>
  );
}
