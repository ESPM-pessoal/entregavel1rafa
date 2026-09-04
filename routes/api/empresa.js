const express = require("express");
const wrap = require("express-async-error-wrapper");
const axios = require("axios");

const router = express.Router();

const url_springboot = (process.env.url_springboot || "").replace(/\/+$/, "");
const apiSpringBoot = url_springboot ? axios.create({
	baseURL: url_springboot,
	timeout: 10000
}) : null;

function validarId(valor) {
	const id = Number.parseInt(valor, 10);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function validarEmpresa(empresa) {
	if (!empresa || typeof empresa !== "object")
		return "Dados da empresa são obrigatórios";

	if (typeof empresa.company_name !== "string" || !empresa.company_name.trim())
		return "Nome da empresa é obrigatório";

	if (empresa.company_name.trim().length > 100)
		return "Nome da empresa deve ter no máximo 100 caracteres";

	if (typeof empresa.industry !== "string" || !empresa.industry.trim())
		return "Indústria é obrigatória";

	if (typeof empresa.company_size !== "string" || !empresa.company_size.trim())
		return "Tamanho da empresa é obrigatório";

	const quantidade = Number(empresa.employee_count);
	if (!Number.isInteger(quantidade) || quantidade < 1)
		return "Quantidade de funcionários deve ser um número inteiro maior que zero";

	return null;
}

function responderSucesso(res, response) {
	if (response.status === 204)
		return res.status(204).end();

	return res.status(response.status).json(response.data);
}

function responderErro(res, ex) {
	if (ex.response) {
		const resposta = ex.response.data || "O backend recusou a operação";
		return res.status(ex.response.status).json(resposta);
	}

	if (ex.code === "ECONNABORTED")
		return res.status(504).json("O backend demorou demais para responder");

	return res.status(502).json("Não foi possível comunicar com o backend Spring Boot");
}

async function encaminhar(res, chamada) {
	if (!apiSpringBoot)
		return res.status(500).json("A variável url_springboot não foi configurada");

	try {
		const response = await chamada();
		return responderSucesso(res, response);
	} catch (ex) {
		return responderErro(res, ex);
	}
}

router.get("/listar", wrap(async (req, res) => {
	return encaminhar(res, () => apiSpringBoot.get("/api/empresas"));
}));

router.get("/obter", wrap(async (req, res) => {
	const id = validarId(req.query["id"]);
	if (!id)
		return res.status(400).json("Id da empresa inválido");

	return encaminhar(res, () => apiSpringBoot.get("/api/empresas/" + id));
}));

router.post("/criar", wrap(async (req, res) => {
	const dados = req.body || {};
	const empresa = {
		company_name: typeof dados.company_name === "string" ? dados.company_name.trim() : dados.company_name,
		industry: typeof dados.industry === "string" ? dados.industry.trim() : dados.industry,
		company_size: typeof dados.company_size === "string" ? dados.company_size.trim() : dados.company_size,
		employee_count: Number(dados.employee_count)
	};

	const erro = validarEmpresa(empresa);
	if (erro)
		return res.status(400).json(erro);

	return encaminhar(res, () => apiSpringBoot.post("/api/empresas", empresa));
}));

router.put("/editar", wrap(async (req, res) => {
	const empresa = req.body;
	const erro = validarEmpresa(empresa);
	if (erro)
		return res.status(400).json(erro);

	return encaminhar(res, () => apiSpringBoot.put("/api/empresas", empresa));
}));

router.delete("/excluir", wrap(async (req, res) => {
	const id = validarId(req.query["id"]);
	if (!id)
		return res.status(400).json("Id da empresa inválido");

	return encaminhar(res, () => apiSpringBoot.delete("/api/empresas/" + id));
}));

module.exports = router;
