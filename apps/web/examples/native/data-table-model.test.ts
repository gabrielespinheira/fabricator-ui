import { describe, expect, it } from "vitest"

import { getPaymentRows } from "./data-table-model"

describe("data table example", () => {
  it("filters before sorting and paging, without changing the input", () => {
    const rows = [
      { id: "a", email: "a@example.com", amount: 10, status: "success" },
      { id: "b", email: "b@example.com", amount: 20, status: "pending" },
    ]
    expect(getPaymentRows(rows, "EXAMPLE", true, 0, 1)).toEqual({
      rows: [rows[1]],
      total: 2,
      page: 0,
      pages: 2,
    })
    expect(getPaymentRows(rows, "missing", false, 4, 1).rows).toEqual([])
    expect(rows[0]?.id).toBe("a")
  })
})
