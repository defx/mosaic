export = mosaic
export as namespace mosaic
declare namespace mosaic {
  function define(
    /**
     * The name for the new custom element. As per the Custom Element spec,
     * the name must include a hyphen.
     */
    name: string,
    /**
     * A factory function that will be called whenever a new instance of your
     * custom element is created. Returns the object that will provide the data for your custom element.
     */
    factory: ModelFactory,
    /**
     * The template represents the HTML markup for your element.
     */
    template: HTMLTemplateElement | string,
    options: {
      /**
       * If this is omitted then Shadow DOM is not utilised and <slot> functionality is polyfilled.
       */
      shadow?: "open" | "closed"
    }
  ): void

  type Model = {
    /**
     * Invoked each time the custom element is appended into a
     * document-connected element
     */
    connectedCallback?(): void
    /**
     * Invoked each time the view is updated. This method is not called after the initial render. previous is an object representing the model state prior to the last update
     */
    updatedCallback?(previous: Model): void
    /**
     * Invoked each time the custom element is disconnected from the document
     */
    disconnectedCallback?(): void
    [s: string]: any
  }

  type ModelFactory = {
    (
      /**
       * The element node
       */
      element: HTMLElement
    ): Model | Promise<Model>
  }
}
