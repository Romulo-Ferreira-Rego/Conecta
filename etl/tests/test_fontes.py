"""Testes da descoberta de arquivos na página da ANP (sem acessar a internet)."""

from datetime import date

from etl.fontes import parse_page

BASE = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/"

# Trecho que imita a página real, com as irregularidades encontradas nela.
PAGE = f"""
<html><body>
  <a href="{BASE}metadados-serie-historica-precos-combustiveis-1.pdf">Metadados</a>
  <a href="{BASE}dsas/ca/ca-2026-01.zip">1º semestre de 2026</a>
  <a href="{BASE}dsas/ca/precos-semestrais-ca.zip">1º semestre de 2022</a>
  <a href="{BASE}dsas/ca/ca-2021-02.csv">2º semestre de 2021</a>
  <a href="{BASE}dsan/2026/09-dados-abertos-precos-2026-09-gasolina-etanol.csv">Setembro de 2026</a>
  <a href="{BASE}dsan/2026/04-dados-abertos-precos-diesel-gnv">Abril de 2026</a>
  <a href="{BASE}dsan/2026/03-dados-abertos-precos-diesel-gnv.csv">Março de 2026</a>
  <a href="{BASE}dsan/2026/02-cados-abertos-preco-gasolina-etanol.csv">Fevereiro de 2026</a>
  <a href="{BASE}dsan/2026/10-dados-abertos-precos-2026-10-diesel-gnv.csv">Em breve</a>
  <a href="{BASE}dsas/glp/glp-2026-01.csv">1º semestre de 2026</a>
  <a href="{BASE}dsan/2026/09-dados-abertos-precos-2026-09-glp.csv">Setembro de 2026</a>
  <a href="https://outro.site/arquivo.csv">Setembro de 2026</a>
</body></html>
"""


def by_name():
    return {f.name: f for f in parse_page(PAGE)}


def test_finds_only_automotive_fuel_files():
    assert set(by_name()) == {
        "dsas/ca/ca-2026-01.zip",
        "dsas/ca/precos-semestrais-ca.zip",
        "dsas/ca/ca-2021-02.csv",
        "dsan/2026/09-dados-abertos-precos-2026-09-gasolina-etanol.csv",
        "dsan/2026/04-dados-abertos-precos-diesel-gnv",
        "dsan/2026/03-dados-abertos-precos-diesel-gnv.csv",
        "dsan/2026/02-cados-abertos-preco-gasolina-etanol.csv",
    }


def test_semester_period_comes_from_link_text():
    files = by_name()
    first = files["dsas/ca/ca-2026-01.zip"]
    assert (first.kind, first.start, first.end) == ("semestral", date(2026, 1, 1), date(2026, 6, 1))
    second = files["dsas/ca/ca-2021-02.csv"]
    assert (second.start, second.end) == (date(2021, 7, 1), date(2021, 12, 1))
    # Nome fora do padrão, mas o texto do link diz o período
    assert files["dsas/ca/precos-semestrais-ca.zip"].start == date(2022, 1, 1)


def test_month_period_comes_from_link_text():
    files = by_name()
    march = files["dsan/2026/03-dados-abertos-precos-diesel-gnv.csv"]
    assert (march.kind, march.start, march.end) == ("mensal", date(2026, 3, 1), date(2026, 3, 1))
    assert files["dsan/2026/02-cados-abertos-preco-gasolina-etanol.csv"].start == date(2026, 2, 1)


def test_url_is_kept_complete():
    assert by_name()["dsas/ca/ca-2026-01.zip"].url == BASE + "dsas/ca/ca-2026-01.zip"


def test_files_are_sorted_by_period_with_semesters_first():
    names = [f.name for f in parse_page(PAGE)]
    assert names[0] == "dsas/ca/ca-2021-02.csv"
    assert names[-1] == "dsan/2026/09-dados-abertos-precos-2026-09-gasolina-etanol.csv"
    assert names.index("dsas/ca/ca-2026-01.zip") < names.index("dsan/2026/02-cados-abertos-preco-gasolina-etanol.csv")


def test_empty_page_returns_no_files():
    assert parse_page("<html></html>") == []
