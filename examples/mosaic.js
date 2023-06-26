function cast(v) {
  if (typeof v === "string" && v.length) {
    return isNaN(v) ? v : +v
  }
  return v
}

function castAll(o) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, cast(v)]))
}

const isPrimitive = (v) => v === null || typeof v !== "object";

function nodeFromString(str) {
  const doc = new DOMParser().parseFromString(str.trim(), "text/html", {
    includeShadowRoots: true, // @todo: required?
  });

  const errorNode = doc.querySelector("parsererror");

  if (errorNode) ; else {
    return doc.head.firstChild || doc.body.firstChild
  }
}

function listItems(listContainerNode, listItemSelector) {
  return [...listContainerNode.children].filter((node) =>
    node.matches(listItemSelector)
  )
}

function listData(listItems) {
  return listItems.map((node) => ({
    id: node.id,
    ...castAll(node.dataset),
  }))
}

function listSync(parentNode, nodes, curr, next, template) {
  // check if anything has changed
  const currIds = curr.map(({ id }) => id);
  const nextIds = next.map(({ id }) => id);

  if (currIds.toString() === nextIds.toString()) return

  // removals
  curr
    .filter((c) => {
      return next.find((n) => c.id === n.id) === undefined
    })
    .forEach(({ id }) => nodes.find((node) => node.id === id)?.remove());

  const [first, ...rest] = next;

  if (!first) return

  let t = first && nodes.find((node) => node.id === first.id);

  if (
    !template &&
    next.find((c) => {
      return curr.find((n) => c.id === n.id) === false
    })
  ) {
    console.error(`Missing template when trying to add items to a list`);
    return
  }

  if (!t) {
    t = nodeFromString(template(first));

    if (nodes[0]) {
      nodes[0].before(t);
    } else {
      parentNode.append(t);
    }
  }

  rest.forEach((d) => {
    let node =
      nodes.find((node) => node.id === d.id) || nodeFromString(template(d));

    if (node) {
      if (t.nextElementSibling !== node) {
        // is t.after already a no-op in this case?
        t.after(node);
      }
      t = node;
    }
  });
}

const pascalToKebab = (string) =>
  string.replace(/[\w]([A-Z])/g, function (m) {
    return m[0] + "-" + m[1].toLowerCase()
  });

const kebabToPascal = (string) =>
  string.replace(/[\w]-([\w])/g, function (m) {
    return m[0] + m[2].toUpperCase()
  });

const objectToClasses = (v = {}) => {
  return Object.entries(v)
    .reduce((c, [k, v]) => {
      if (v) c.push(k);
      return c
    }, [])
    .join(" ")
};

const write = (node, attrs) => {
  for (let [k, v] of Object.entries(attrs || {})) {
    k = pascalToKebab(k);

    if (k === "textContent" && node.textContent !== textContent) {
      node.textContent = textContent;
      continue
    }

    if (k === "class") {
      v = objectToClasses(v);
    }

    if (typeof v === "boolean") {
      if (k.startsWith("aria-")) {
        v = "" + v;
      } else if (v) {
        v = "";
      }
    }

    if (isPrimitive(v) === false) {
      node[kebabToPascal(k)] = v;
      continue
    }

    let current = node.getAttribute(k);

    if (v === current) continue

    if (typeof v === "string" || typeof v === "number") {
      node.setAttribute(k, v);
    } else {
      node.removeAttribute(k);
    }
  }
  return node
};

function initialise(rootNode, config, store) {
  const event = {};
  const { elements = [] } = config;
  let { state = {} } = config;

  // derive initial state from input directives...
  elements
    .filter(({ input }) => input)
    .forEach(({ select, input }) => {
      const targets = [...rootNode.querySelectorAll(select)];
      targets.forEach((target) => {
        state = { ...state, [input]: target.value };

        event.input = event.input || [];
        event.input.push({
          select,
          callback: (event) => {
            const { target } = event;
            store.merge({ [input]: target.value });
          },
        });
      });
    });

  // find event listeners
  elements.forEach((c) => {
    const { select, on } = c;
    if (on) {
      Object.entries(on).forEach(([type, callback]) => {
        event[type] = event[type] || [];
        event[type].push({
          select,
          callback,
        });
      });
    }
  });

  // delegate from the root node
  Object.entries(event).forEach(([type, listeners]) => {
    rootNode.addEventListener(type, (e) => {
      listeners
        .filter(({ select }) => e.target.matches(select))
        .forEach(({ select, callback }) => {
          if (typeof callback === "function") {
            callback(e, store);
          }
          if (typeof callback === "string") {
            const { target } = e;

            const targets = [...rootNode.querySelectorAll(select)];

            const index = targets.indexOf(target);

            store.dispatch(callback, { event: e, index });
          }
        });
    });
  });

  const onChange = (state) => {
    // lists first
    elements
      .filter(({ list }) => list)
      .forEach(({ select, list }) => {
        const targets = [...rootNode.querySelectorAll(select)];
        targets.forEach((target) => {
          const items = listItems(target, list.select);
          const curr = listData(items);
          const next = state[list.from];
          listSync(target, items, curr, next, list.template);
        });
      });

    // then the rest...
    elements.forEach((c) => {
      const { select, attribute, input } = c;

      const targets = [...rootNode.querySelectorAll(select)];

      targets.forEach((target, i) => {
        if (attribute) {
          write(target, attribute(state, i));
        }
        if (input) {
          const value = state[input];

          if (target.value !== value) target.value = value;
        }
      });
    });
  };

  store.subscribe(onChange);
  store.set(state);
}

const Message = (callbacks) => {
  const subscribers = [];
  return {
    subscribe(fn) {
      subscribers.push(fn);
    },
    publish(...args) {
      subscribers.forEach((fn) => fn(...args));
      callbacks.postPublish?.();
    },
  }
};

function debounce(fn) {
  let id;
  return (...args) => {
    if (!id) {
      id = requestAnimationFrame(() => {
        fn(...args);
        id = null;
      });
    }
  }
}

function Store({
  action: actionHandlers = {},
  getState: getStateWrapper = (v) => v,
}) {
  let state;
  let nextTickSubscribers = [];

  const message = Message({
    postPublish: () => {
      nextTickSubscribers.forEach((fn) => fn(state));
      nextTickSubscribers = [];
    },
  });

  const transition = debounce(() => {
    message.publish(getState());
  });

  function set(o) {
    state = getStateWrapper({ ...o });
  }

  function getState() {
    return { ...state }
  }

  function dispatch(type, action) {
    if (type in actionHandlers) {
      const x = actionHandlers[type](getState(), action);
      set(x);
      transition();
    }
  }

  return {
    dispatch,
    getState,
    merge: (o) => {
      set({ ...getState(), ...o });
      transition();
    },
    set: (o) => {
      set(o);
      message.publish(getState());
    },
    subscribe: message.subscribe,
  }
}

const Mosaic = (node, config) => {
  const store = Store({
    ...config,
  });

  initialise(node, config, store);

  return store
};

const define = (name, configFn) => {
  if (customElements.get(name)) return

  customElements.define(
    name,
    class extends HTMLElement {
      async connectedCallback() {
        const config = configFn(this);

        // @todo: reflection
        const observed = new Set();

        const store = Mosaic(this, config);

        const { merge } = store;

        const sa = this.setAttribute;
        this.setAttribute = (name, value) => {
          if (observed.has(name)) {
            merge({ [name]: value });
          }
          return sa.apply(this, [name, value])
        };
        const ra = this.removeAttribute;
        this.removeAttribute = (name) => {
          if (observed.has(name)) {
            merge({ [name]: null });
          }
          return ra.apply(this, [name])
        };
      }
    }
  );
};

export { define };
