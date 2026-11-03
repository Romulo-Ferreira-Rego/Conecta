"""Testes da ligação entre os municípios da ANP e os códigos do IBGE."""

from sqlalchemy import text

from etl import carga, ibge


def test_name_key_ignores_accents_apostrophes_and_hyphens():
    assert ibge.name_key("Santa Bárbara d'Oeste") == "SANTA BARBARA D OESTE"
    assert ibge.name_key("  Embu-Guaçu ") == "EMBU GUACU"


def test_find_code_matches_anp_spelling():
    assert ibge.find_code("MA", "SAO LUIS") == 2111300
    assert ibge.find_code("SP", "SANTA BARBARA D OESTE") == 3545803
    assert ibge.find_code("RS", "SANTANA DO LIVRAMENTO") == 4317103  # apelido
    assert ibge.find_code("MA", "CIDADE INEXISTENTE") is None
    assert ibge.find_code("PI", "SAO LUIS") is None  # o nome precisa ser da mesma UF


def test_load_links_new_municipalities(conn, cleaned):
    carga.load(conn, cleaned, "teste/amostra.csv", size=None, sha256=None)
    codigo = conn.execute(
        text(
            "SELECT m.codigo_ibge FROM dados.municipio m JOIN dados.estado e ON e.id = m.estado_id "
            "WHERE m.nome = 'SAO LUIS' AND e.sigla = 'MA'"
        )
    ).scalar()
    assert codigo == 2111300


def test_unknown_municipality_stays_null(conn):
    conn.execute(
        text("INSERT INTO dados.municipio (nome, estado_id) SELECT 'CIDADE INEXISTENTE', id FROM dados.estado WHERE sigla = 'MA'")
    )
    assert ibge.link_municipalities(conn) == 0
    assert conn.execute(
        text("SELECT codigo_ibge FROM dados.municipio WHERE nome = 'CIDADE INEXISTENTE'")
    ).scalar() is None
