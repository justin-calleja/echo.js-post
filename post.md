---
date: "2018-17-02"
title: "Run assertions against echoed HTTP requests with echo.js"
tags: [ "echo.js", "node" ]
categories: [ "programming" ]
tocEnabled: true
---

## Intro

Say you're writing an HTTP client and you're given documentation detailing the endpoints supported by a REST API hosted somewhere. One way to test this client is to hit the server actually serving the API.

For whatever reason, you might not want to do this. You might just want to test how you client's HTTP requests look like.

This post will guide you through doing just that with the help of [echo.js](https://github.com/harttle/echo.js).

## echo.js

Basically, `echo.js` is an HTTP server which simply takes any request it receives and sends it back as `text/plain` with a status code of `200`.

You can install it as a dev dependency via `npm` with `npm i -D echo.js`.

## The HTTP client

Our HTTP client code uses [superagent](https://visionmedia.github.io/superagent/) and exports the `getPizza` and `addPizza` functions we want to test:

```js
const superagent = require('superagent');

const defaults = {
	authority: process.env.HTTP_CLIENT_AUTHORITY || 'http://localhost:8061',
	basePath: '/api/v1',
	headers: {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	},
};

function _init({
	authority = defaults.authority,
	basePath = defaults.basePath,
	resourcePath = '/pizzas',
	headers = {},
	verb = 'get',
} = {}) {
	return superagent[verb](`${authority}${basePath}${resourcePath}`).set(Object.assign({}, defaults.headers, headers));
}

const getPizzas = _init;

function addPizza(args = {}) {
	const { name, headers } = args;
	if (!name) throw new Error('A pizza by a falsy name would taste as sweet yet tis an error all the same');

	return _init(
		Object.assign({ verb: 'post' }, args, { headers: Object.assign({ 'X-API-Key': 'foobar' }, headers) }),
	).send({ name });
}

module.exports = {
	getPizzas,
	addPizza,
};
```

The `_init` function defines the common setup we'll use for all calls against the pizza resource. We want all requests to have sensible defaults but we also want everything to be overwritable. The tests we'll be writing soon should help demonstrate this. They will spell out most of the details in the above code. After all, this kind of code lends itself well to being documented via unit tests.

## The unit tests

We can setup our tests as follows using [mocha](https://mochajs.org/) (of course, `mocha` is not a requirement. You should be able to translate the following tests to the framework of your choice).

```js
const { createServer } = require('echo.js');

describe('Our HTTP client supports:', () => {
	const server = createServer();
	const port = process.env.ECHOJS_PORT || 8061;

	before(done => server.listen(port, done));
	after(() => server.close());

	// Add more describe() calls below:
	// ...
});
```

We're simply starting the `echo.js` server before any of our tests run, waiting for the server to be ready for connections (by passing `done` as the callback function), and shutting down the server when all our tests are over.

So… how will our request look like when we call `getPizzas()`? We can simply log out the response we get from our echo server. The property we're interested in is `text`:

```js
const httpClient = require('../src');
// ...
describe('getPizzas()', () => {
	let str = null;
	before(() => httpClient.getPizzas().then(response => (str = response.text)));

	it.only('', () => console.log(str));
});
// ...
```

In `mocha`, `it.only` is simply a way of only running the test in question. This gives us a handy way of inspecting the response we're caching in `str` without seeing the output from any other test we might have already written. You can run the tests with `npm t` in the repo for this post (after installing dependencies with `npm i`). Doing so should output the following:

```
GET /api/v1/pizzas HTTP/1.1
Host: localhost:8061
Accept-Encoding: gzip, deflate
User-Agent: node-superagent/3.8.2
Accept: application/json
Content-Type: application/json
Connection: close
```

… which finally gives us something to assert:

```js
describe('getPizzas()', () => {
	let str = null;
	before(() => httpClient.getPizzas().then(response => (str = response.text)));

	it('Should have GET /api/v1/pizzas', () => assert.isTrue(str.includes('GET /api/v1/pizzas')));
	it('Should have an Accept header of application/json', () =>
		assert.isTrue(str.includes('Accept: application/json')));
});
```

Rinse and repeat:

```js
// ...
const CRLF = '\r\n';
// ...
describe("getPizzas({ basePath: '/api/v2' })", () => {
	let str = null;
	before(() => httpClient.getPizzas({ basePath: '/api/v2' }).then(response => (str = response.text)));

	it('Should have GET /api/v2/pizzas', () => assert.isTrue(str.includes('GET /api/v2/pizzas')));
	it('Should have an Accept header of application/json', () =>
		assert.isTrue(str.includes('Accept: application/json')));
});

describe("getPizzas({ headers: { 'Accept': 'application/xml' } })", () => {
	let str = null;
	before(() =>
		httpClient.getPizzas({ headers: { Accept: 'application/xml' } }).then(response => (str = response.text)),
	);

	it('Should have GET /api/v1/pizzas', () => assert.isTrue(str.includes('GET /api/v1/pizzas')));
	it('Should have an Accept header of application/xml', () => assert.isTrue(str.includes('Accept: application/xml')));
});

describe('addPizza()', () => {
	it('Throws Error when missing name', () => {
		assert.throws(
			() => httpClient.addPizza(),
			'A pizza by a falsy name would taste as sweet yet tis an error all the same',
			'Not passing in name. We expect an error to be thrown. The actual request is only created by using .end() or .then() when using superagent. This error comes from our code.',
		);
	});
});

describe("addPizza({ name: 'margherita' })", () => {
	let str = null;
	before(() => httpClient.addPizza({ name: 'margherita' }).then(response => (str = response.text)));

	it('Should have POST /api/v1/pizzas', () => assert.isTrue(str.includes('POST /api/v1/pizzas')));
	it('Should have an X-API-Key header of foobar', () => assert.isTrue(str.includes('X-API-Key: foobar')));
	it('Should have a Content-Type header of application/json', () =>
		assert.isTrue(str.includes('Content-Type: application/json')));
	it('Should have a body of {"name": "margherita"}', () =>
		assert.isTrue(str.includes(`${CRLF}${CRLF}{"name":"margherita"}`)));
});

describe("addPizza({ name: 'margherita', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })", () => {
	let str = null;
	before(() =>
		httpClient
			.addPizza({ name: 'margherita', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
			.then(response => (str = response.text)),
	);

	it('Should have POST /api/v1/pizzas', () => assert.isTrue(str.includes('POST /api/v1/pizzas')));
	it('Should have an X-API-Key header of foobar', () => assert.isTrue(str.includes('X-API-Key: foobar')));
	it('Should have a Content-Type header of application/x-www-form-urlencoded', () =>
		assert.isTrue(str.includes('Content-Type: application/x-www-form-urlencoded')));
	it('Should have a body of name=margherita', () => assert.isTrue(str.includes(`${CRLF}${CRLF}name=margherita`)));
});

describe("addPizza({ name: 'margherita' }).send({ name: 'capricciosa' })", () => {
	let str = null;
	before(() =>
		httpClient
			.addPizza({ name: 'margherita' })
			.send({ name: 'capricciosa' })
			.then(response => (str = response.text)),
	);

	it('Should have POST /api/v1/pizzas', () => assert.isTrue(str.includes('POST /api/v1/pizzas')));
	it('Should have an X-API-Key header of foobar', () => assert.isTrue(str.includes('X-API-Key: foobar')));
	it('Should have a Content-Type header of application/json', () =>
		assert.isTrue(str.includes('Content-Type: application/json')));
	it('Should have a body of {"name": "capricciosa"}', () =>
		assert.isTrue(str.includes(`${CRLF}${CRLF}{"name":"capricciosa"}`)));
});
```

Which gives us the following handy overview of our client and it's supported functionality when we run our tests:

```
  Our HTTP client supports:
    getPizzas()
      ✓ Should have GET /api/v1/pizzas
      ✓ Should have an Accept header of application/json
    getPizzas({ basePath: '/api/v2' })
      ✓ Should have GET /api/v2/pizzas
      ✓ Should have an Accept header of application/json
    getPizzas({ headers: { 'Accept': 'application/xml' } })
      ✓ Should have GET /api/v1/pizzas
      ✓ Should have an Accept header of application/xml
    addPizza()
      ✓ Throws Error when missing name
    addPizza({ name: 'margherita' })
      ✓ Should have POST /api/v1/pizzas
      ✓ Should have an X-API-Key header of foobar
      ✓ Should have a Content-Type header of application/json
      ✓ Should have a body of {"name": "margherita"}
    addPizza({ name: 'margherita', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      ✓ Should have POST /api/v1/pizzas
      ✓ Should have an X-API-Key header of foobar
      ✓ Should have a Content-Type header of application/x-www-form-urlencoded
      ✓ Should have a body of name=margherita
    addPizza({ name: 'margherita' }).send({ name: 'capricciosa' })
      ✓ Should have POST /api/v1/pizzas
      ✓ Should have an X-API-Key header of foobar
      ✓ Should have a Content-Type header of application/json
      ✓ Should have a body of {"name": "capricciosa"}


  19 passing (65ms)
```

In the following call: `addPizza({ name: 'margherita' }).send({ name: 'capricciosa' })`, note how we're able to modify the request after calling one of our client's API functions. This is because a `superagent` request isn't triggered until `.end()` or (in our case) `.then()` is called.

Although we haven't (as testing usually goes) covered all possible input / output scenarios in our tests, this sort of setup is not half bad. It gives us tests we can run when we change our client code as well as a convenient way of exploration. As we did before, we can simply use `t.only` and log out what we're interested in.
