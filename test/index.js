const { assert } = require('chai');
const { createServer } = require('echo.js');
const httpClient = require('../src');

const CRLF = '\r\n';

describe('Our HTTP client supports:', () => {
	const server = createServer();
	const port = process.env.ECHOJS_PORT || 8061;

	before(done => server.listen(port, done));
	after(() => server.close());

	describe('getPizzas()', () => {
		let str = null;
		before(() => httpClient.getPizzas().then(response => (str = response.text)));

		it('Should have GET /api/v1/pizzas', () => assert.isTrue(str.includes('GET /api/v1/pizzas')));
		it('Should have an Accept header of application/json', () =>
			assert.isTrue(str.includes('Accept: application/json')));
	});

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
		it('Should have an Accept header of application/xml', () =>
			assert.isTrue(str.includes('Accept: application/xml')));
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
});

// it.only('', () => console.log(str));
