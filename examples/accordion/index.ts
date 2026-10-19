import { Mosaic } from "../../src/index.js"
import { Accordion } from "./accordion.js"

Mosaic(document.querySelector<HTMLElement>("[data-accordion]")!, Accordion())
