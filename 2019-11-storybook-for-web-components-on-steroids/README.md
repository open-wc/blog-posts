---
title: Storybook for web components on steroids
published: false
description: Writing demos...
tags: javascript, webcomponents, storybook, demos
---

Building a web application is quite a big and challenging task.
As with many big tasks, it makes sense to break them into smaller pieces.
For applications, this usually means splitting your application into multiple separate components.

Once you start doing that you will notice that you will have a lot of individual pieces in your hand and that it can be tough to keep an overview of all these moving parts.

To solve this we have been recommending [storybook](http://storybook.org) since quite some time.

The support for web components has always been good (via `@storybook/polymer`) and have gotten even better with the recently added `@storybook/web-components`.

There are however some parts in storybook which are not fine-tuned for developing web components (the open-wc way).

Let's look at some of those points an how we can improve them.

After a [typical setup](http://putlink) a workflow looks like this.

```bash
$ start-storybook
info @storybook/web-components v5.3.0-alpha.40
info
info => Loading presets
info => Loading presets
info => Loading custom manager config.
info => Using default Webpack setup.
webpack built b6c5b0bf4e5f02d4df8c in 7853ms
╭───────────────────────────────────────────────────╮
│                                                   │
│   Storybook 5.3.0-alpha.40 started                │
│   8.99 s for manager and 8.53 s for preview       │
│                                                   │
│    Local:            http://localhost:52796/      │
│    On your network:  http://192.168.1.5:52796/    │
│                                                   │
╰───────────────────────────────────────────────────╯
# browser opens
```

When we compare this to an open-wc typical setup with es-dev-server

```bash
$ npm run start
es-dev-server started on http://localhost:8000
  Serving files from '/my-demo'.
  Opening browser on '/my-demo/'
  Using history API fallback, redirecting non-file requests to '/my-demo/index.html'
# browser opens
```

The most obvious difference is that in one case we have 2 builds of ~8 seconds and in the other, we don't have any.

So why there are 2 builds?

To get an idea about why this might be needed we first need to understand some of the requirements of a universal demo system like storybook.

### Excursion universal demo system

Let's assume we have a very simple demo system build with vue. Now if I would like to demo a react or angular components how would that work?

::TODO: make vue demo::

So the issue is that having the demo UI and the component demo on the same page will mean you can only create demos for the system that the UI provides.
That sure sounds scary as that would mean every framework needs to come up with their own demo system 😭

But what if we could split the UI and the demo?

We can use iframes and communicate via postMessage 🤞

Let's make a simple example with

- a ul/li list as a menu
- an iframe to show the demo

What we need:

1. We start with an empty menu
2. We listen to post messages of demos
3. The iframe gets loaded and the demos inside fires post messages
4. We then create menu items for each demo
5. On click on the menu item, we change the iframe url
6. If the iframe gets a demo to show it updates the html

Here is the `index.html`

```html
<ul id="menu"></ul>
<iframe id="iframe" src="./iframe.html"></iframe>

<script>
  window.addEventListener('message', ev => {
    const li = document.createElement('li');
    li.addEventListener('click', ev => {
      iframe.src = `./iframe.html?slug=${slug}`;
    });
    menu.appendChild(li);
  });
</script>
```

Here is the `iframe.html`

```html
<body>
  <h1>Please select a demo by clicking in the menu</h1>
</body>

<script>
  // Demo One
  if (window.location.href.indexOf('demo-one') !== -1) {
    document.body.innerHTML = '<h1>Hey there from demo two</h1>';
  }
  // Demo Two
  if (window.location.href.indexOf('demo-two') !== -1) {
    document.body.innerHTML = '<h1>I am demo two</h1>';
  }

  // register demos when not currently showing a demo
  if (window.location.href.indexOf('slug') === -1) {
    parent.postMessage({ name: 'Demo One', slug: 'demo-one' });
    parent.postMessage({ name: 'Demo Two', slug: 'demo-two' });
  }
</script>
```

> The code here shows only the most relevant information
> For a demo and more details look in the [postMessage](./postMessage) folder
> You can start it via `npm i && npm run start`

With such a setup you are totally free to combine any number of systems for UI and actual component demos.

### Two builds (continued)

So as you saw in storybook there are actually 2 applications being used. One is the storybook UI (called manager) and one is your actual demo (called preview). Knowing that it makes sense that there are 2 separate builds.

But why is there a build step at all?

1. compiling the preview to es5 makes sure that it runs in every browser (e.g. we ship the same code to all browsers)
2. the manager can be configured with different settings or addons

However, shipping es5 code to a modern browser increases the bundle size unnecessarily and can make debugging more complicated in certain cases.

Let's consider this example which has a debugger when triggering the toggle.

```js
class DemoWcCard() {
  // ...
  toggle() {
    debugger;
    this.backSide = !this.backSide;
  }
  // ...
}
```

Now when clicking the card the following code will actually be executed in your browser

```js
_createClass(DemoWcCard, [
  // ...
  {
    key: 'toggle',
    value: function toggle() {
      debugger;
      this.backSide = !this.backSide;
    },
  },
  // ...
]);
```

Luckily in most cases, you will not see the raw es5 code as storybook/webpack does a good job of providing sourcemaps.
[Sourcemaps](https://blog.teamtreehouse.com/introduction-source-maps) are a way to show the original code even though the browser actually executes something else.

It is really awesome that it justs works. It is however yet another moving part that may break or you need to know about at least.

So the question is why not just ship the source if the browser understands it?

## Excursion shipping modern code

Let's have a very small file

```js
// index.js
import { MyClass } from './MyClass.js';

const inst = new MyClass();
inst.publicMethod();

// MyClass.js
export class MyClass {
  constructor() {
    this.message = 'MyClass loaded and instantiated';
  }

  publicMethod() {
    document.body.innerHTML = this.message;
    debugger;
  }
}
```

and open it with webpack - by default sourcemaps are not enabled so you will see

```js
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, 'MyClass', function() {
  return MyClass;
});
class MyClass {
  constructor() {
    this.message = 'MyClass loaded and instantiated';
  }

  publicMethod() {
    document.body.innerHTML = this.message;
    debugger;
  }
}
```

When opening the same page in a modern browser with es-dev-server you see exactly\* the source code.

\*only bare module imports are resolved if needed

> The code here shows only the most relevant information
> For a demo and more details look in the [EsDevServer-vs-WebpackDevServer](./EsDevServer-vs-WebpackDevServer) folder
> You can start it via `npm i && npm run start` and `npm run start:storybook`

## Opportunity

So looking at compilation and shipping of modern code we a window of an opportunity.

In short, the idea is to marry storybook ui with es-dev-server.

Let's get started 💪

Here is the master plan

1. prebuilt storybook ui (so we are not forced to use webpack)
2. Replace webpack magic like `require.context`
3. Mimic how the preview communicates with the manager
4. Use rollup to build a static version of storybook

## Storybook on steroids

### Prebuilt storybook

In order to get an es module version of the storybook preview, it needs to go through webpack & rollup.
Yes, it is a little black magic but that was the only way that worked.
It seems storybook is not yet optimized to have a fully separated manager/preview.
But hey it works and we will collaborate with storybook to make this even better 💪

You can find the source [on github](https://github.com/open-wc/storybook-prebuilt) and the output is published on [npm as @open-wc/storybook-prebuilt](https://www.npmjs.com/package/@open-wc/storybook-prebuilt).

Prebuilt has the following benefits:

- fast
- preview can be independent of storybooks build setup

Prebuilt has the following downsides:

- you can not change the addons of a prebuilt
- you can, however, create your own prebuilt

### Replace webpack magic

`require.context` is used in `preview.js` to define which stories are loaded this is, however, a feature only available in `webpack` so we replaced it with a command-line argument.

In short instead of defining where to look for stories in your js you now do it on the command line via

```bash
start-storybook --stories 'path/to/stories/*.stories.{js,mdx}'
```

Doing so allows exposing this value for various tools like `koa-middlewares` and `rollup`.

### Mimic how the preview communicates with the manager

Now that we can "include/use" the storybook UI (manager) independent it's time to spin up `es-dev-server`.

For the manager, we create an `index.html` which boils down to a single import

```html
<script src="path/to/node_modules/@open-wc/storybook-prebuilt/dist/manager.js"></script>
```

We do some special caching to make sure your browser only ever loads the storybook manager once.

For the preview, it is a little more as we need to load/register all the individual stories as shown in the postMessage example.
The list of stories we will get via the command line argument.

The important bits which end up being used by the browser is a dynamic import of all story files and then calling storybook to configure which will trigger a postMessage.

```js
import { configure } from './node_modules/@open-wc/demoing-storybook/index.js';

Promise.all([
  import('/stories/demo-wc-card.stories.mdx'),
  // here an import to every story file will created
]).then(stories => {
  configure(() => stories, {});
});
```

##### Extra mdx support

With the next version of storybook 5.3 docs mode will become the primary mode of writing documentation with demos on the same page.

For that, we added a koa middleware which converts mdx to CSF whenever a `.mdx` file gets requested.

#### Use rollup to build a static storybook

In most cases, you will also want to publish your storybook someone on a static server.
For that, we pre-setup a rollup configuration and which does all of the above and outputs 2 versions.

1. for modern browsers who support es modules and
2. for all other browsers we ship an es5 version with all polyfills

For more details on how the different versions are shipped from a static server please see the [open-wc rollup recommendation](https://open-wc.org/building/building-rollup.html#configuration).

> The code here shows only the most relevant information
> For a full demo see the [storybookOnSteroids](./storybookOnSteroids) folder
> You can start it via `npm i && npm run storybook`
> For the actual source code see [@open-wc/demoing-storybook](https://github.com/open-wc/open-wc/tree/master/packages/demoing-storybook)
