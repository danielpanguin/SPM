// tests/unit/notificationsBus.simple.test.ts
import { emitNotificationsHint, onNotificationsHint } from "@/lib/notificationsBus";

describe("notificationsBus (simple)", () => {
  it("notifies all subscribers then allows unsubscribe", () => {
    const a = jest.fn();
    const b = jest.fn();

    const offA = onNotificationsHint(a);
    const offB = onNotificationsHint(b);

    emitNotificationsHint();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();                 // remove first listener
    emitNotificationsHint();
    expect(a).toHaveBeenCalledTimes(1); // unchanged
    expect(b).toHaveBeenCalledTimes(2); // only b receives second hint

    offB(); // cleanup (optional)
  });
});
