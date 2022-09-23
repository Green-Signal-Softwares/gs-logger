import { describe, it, expect, beforeAll } from "vitest";
import { Logger } from "./src";

describe("logs tests", () => {
  let logger: Logger;
  beforeAll(() => {
    logger = new Logger({ path: "" });
  });

  it("Instancia do logger", async () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it("Mandando alguma coisa", async () => {
    logger.info("alguma coisa");

    expect(logger.info("alguma coisa")).toBeInstanceOf(Logger);
  });
});
