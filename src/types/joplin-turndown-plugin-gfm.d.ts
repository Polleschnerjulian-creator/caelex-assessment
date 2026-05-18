/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Type-stub für @joplin/turndown-plugin-gfm — die package shippt keine
 * eigenen .d.ts files. Wir brauchen nur den `gfm`-named-export der als
 * TurndownService-Plugin geladen wird (siehe editor-md-bridge.ts).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

declare module "@joplin/turndown-plugin-gfm" {
  import type TurndownService from "turndown";

  /** Combined plugin = strikethrough + tables + task-list-items. */
  export const gfm: TurndownService.Plugin;

  /** Individual sub-plugins, if you only want one. */
  export const strikethrough: TurndownService.Plugin;
  export const tables: TurndownService.Plugin;
  export const taskListItems: TurndownService.Plugin;
}
