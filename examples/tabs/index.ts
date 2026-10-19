import { Mosaic } from "../../src/index.js"
import { Tabs } from "./tabs.js"

const rootNode = document.querySelector<HTMLElement>("[data-tabs]")!
Mosaic(rootNode, Tabs({ $$: (query) => [...rootNode.querySelectorAll<HTMLElement>(query)] }))
