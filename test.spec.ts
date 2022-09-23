import { describe, it, expect } from "vitest";
import { Logger } from ".";

describe("logs tests", () => {
  it("Instancia do logger", async () => {
    const logger = new Logger({ path: "" });
    expect(logger).toBeInstanceOf(Logger);
  });

  it("Mandando alguma coisa", async () => {
    const logger = new Logger({ path: "" });

    expect(logger.info("alguma coisa")).toBeInstanceOf(Logger);
  });
});
