import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { DELETE } from "@/app/api/schedules/[scheduleId]/route";
import { mockSupabase, user } from "./mockDb";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
afterEach(() => {jest.resetAllMocks()});

const call = () =>
  DELETE(new Request("http://localhost/api/schedules/s1", { method: "DELETE" }), {
    params: Promise.resolve({ scheduleId: "s1" }),
  });

describe("DELETE /api/schedules/:scheduleId", () => {
  it("returns 401 when signed out", async () => {
    const { deleteMock } = mockSupabase(null);
    expect((await call()).status).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes only when both id and uid match", async () => {
    const { eqMock } = mockSupabase(user, { delete: { data: [{ id: "s1" }], error: null } });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(eqMock.mock.calls).toContainEqual(["id", "s1"]);
    expect(eqMock.mock.calls).toContainEqual(["uid", "user12"]);
  });

  it("returns 404 when nothing was deleted", async () => {
    mockSupabase(user, { delete: { data: [], error: null } });
    expect((await call()).status).toBe(404);
  });

  it("returns 400 on a database error", async () => {
    mockSupabase(user, { delete: { data: null, error: { message: "boom" } } });
    expect((await call()).status).toBe(400);
  });
});