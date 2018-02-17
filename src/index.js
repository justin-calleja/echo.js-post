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
