import type { OperatorMatrixRow } from "./types";

export const OPERATOR_MATRIX_ROWS: OperatorMatrixRow[] = [
  {
    operator: "Starlink",
    statuses: {
      DE: { status: "licensed", since: "2020-12" },
      US: { status: "licensed", since: "2019-03" },
      IN: { status: "licensed", since: "2025-07-08" },
    },
    last_verified: "2026-04-17",
  },
];
