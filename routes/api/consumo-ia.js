const express = require("express");
const wrap = require("express-async-error-wrapper");
const ApiSpringBoot = require("../../services/api-springboot");

const router = express.Router();
const caminhoBackend = "/api/v1/consumos-ia";
const duracaoMaximaMs = 31 * 24 * 60 * 60 * 1000;
const statusPermitidos = ["success", "error", "rate_limited", "timeout"];

function problema(res, detail, erros) {
	const resposta = {
		title: "Bad Request",
		status: 400,
		detail,
		codigo: "REQUISICAO_INVALIDA_NODE"
	};

	if (erros && erros.length)
		resposta.erros = erros;

	return res.status(400).json(resposta);
}

function texto(valor) {
	return typeof valor === "string" ? valor.trim() : "";
}

function textoOpcional(valor) {
	const resultado = texto(valor);
	return resultado || null;
}

function validarTextoObrigatorio(dados, campo, rotulo, maximo, erros) {
	const valor = texto(dados[campo]);
	if (!valor) {
		erros.push({ campo, mensagem: `${rotulo} é obrigatório.` });
	} else if (valor.length > maximo) {
		erros.push({ campo, mensagem: `${rotulo} deve ter no máximo ${maximo} caracteres.` });
	}
	return valor;
}

function validarInteiroNaoNegativo(dados, campo, rotulo, erros) {
	const valor = Number(dados[campo]);
	if (!Number.isSafeInteger(valor) || valor < 0)
		erros.push({ campo, mensagem: `${rotulo} deve ser um número inteiro não negativo.` });
	return valor;
}

function dataHoraValida(valor) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(valor))
		return false;
	return !Number.isNaN(new Date(valor).getTime());
}

function normalizarConsumo(dados) {
	const erros = [];
	const consumo = {
		id: validarTextoObrigatorio(dados, "id", "Id do consumo", 64, erros),
		ocorridoEm: texto(dados.ocorridoEm),
		colaboradorId: validarTextoObrigatorio(dados, "colaboradorId", "Id do colaborador", 64, erros),
		empresaId: validarTextoObrigatorio(dados, "empresaId", "Id da empresa", 64, erros),
		departamentoId: validarTextoObrigatorio(dados, "departamentoId", "Id do departamento", 64, erros),
		ferramentaId: validarTextoObrigatorio(dados, "ferramentaId", "Id da ferramenta", 64, erros),
		modeloId: validarTextoObrigatorio(dados, "modeloId", "Id do modelo", 64, erros),
		aplicacao: validarTextoObrigatorio(dados, "aplicacao", "Aplicação", 150, erros),
		quantidadeRequisicoes: validarInteiroNaoNegativo(dados, "quantidadeRequisicoes", "Quantidade de requisições", erros),
		tokensEntrada: validarInteiroNaoNegativo(dados, "tokensEntrada", "Tokens de entrada", erros),
		tokensSaida: validarInteiroNaoNegativo(dados, "tokensSaida", "Tokens de saída", erros),
		latenciaMs: dados.latenciaMs === null || dados.latenciaMs === undefined || dados.latenciaMs === "" ? null : Number(dados.latenciaMs),
		status: texto(dados.status).toLowerCase(),
		projetoId: textoOpcional(dados.projetoId),
		centroCusto: textoOpcional(dados.centroCusto)
	};

	if (!dataHoraValida(consumo.ocorridoEm))
		erros.push({ campo: "ocorridoEm", mensagem: "Data e hora devem usar o formato AAAA-MM-DDTHH:mm:ss." });

	if (!statusPermitidos.includes(consumo.status))
		erros.push({ campo: "status", mensagem: "Status deve ser success, error, rate_limited ou timeout." });

	if (consumo.latenciaMs !== null) {
		if (!Number.isFinite(consumo.latenciaMs) || consumo.latenciaMs < 0 || consumo.latenciaMs > 999999999.999) {
			erros.push({ campo: "latenciaMs", mensagem: "Latência deve estar entre 0 e 999999999.999 ms." });
		} else {
			const casasDecimais = String(dados.latenciaMs).split(".")[1];
			if (casasDecimais && casasDecimais.length > 3)
				erros.push({ campo: "latenciaMs", mensagem: "Latência deve possuir no máximo 3 casas decimais." });
		}
	}

	if (consumo.projetoId && consumo.projetoId.length > 64)
		erros.push({ campo: "projetoId", mensagem: "Id do projeto deve ter no máximo 64 caracteres." });

	if (consumo.centroCusto && consumo.centroCusto.length > 100)
		erros.push({ campo: "centroCusto", mensagem: "Centro de custo deve ter no máximo 100 caracteres." });

	return { consumo, erros };
}

function parametrosConsulta(req, res) {
	const empresaId = texto(req.query.empresaId);
	if (!empresaId || empresaId.length > 64) {
		problema(res, "Informe um empresaId válido com até 64 caracteres.");
		return null;
	}

	const id = texto(req.query.id);
	if (id) {
		if (id.length > 64) {
			problema(res, "Informe um id válido com até 64 caracteres.");
			return null;
		}
		return { id, empresaId };
	}

	const inicio = texto(req.query.inicio);
	const fim = texto(req.query.fim);
	if (!dataHoraValida(inicio) || !dataHoraValida(fim)) {
		problema(res, "Início e fim são obrigatórios no formato AAAA-MM-DDTHH:mm:ss.");
		return null;
	}

	const inicioData = new Date(inicio);
	const fimData = new Date(fim);
	const duracao = fimData.getTime() - inicioData.getTime();
	if (duracao <= 0 || duracao > duracaoMaximaMs) {
		problema(res, "O início deve ser anterior ao fim e o período não pode ultrapassar 31 dias.");
		return null;
	}

	const paginaTexto = req.query.pagina === undefined ? "0" : String(req.query.pagina);
	const tamanhoTexto = req.query.tamanho === undefined ? "20" : String(req.query.tamanho);
	if (!/^\d+$/.test(paginaTexto) || !/^\d+$/.test(tamanhoTexto)) {
		problema(res, "Página e tamanho devem ser números inteiros.");
		return null;
	}

	const pagina = Number(paginaTexto);
	const tamanho = Number(tamanhoTexto);
	if (!Number.isSafeInteger(pagina) || pagina < 0 || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > 100) {
		problema(res, "Página deve ser não negativa e tamanho deve estar entre 1 e 100.");
		return null;
	}

	return { empresaId, inicio, fim, pagina, tamanho };
}

// POST /api/consumos-ia
router.post("/", wrap(async (req, res) => {
	const { consumo, erros } = normalizarConsumo(req.body || {});
	if (erros.length)
		return problema(res, "Verifique os campos indicados em erros.", erros);

	return ApiSpringBoot.encaminhar(res, {
		method: "post",
		url: caminhoBackend,
		data: consumo,
		headers: { "Content-Type": "application/json" }
	});
}));

// GET /api/consumos-ia?id=... ou consulta paginada por período
router.get("/", wrap(async (req, res) => {
	const params = parametrosConsulta(req, res);
	if (!params)
		return;

	return ApiSpringBoot.encaminhar(res, {
		method: "get",
		url: caminhoBackend,
		params
	});
}));

// GET /api/consumos-ia/:id?empresaId=...
router.get("/:id", wrap(async (req, res) => {
	const id = texto(req.params.id);
	const empresaId = texto(req.query.empresaId);
	if (!id || id.length > 64 || !empresaId || empresaId.length > 64)
		return problema(res, "Informe id e empresaId válidos com até 64 caracteres.");

	return ApiSpringBoot.encaminhar(res, {
		method: "get",
		url: caminhoBackend + "/" + encodeURIComponent(id),
		params: { empresaId }
	});
}));

module.exports = router;
