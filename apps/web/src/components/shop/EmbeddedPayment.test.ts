import { describe, expect, it } from "vitest";
import { sessionIdFromSecret } from "./EmbeddedPayment";

describe("sessionIdFromSecret", () => {
  it("saca el id de sesión de un client_secret", () => {
    expect(sessionIdFromSecret("cs_test_a1B2c3_secret_ZZZ")).toBe("cs_test_a1B2c3");
    expect(sessionIdFromSecret("sinsecreto")).toBe("sinsecreto");
  });
});
