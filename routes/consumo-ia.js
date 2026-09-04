const express = require("express");
const router = express.Router();

router.get("/registrar", (req, res) => {
	res.render("consumo-ia/registrar", { titulo: "Registrar consumo de IA" });
});

router.get("/consultar", (req, res) => {
	res.render("consumo-ia/consultar", { titulo: "Consultar consumo de IA" });
});

module.exports = router;
