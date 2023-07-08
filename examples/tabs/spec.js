import { define } from "../../src/define.js"
import { Tabs } from "./tabs.js"

define("tabs-example", () => {
  return Tabs({
    // ...
  })
})

describe("tabs", () => {
  let rootNode

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    document.body.removeChild(rootNode)
  })

  function mount() {
    rootNode.innerHTML = /* html */ `
    <div class="tabs">
    <h3 id="tablist-1">
        Danish Composers
    </h3>
    <div role="tablist" aria-labelledby="tablist-1" class="automatic">
        <button id="tab-1" type="button" role="tab" aria-selected="true" aria-controls="tabpanel-1">
            <span class="focus">
                Maria Ahlefeldt
            </span>
        </button>
        <button id="tab-2" type="button" role="tab" aria-selected="false" aria-controls="tabpanel-2" tabindex="-1">
            <span class="focus">
                Carl Andersen
            </span>
        </button>
        <button id="tab-3" type="button" role="tab" aria-selected="false" aria-controls="tabpanel-3" tabindex="-1">
            <span class="focus">
                Ida da Fonseca
            </span>
        </button>
        <button id="tab-4" type="button" role="tab" aria-selected="false" aria-controls="tabpanel-4" tabindex="-1">
            <span class="focus">
                Peter Müller
            </span>
        </button>
    </div>
    <div id="tabpanel-1" role="tabpanel" tabindex="0" aria-labelledby="tab-1">
        <p>
            Maria Theresia Ahlefeldt (16 January 1755 – 20 December 1810) was a Danish, (originally German),
            composer.
            She is known as the first female composer in Denmark.
            Maria Theresia composed music for several ballets, operas, and plays of the royal theatre.
            She was given good critic as a composer and described as a “
            <span lang="da">
                virkelig Tonekunstnerinde
            </span>
            ” ('a True Artist of Music').
        </p>
    </div>
    <div id="tabpanel-2" role="tabpanel" tabindex="0" aria-labelledby="tab-2" class="is-hidden">
        <p>
            Carl Joachim Andersen (29 April 1847 – 7 May 1909) was a Danish flutist, conductor and composer born in
            Copenhagen, son of the flutist Christian Joachim Andersen.
            Both as a virtuoso and as composer of flute music, he is considered one of the best of his time.
            He was considered to be a tough leader and teacher and demanded as such a lot from his orchestras but
            through that style he reached a high level.
        </p>
    </div>
    <div id="tabpanel-3" role="tabpanel" tabindex="0" aria-labelledby="tab-3" class="is-hidden">
        <p>
            Ida Henriette da Fonseca (July 27, 1802 – July 6, 1858) was a Danish opera singer and composer.
            Ida Henriette da Fonseca was the daughter of Abraham da Fonseca (1776–1849) and Marie Sofie Kiærskou
            (1784–1863).
            She and her sister Emilie da Fonseca were students of Giuseppe Siboni, choir master of the Opera in
            Copenhagen.
            She was given a place at the royal Opera alongside her sister the same year she debuted in 1827.
        </p>
    </div>
    <div id="tabpanel-4" role="tabpanel" tabindex="0" aria-labelledby="tab-4" class="is-hidden">
        <p>
            Peter Erasmus Lange-Müller (1 December 1850 – 26 February 1926) was a Danish composer and pianist.
            His compositional style was influenced by Danish folk music and by the work of Robert Schumann; Johannes
            Brahms; and his Danish countrymen, including J.P.E. Hartmann.
        </p>
    </div>
    `
  }

  const select = {
    get tabs() {
      return document.querySelector(`tabs-example`)
    },
  }

  it(`...`, () => {
    mount()
    assert.equal(1, 2)
  })
})
