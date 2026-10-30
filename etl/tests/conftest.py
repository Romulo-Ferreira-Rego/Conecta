"""Fixtures do ETL: um CSV pequeno e inventado com os casos difíceis dos arquivos reais."""

import pytest

from db.tests.conftest import alembic_config, conn, engine, test_database_url  # noqa: F401  (reuso das fixtures do banco)
from etl.limpeza import CleanResult, clean
from etl.extracao import read_raw

HEADER = (
    "Regiao - Sigla;Estado - Sigla;Municipio;Revenda;CNPJ da Revenda;Nome da Rua;"
    "Numero Rua;Complemento;Bairro;Cep;Produto;Data da Coleta;Valor de Venda;"
    "Valor de Compra;Unidade de Medida;Bandeira"
)

# 4 linhas válidas (as 4 primeiras) e 8 com problemas, um de cada tipo.
ROWS = [
    # Válida; CNPJ com espaço à esquerda (como nos arquivos reais) e município com acento
    "NE;MA;São Luís;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;GASOLINA;02/01/2026;6,29;;R$ / litro;IPIRANGA",
    # Válida; mesmo posto com CNPJ só com dígitos (formato do 2º sem. 2025) e município sem acento
    "NE;MA;SAO  LUIS ;POSTO TESTE A LTDA;11111111000111;RUA X;1;;CENTRO;65000-000;ETANOL;02/01/2026;4,59;;R$ / litro;IPIRANGA",
    # Válida; coleta mais recente do mesmo posto, que trocou de bandeira; com valor de compra
    "NE;MA;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;GASOLINA;09/01/2026;6,39;5,80;R$ / litro;RAIZEN",
    # Válida; GNV com unidade em m³
    "SE;SP;SAO PAULO;POSTO TESTE B LTDA; 22.222.222/0001-22;AV Y;2;;SE;01000-000;GNV;05/01/2026;4,99;;R$ / m³;BRANCA",
    # Duplicada da primeira (mesmo posto, produto e data)
    "NE;MA;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;GASOLINA;02/01/2026;6,29;;R$ / litro;IPIRANGA",
    # Data inexistente
    "NE;MA;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;DIESEL;31/02/2026;6,10;;R$ / litro;IPIRANGA",
    # Preço não numérico
    "NE;MA;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;DIESEL S10;03/01/2026;abc;;R$ / litro;IPIRANGA",
    # Preço zero
    "NE;MA;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;DIESEL S10;04/01/2026;0;;R$ / litro;IPIRANGA",
    # Produto fora do escopo da v1
    "NE;MA;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;GLP;02/01/2026;110,00;;R$ / 13 kg;IPIRANGA",
    # UF inexistente
    "NE;XX;SAO LUIS;POSTO TESTE A LTDA; 11.111.111/0001-11;RUA X;1;;CENTRO;65000-000;ETANOL;05/01/2026;4,59;;R$ / litro;IPIRANGA",
    # CNPJ inválido
    "NE;MA;SAO LUIS;POSTO TESTE C LTDA;123;RUA Z;3;;CENTRO;65000-000;ETANOL;05/01/2026;4,59;;R$ / litro;IPIRANGA",
    # Linha vazia (aparece no fim do arquivo do 1º sem. 2025)
    ";;;;;;;;;;;;;;;",
]

SAMPLE_CSV = "\n".join([HEADER, *ROWS]) + "\n"

EXPECTED_DISCARDS = {
    "linha_vazia": 1,
    "uf_invalida": 1,
    "cnpj_invalido": 1,
    "produto_fora_do_escopo": 1,
    "data_invalida": 1,
    "preco_invalido": 2,
    "duplicada_no_arquivo": 1,
}


@pytest.fixture
def sample_path(tmp_path):
    path = tmp_path / "amostra.csv"
    path.write_text(SAMPLE_CSV, encoding="utf-8-sig")  # UTF-8 com BOM, como a ANP
    return path


@pytest.fixture
def cleaned(sample_path) -> CleanResult:
    return clean(read_raw(sample_path))
