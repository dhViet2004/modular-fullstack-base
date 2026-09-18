import { describe, it, expect } from "vitest";
import { api } from "../client";
import { apiError } from "../interceptors";

describe("Axios Client and Interceptors", () => {
  it("initializes api instance without circular dependency error", () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe("function");
    expect(typeof api.post).toBe("function");
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });

  it("handles apiError correctly", () => {
    const customError = {
      response: {
        data: {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password invalid"
          }
        }
      }
    };
    expect(apiError(customError)).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Email or password invalid"
    });

    expect(apiError(new Error("Network failed"))).toEqual({
      code: "UNKNOWN",
      message: "Request failed"
    });
  });
});
