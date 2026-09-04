# Integração Node.js com QSoft AI Governance

Este projeto usa Express 4 e EJS como cliente intermediário do backend Spring Boot executado no Docker.

## Executar

O arquivo `.env` deve conter o endereço do backend:

```env
url_springboot=http://localhost:8080
```

Inicie o cliente Node.js:

```powershell
node app.js
```

Acesse `http://127.0.0.1:3000`.

## Páginas

- `GET /consumo-ia/registrar`: formulário de registro.
- `GET /consumo-ia/consultar`: consulta por ID e por período.

## APIs disponibilizadas pelo Node

O Node valida os dados e encaminha as chamadas ao caminho `/api/v1/consumos-ia` do Spring Boot.

| Método | Endpoint Node | Operação no Spring Boot |
|---|---|---|
| `POST` | `/api/consumos-ia` | Registrar consumo |
| `GET` | `/api/consumos-ia/:id?empresaId=...` | Consultar pelo ID no caminho |
| `GET` | `/api/consumos-ia?id=...&empresaId=...` | Consultar pelo ID na query |
| `GET` | `/api/consumos-ia?empresaId=...&inicio=...&fim=...&pagina=0&tamanho=20` | Consultar por período |

As datas usam o formato `AAAA-MM-DDTHH:mm:ss`. O período máximo é de 31 dias, a página começa em zero e o tamanho aceito fica entre 1 e 100.

Status aceitos para um consumo: `success`, `error`, `rate_limited` e `timeout`.

## Observação sobre empresas

O artefato Docker atual contém tabelas de empresas e outros cadastros, mas não publica controllers HTTP de CRUD para eles. Por isso a pasta de empresa foi mantida apenas como exemplo legado; não é possível concluir esse CRUD sem que o backend ofereça os respectivos endpoints.
