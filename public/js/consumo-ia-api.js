(function () {
	"use strict";

	function mensagemDoErro(dados, status) {
		if (typeof dados === "string")
			return dados;
		if (dados && dados.detail)
			return dados.detail;
		if (dados && dados.mensagem)
			return dados.mensagem;
		if (dados && dados.message)
			return dados.message;
		return "A requisição falhou com status " + status + ".";
	}

	async function requisitar(url, opcoes) {
		const response = await fetch(url, opcoes);
		const texto = await response.text();
		let dados = null;

		if (texto) {
			try {
				dados = JSON.parse(texto);
			} catch (_) {
				dados = texto;
			}
		}

		if (!response.ok) {
			const erro = new Error(mensagemDoErro(dados, response.status));
			erro.status = response.status;
			erro.dados = dados;
			throw erro;
		}

		return dados;
	}

	function dataHoraApi(valor) {
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor))
			return valor + ":00";
		return valor;
	}

	window.ConsumoIaApi = {
		registrar: function (consumo) {
			return requisitar("/api/consumos-ia", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(consumo)
			});
		},

		obterPorId: function (id, empresaId) {
			const params = new URLSearchParams({ empresaId: empresaId });
			return requisitar("/api/consumos-ia/" + encodeURIComponent(id) + "?" + params.toString());
		},

		obterPorChave: function (id, empresaId) {
			const params = new URLSearchParams({ id: id, empresaId: empresaId });
			return requisitar("/api/consumos-ia?" + params.toString());
		},

		listar: function (filtros) {
			const params = new URLSearchParams({
				empresaId: filtros.empresaId,
				inicio: dataHoraApi(filtros.inicio),
				fim: dataHoraApi(filtros.fim),
				pagina: String(filtros.pagina),
				tamanho: String(filtros.tamanho)
			});
			return requisitar("/api/consumos-ia?" + params.toString());
		}
	};
})();
