const axios = require("axios");

const urlSpringBoot = (process.env.url_springboot || "").replace(/\/+$/, "");

const cliente = urlSpringBoot ? axios.create({
	baseURL: urlSpringBoot,
	timeout: 10000,
	headers: {
		Accept: "application/json"
	}
}) : null;

function responderSucesso(res, response) {
	if (response.status === 204)
		return res.status(204).end();

	return res.status(response.status).json(response.data);
}

function responderErro(res, ex) {
	if (ex.response) {
		const resposta = ex.response.data || {
			detail: "O backend recusou a operação.",
			codigo: "ERRO_BACKEND"
		};
		return res.status(ex.response.status).json(resposta);
	}

	if (ex.code === "ECONNABORTED") {
		return res.status(504).json({
			detail: "O backend demorou demais para responder.",
			codigo: "TIMEOUT_BACKEND"
		});
	}

	return res.status(502).json({
		detail: "Não foi possível comunicar com o backend Spring Boot.",
		codigo: "BACKEND_INDISPONIVEL"
	});
}

async function encaminhar(res, configuracao) {
	if (!cliente) {
		return res.status(500).json({
			detail: "A variável url_springboot não foi configurada.",
			codigo: "CONFIGURACAO_INVALIDA"
		});
	}

	try {
		const response = await cliente.request(configuracao);
		return responderSucesso(res, response);
	} catch (ex) {
		return responderErro(res, ex);
	}
}

module.exports = {
	encaminhar
};
