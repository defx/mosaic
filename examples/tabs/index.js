import { Mosaic } from "../../src/index.js"
import { Tabs } from "./tabs.js"

const rootNode = document.querySelector("[data-tabs]")
Mosaic(rootNode, Tabs({ $$: (query) => [...rootNode.querySelectorAll(query)] }))
