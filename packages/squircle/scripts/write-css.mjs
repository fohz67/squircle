// Emits styles.css from the same source string the runtime injects.
import { writeFileSync } from "node:fs";
import { SQUIRCLE_CSS } from "../dist/index.js";
writeFileSync(new URL("../styles.css", import.meta.url), SQUIRCLE_CSS + "\n");
