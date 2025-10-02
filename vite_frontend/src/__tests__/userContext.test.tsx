import { renderHook } from "@testing-library/react";
import { UserProvider, useUserContext } from "../context/UserContext";

describe("UserContext", () => {
  it("should provide default user", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider>{children}</UserProvider>
    );
    const { result } = renderHook(() => useUserContext(), { wrapper });
    expect(result.current.user).toBeDefined();
    expect(result.current.user?.username).toBe("Demo");
  });
});
