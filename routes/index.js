const express = require("express");
const wrap = require("express-async-error-wrapper");

const router = express.Router();

router.get("/", wrap(async (req, res) => {
	res.render("index/index");
}));

// Atalho amigável para a página de cadastro.
// A URL principal continua sendo /empresa/criar.
router.get("/criar", (req, res) => {
	res.redirect(302, "/empresa/criar");
});

module.exports = router;
