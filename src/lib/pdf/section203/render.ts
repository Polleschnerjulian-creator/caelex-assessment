/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-side PDF render for the § 203 Verpflichtungserklärung. Pure
 * function: input is a Section203PdfData, output is a Buffer that
 * callers can stream as a download or upload to R2.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  Section203CommitmentDocument,
  type Section203PdfData,
} from "./template";

export async function renderSection203Pdf(
  data: Section203PdfData,
): Promise<Buffer> {
  return renderToBuffer(
    React.createElement(Section203CommitmentDocument, { data }),
  );
}
