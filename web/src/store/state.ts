import { create } from "zustand";
import { Action, Element, TypesTools } from "../types";

type AppState = {
  dimensions: { width: number; height: number };
  setDimensions: (dimensions: { width: number; height: number }) => void;

  action: Action;
  setAction: (action: Action) => void;

  tool: TypesTools;
  setTool: (tool: TypesTools) => void;

  isInToolbar: boolean;
  setIsInToolbar: (isInToolbar: boolean) => void;

  color: string;
  setColor: (color: string) => void;

  activeElement: Element | null;
  setActiveElement: (activeElement: Element | null) => void;

  selectedElements: Element[];
  setSelectedElements: (selectedElements: Element[]) => void;

  panOffset: { x: number; y: number };
  setPanOffset: (panOffset: { x: number; y: number }) => void;

  startPanMousePosition: { x: number; y: number };
  setStartPanMousePosition: (startPanMousePosition: {
    x: number;
    y: number;
  }) => void;

  history: Element[][];
  setHistory: (history: Element[][]) => void;

  historyIndex: number;
  setHistoryIndex: (historyIndex: number) => void;

  pendingEraseIds: number[];
  setPendingEraseIds: (pendingEraseIds: number[]) => void;

  copiedElements: Element[];
  setCopiedElements: (copiedElements: Element[]) => void;
};

const color = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "#ffffff"
  : "#000000";

const useAppState = create<AppState>((set) => ({
  dimensions: { width: window.innerWidth, height: window.innerHeight },
  setDimensions: (dimensions: { width: number; height: number }) =>
    set({ dimensions }),

  color,
  setColor: (color: string) => set({ color }),

  isInToolbar: false,
  setIsInToolbar: (isInToolbar: boolean) => set({ isInToolbar }),

  tool: TypesTools.Pencil,
  setTool: (tool: TypesTools) => set({ tool }),

  action: Action.None,
  setAction: (action: Action) => set({ action }),

  activeElement: null,
  setActiveElement: (activeElement: Element | null) => set({ activeElement }),

  selectedElements: [],
  setSelectedElements: (selectedElements: Element[]) =>
    set({ selectedElements }),

  panOffset: { x: 0, y: 0 },
  setPanOffset: (panOffset: { x: number; y: number }) => set({ panOffset }),

  startPanMousePosition: { x: 0, y: 0 },
  setStartPanMousePosition: (startPanMousePosition: { x: number; y: number }) =>
    set({ startPanMousePosition }),

  history: [[]],
  setHistory: (history: Element[][]) => set({ history }),

  historyIndex: 0,
  setHistoryIndex: (historyIndex: number) => set({ historyIndex }),

  pendingEraseIds: [],
  setPendingEraseIds: (pendingEraseIds: number[]) => set({ pendingEraseIds }),

  copiedElements: [],
  setCopiedElements: (copiedElements: Element[]) => set({ copiedElements }),
}));

export default useAppState;
