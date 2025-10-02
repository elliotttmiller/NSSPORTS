import { renderHook } from "@testing-library/react";
import { BetSlipProvider, useBetSlip } from "../context/BetSlipContext";

describe("BetSlipContext", () => {
  it("should provide default bet slip", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BetSlipProvider>{children}</BetSlipProvider>
    );
    const { result } = renderHook(() => useBetSlip(), { wrapper });
    expect(result.current.betSlip).toBeDefined();
    expect(result.current.betSlip.bets).toEqual([]);
  });
});
