"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * CatalogList — the catalog's card list with a reduced-motion-safe load stagger.
 *
 * The catalog page (`planspiele/page.tsx`) is a SERVER component: it resolves all
 * i18n + run-status data and renders each card's full markup (including the
 * server-only `ProgressBadge`) on the server, then hands the finished nodes here
 * as `items`. This thin CLIENT island owns ONLY the framer-motion stagger — the
 * single reason it exists — so no scenario data, no t()/playT, and no business
 * logic crosses the boundary. Server-rendered nodes passed as props is a
 * fully-supported App-Router pattern.
 *
 * STRICTLY MONOCHROME: this island paints nothing; it only animates opacity +
 * a tiny upward translate. No colour is introduced.
 *
 * Motion: the <ul> is a stagger container; each row fades/rises in sequence on
 * mount. When the user prefers reduced motion (`useReducedMotion()`), the
 * variants collapse to the static end-state (opacity 1, no transform) and no
 * tween runs — the list simply appears.
 *
 * Accessibility: the list is a real `role="list"`; each row a `<motion.li>`.
 * The animation is decorative and never gates content visibility (the end-state
 * is always fully visible, including with JS-disabled SSR output).
 */
export function CatalogList({ items }: { items: React.ReactNode[] }) {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.05, delayChildren: 0.02 },
    },
  };

  const row = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
        },
      };

  return (
    <motion.ul
      className="space-y-3"
      role="list"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {items.map((node, i) => (
        <motion.li key={i} variants={row}>
          {node}
        </motion.li>
      ))}
    </motion.ul>
  );
}
