import useAppState from "../store/state";
import { Element } from "../types";

export const useHistory = () => {
  const { setHistory, setHistoryIndex, history, historyIndex } = useAppState();

  const setState = (
    action: React.SetStateAction<Array<Element>>,
    overwrite = false
  ) => {
    const newState =
      typeof action === "function" ? action(history[historyIndex]) : action;

    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[historyIndex] = newState;
      setHistory(historyCopy);
    } else {
      const updatedState = [...history].slice(0, historyIndex + 1);
      setHistory([...updatedState, newState]);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const undo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const redo = () =>
    historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

  const clearHistory = () => {
    setHistory([[]]);
    setHistoryIndex(0);
  };

  return {
    elements: history[historyIndex],
    setElements: setState,
    undo,
    redo,
    clearHistory,
  };
};
