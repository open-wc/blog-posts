---
title: Storybook for web components on steroids
published: false
description: Writing demos...
tags: javascript, webcomponents, storybook, demos
---

Building a web application is quite a big and challenging task.
As with many big tasks, it makes sense to break them into smaller pieces.
For applications, this usually means splitting your application into multiple separate components.

Once you start doing that you will notice that you have a lot of individual pieces in your hands, and that it can be tough to keep an overview of all these moving parts.

To solve this we have been recommending [storybook](http://storybook.org) since quite some time.

The support for web components has always been good (via `@storybook/polymer`), and it got even better with the recently added `@storybook/web-components`.

There are however some parts in storybook which are not fine-tuned for developing web components (the open-wc way).

Let's look at some of those points and how we can improve them.

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

## Excursion universal demo system

Let's assume we are a startup and we are creating a new app.
Our choice of technology is vue. We happily start building our app and soon we see the need of having a demo system to show and work on all these individual components. Go forth they said and we built a demo system for vue.

It could look something like this

```html
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <ul>
      <li v-for="demo in demos" v-on:click="showDemo(demo.name)">{{demo.name}}</li>
    </ul>

    <div v-html="demo"></div>
  </div>
</template>

<script>
  export default {
    name: 'HelloWorld',
    props: {
      msg: {
        type: String,
        default: 'My Demo System',
      },
      demos: {
        type: Array,
        default: () => [
          { name: 'Demo One', content: '<h1>Hey there from demo one</h1>' },
          { name: 'Demo Two', content: '<h1>I am demo two</h1>' },
        ],
      },
    },
    methods: {
      showDemo: function(name) {
        this.demoIndex = this.demos.findIndex(el => el.name === name);
      },
    },
    data() {
      return {
        demoIndex: -1,
      };
    },
    computed: {
      demo() {
        if (this.demoIndex >= 0) {
          return this.demos[this.demoIndex].content;
        }
        return '<h1>Please select a demo by clicking in the menu</h1>';
      },
    },
  };
</script>
```

> The code here shows only the most relevant information
> For a demo and more details look in the [vue-demo-system](./vue-demo-system) folder
> You can start it via `npm i && npm run serve`

Everything works, everyone is happy - life is good.

Fast forward 12 months and we got a new CIO. A new wind is blowing and with it a prosperous opportunity to work on a second app.
The breeze, however, demands that this time it is written in Angular. No, problem - we are professionals and off we go working on the new app.
Pretty early we see a similar pattern as before - components everywhere and we need a way to work and demo them individually.
Ah we think that's easy we already have a system for that 😬
We give our best - but the angular components just don't wanna work well together with the vue demo app 😭.

What can we do? Do we really need to recreate the demo system for Angular now?

It seems our issue is that having the demo UI and the component demo on the same page has the unwanted side effect that we can only use the UI system within our demos.
Not very universal that is 😅
Could we split the UI and the demo?

How about using iframes and only communicate via postMessage?
Would that mean each window can do what they want? 🤞

Let's make a simple POC (proof of concept) with

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

Now imagine that the UI is way more than just a ul/li list and that the demo follows a certain demo format?
Could this be a system which allows the UI and the demo to be written in completely different technologies?

The answer is YES 💪

The only means of communication is done via postMessages.
Therefore the preview only needs to know which postMessage format to use.
Also, postMessage is a native function so every framework or system can use them.

### Two builds (continued)

The above concept is what is used by storybook - which means that there are actually 2 applications being run.
One is the storybook UI (called manager) and one is your actual demo (called preview).
Knowing that it makes sense that there are 2 separate builds.

But why is there a build step at all? Why would storybook have such setup?

Let's see what is needed to allow for some code to be run and worked on in multiple browsers.

### Excursion shipping code based on browser capabilities

Let's have a small example where we are using [private class fields](https://github.com/tc39/proposal-class-fields).
This feature is currently at stage 3 and only available in Chrome.

```js
// index.js
import { MyClass } from './MyClass.js';

const inst = new MyClass();
inst.publicMethod();

// MyClass.js
export class MyClass {
  #privateField = 'My Class with a private field';

  publicMethod() {
    document.body.innerHTML = this.#privateField;
    debugger;
  }
}
```

We deliberately put a debugger breakpoint in there to see the actual code the browser is executing.

Let's see how webpack with a few babel plugins handles it. ([see full config](./EsDevServer-vs-WebpackDevServer/webpack.config.js))

```js
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MyClass", function() { return MyClass; });
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) {
// ... more helper functions

var MyClass =
/*#__PURE__*/
function () {
  function MyClass() {
    _classCallCheck(this, MyClass);

    _privateField.set(this, {
      writable: true,
      value: 'My Class with a private field'
    });
  }

  _createClass(MyClass, [{
    key: "publicMethod",
    value: function publicMethod() {
      document.body.innerHTML = _classPrivateFieldGet(this, _privateField);
      debugger;
    }
  }]);

  return MyClass;
}();

var _privateField = new WeakMap();
```

Wow that is quite some code 🙈 and it does not really look like the code written 😱

What happened? in a typical webpack & babel setup your code gets compiled down to es5 in order to be able to run the code also on older browser like IE11.

However, you may ask how often do I actually run my app in an older browser?

A typical developer should probably develop ~90% on a modern browser and ~10% on older browsers to make sure everything still works in order.
At least we hope you have such a nice workflow 🤗

So the question is why compile, ship, debug and work with this "strange" code 100% of the time if it's only needed for 10%?
Could we do better?

Let's see how `es-dev-server` handles it by opening the same file on chrome.

```js
export class MyClass {
  #privateField = 'My Class with a private field';

  publicMethod() {
    document.body.innerHTML = this.#privateField;
    debugger;
  }
}
```

It looks exactly as the original code - because it is. The code as is was fully capable of running in chrome without any adjustments.
And that's what is happening it ships the source as is.

However, we are using private class fields which is an unsupported feature for example on Firefox.
What happens if we open it there?

it fails 😭

> SyntaxError: private fields are not currently supported

ok, it's our fault as we are using a stage 3 feature and are not doing any compilation now.

Let's try it with `es-dev-server --babel` which in turn will use the same `.babelrc` as webpack.

The following code will be generated.

```js
function _classPrivateFieldGet(receiver, privateMap) {
  var descriptor = privateMap.get(receiver);
  if (!descriptor) {
    throw new TypeError('attempted to get private field on non-instance');
  }
  if (descriptor.get) {
    return descriptor.get.call(receiver);
  }
  return descriptor.value;
}

export class MyClass {
  constructor() {
    _privateField.set(this, {
      writable: true,
      value: 'My Class with a private field',
    });
  }

  publicMethod() {
    document.body.innerHTML = _classPrivateFieldGet(this, _privateField);
    debugger;
  }
}

var _privateField = new WeakMap();
```

And it works 💪
It only compiles the private fields and not everything 👌

However, if you now go back to chrome you will see that it is now compiled there as well.
The reason for it is that once you start going through babel it just does it's thing based on `@babel/preset-env` and babel is always on the conservative side.
Therefore if you are concerned about speed it is best to only rely on stage 4 features and to not use babel at all.
If you really need you can have 2 start commands

```json
"start": "es-dev-server --open",
"start:babel": "es-dev-server --babel --open",
```

However, the real magic happens when you open an older browser like IE11.
As then it will compile it down to [systemjs](https://github.com/systemjs/systemjs), a polyfill for es modules.

It will look something like this

```js
System.register([], function(_export, _context)) {
  "use strict";

  var MyClass, _privateField;

  function _classCallback(instance, Constructor) {
// ...
```

It will behave exactly like real es modules, so that your code will work just fine on browsers which don't support them 💪

So what es-dev-server auto mode enables is that you don't need to think about it.
It will be instant on modern browsers and will even work in these moments where you have a need to test in older browsers.

To summarize in order to be able to work with and debug code in all the browser we want to support we basically have 2 options.

1. Compile down to the lowest denominator
2. Serve code base on browser capabilities

And as always please don't go crazy with new features.
Use what is currently stable and available on your development browser.
You will have the best experience when you do not use a custom babel config.

> The code here shows only the most relevant information
> For a demo and more details look in the [EsDevServer-vs-WebpackDevServer](./EsDevServer-vs-WebpackDevServer) folder
> You can start it via `npm run start`, `npm run start:babel` and `npm run webpack`

### Source maps

Luckily in most cases, even when working with compiled code you will see the source code.
How is that possible? It's all thanks to [Sourcemaps](https://blog.teamtreehouse.com/introduction-source-maps).
They are a way to map the original code to the compiled code and browser are smart enough to link them together and only show you what you are interested in.
As long as the option "Enable JavaScript source maps" is checked in your dev tools.

It is really awesome that it justs works. It is however yet another moving part that may break or you need to know about it at least.

## Opportunity

So looking at compilation and shipping of modern code we see a window of opportunity.
We want to have the features of storybook but we also want to have the ease of use of not relying on webpack.

In short, the idea is to marry storybook ui with es-dev-server.

Let's get started 💪

Here is the master plan

1. Prebuild storybook ui (so we are not forced to use webpack)
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

In the current storybook `require.context` is used in `preview.js` to define which stories are loaded.
This is, however, a feature only available in `webpack` which basically means it is a lock in to a specific build tool.
We would like to free ourself to choose whatever we want so this needs to be replaced.

We opted for a command-line argument.

In short instead of defining where to look for stories in your js you now do it on the command line via

```bash
start-storybook --stories 'path/to/stories/*.stories.{js,mdx}'
```

Doing so allows exposing this value to various tools like `koa-middlewares` and `rollup`.

### Mimic how the preview communicates with the manager

Now that we can "include/use" the storybook UI (manager) independent it's time to spin up `es-dev-server`.

For the manager, we create an `index.html` which boils down to a single import

```html
<script src="path/to/node_modules/@open-wc/storybook-prebuilt/dist/manager.js"></script>
```

We do some special caching to make sure your browser only ever loads the storybook manager once.

For the preview, it is a little more as we need to load/register all the individual stories as shown in the postMessage example.
The list of stories we will get via the command line argument.

The important bits which end up being used by the browser is a dynamic import of all story files and then calling storybooks configure which will trigger a postMessage.

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

The upcoming storybook 5.3.x (currently in beta) will introduce docs mode.
A special mode which allows writing markdown together with stories in a single file and it will be displayed on a single page.
You can think of it as Markdown but on steroids 😬

The format is called mdx and allows to write markdown but also to import javascript and write jsx.

We recommend it as the primary way to write documentation about your components.

In order to support such a feature es-dev-server needs to understand how to handle an mdx file.

For that, we added a [koa middleware](https://github.com/open-wc/open-wc/blob/demoing-storybook%401.0.9/packages/demoing-storybook/src/shared/createMdxToJsTransformer.js) which converts requests to `*.mdx` files into the [CSF](https://storybook.js.org/docs/formats/component-story-format/)(Component Story Format).

It basically means when you request `http://localhost:8001/stories/demo-wc-card.stories.mdx` and the file look like this on the file system:

```md
###### Header

<Story name="Custom Header">
  {html`
    <demo-wc-card header="Harry Potter">A character that is part of a book series...</demo-wc-card>
  `}
</Story>
```

it will server something like this to your browser

```js
// ...
mdx('h6', null, `Header`);
// ...
export const customHeader = () => html`
  <demo-wc-card header="Harry Potter">A character that is part of a book series...</demo-wc-card>
`;
customHeader.story = {};
customHeader.story.name = 'Custom Header';
customHeader.story.parameters = {
  mdxSource:
    'html`\n    <demo-wc-card header="Harry Potter">A character that is part of a book series...</demo-wc-card>\n  `',
};
```

You can just open your Network Panel and look at the response 💪

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

### Verdict

We did it 💪

A fully-featured demo system that

- is buildless on modern browsers
- starts up lightning-fast
- has a prebuilt UI
- serves preview code based on browser capabilities
- uses `es-dev-server` under the hood so you can use all its features

And above all, it's just wonderful to see how a completely separate server can power storybook.
The storybook setup is really worth it 👍

PS: it's not all roses and rainbows but with that step, we now know that it is possible - further improvements like a smaller preview bundle or separate packages for the mdx transformation will happen at some point 🤗

#### Future

We hope that this can be a starting point so storybook can directly support other framework servers as well 👍
Even non JavaScript servers could be possible - Ruby, PHP are you ready? 🤗

If you are interested in supporting your frameworks server and you need help/guidance be sure to let us know.
