"""Testes das regras de limpeza e padronização."""

import math
from datetime import date

import pandas as pd
import pytest

from etl.extracao import read_raw
from etl.limpeza import QualityError, SchemaError, clean

from etl.tests.conftest import EXPECTED_DISCARDS, HEADER, ROWS


def test_counts_read_valid_and_discarded(cleaned):
    assert cleaned.rows_read == len(ROWS)
    assert cleaned.rows_valid == 4
    assert cleaned.discarded == EXPECTED_DISCARDS


def test_city_names_are_unified(cleaned):
    """"São Luís" e "SAO  LUIS " precisam virar o mesmo município."""
    cidades = set(cleaned.data.loc[cleaned.data["uf"] == "MA", "municipio"])
    assert cidades == {"SAO LUIS"}


def test_cnpj_with_and_without_punctuation_is_the_same(cleaned):
    cnpjs = set(cleaned.data.loc[cleaned.data["uf"] == "MA", "cnpj"])
    assert cnpjs == {"11.111.111/0001-11"}


def test_prices_use_decimal_point(cleaned):
    row = cleaned.data[(cleaned.data["produto"] == "GASOLINA") & (cleaned.data["data_coleta"] == date(2026, 1, 9))].iloc[0]
    assert row["valor_venda"] == pytest.approx(6.39)
    assert row["valor_compra"] == pytest.approx(5.80)


def test_missing_purchase_price_is_empty(cleaned):
    row = cleaned.data[cleaned.data["produto"] == "ETANOL"].iloc[0]
    assert math.isnan(row["valor_compra"])


def test_dates_are_parsed(cleaned):
    assert set(cleaned.data["data_coleta"]) == {date(2026, 1, 2), date(2026, 1, 9), date(2026, 1, 5)}


def test_unit_is_standardized_by_product(cleaned):
    units = dict(zip(cleaned.data["produto"], cleaned.data["unidade"]))
    assert units["GNV"] == "R$ / m³"
    assert units["GASOLINA"] == "R$ / litro"


def test_missing_required_column_raises_schema_error(sample_path):
    df = read_raw(sample_path).drop(columns=["Valor de Venda"])
    with pytest.raises(SchemaError, match="valor_venda"):
        clean(df)


def test_alternative_column_name_is_accepted(sample_path):
    df = read_raw(sample_path).rename(columns={"Estado - Sigla": "Estado"})
    assert clean(df).rows_valid == 4


def test_quality_check_fails_when_too_many_rows_are_discarded(cleaned):
    # Na amostra, 7 de 11 linhas não vazias são descartadas (bem acima de 10%)
    with pytest.raises(QualityError):
        cleaned.check_quality()


def test_quality_check_ignores_empty_rows():
    lines = [HEADER, *ROWS[:4], ";;;;;;;;;;;;;;;", ";;;;;;;;;;;;;;;"]
    df = pd.DataFrame([line.split(";") for line in lines[1:]], columns=HEADER.split(";"))
    result = clean(df)
    assert result.discarded == {"linha_vazia": 2}
    result.check_quality()  # não deve falhar
