import { describe, expect, it } from "vitest";

const stateMap: Record<string, string> = {
  created: "ringing",
  ringing: "ringing",
  answered: "in_progress",
  active: "in_progress",
  "in-progress": "in_progress",
  ended: "completed",
  completed: "completed",
  failed: "failed",
  busy: "busy",
  "no-answer": "no_answer",
  canceled: "canceled",
};

describe("SignalWire webhook state mapping", () => {
  it("maps SignalWire states to local call states", () => {
    expect(stateMap.answered).toBe("in_progress");
    expect(stateMap.completed).toBe("completed");
    expect(stateMap["no-answer"]).toBe("no_answer");
  });
});
