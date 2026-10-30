"""Testes da leitura dos arquivos: encoding, ZIP e arquivos sem extensão."""

import zipfile

import pytest

from etl.extracao import ExtractionError, read_raw

from etl.tests.conftest import ROWS, SAMPLE_CSV


def test_reads_utf8_with_bom(sample_path):
    df = read_raw(sample_path)
    assert df.columns[0] == "Regiao - Sigla"  # o BOM não pode "grudar" no nome da coluna
    assert len(df) == len(ROWS)
    assert df.loc[0, "Municipio"] == "São Luís"


def test_reads_latin1(tmp_path):
    path = tmp_path / "latin1.csv"
    path.write_bytes(SAMPLE_CSV.encode("latin-1"))
    df = read_raw(path)
    assert df.loc[0, "Municipio"] == "São Luís"
    assert df.loc[3, "Unidade de Medida"] == "R$ / m³"


def test_reads_csv_inside_zip_without_extension(tmp_path):
    path = tmp_path / "arquivo-sem-extensao"  # a ANP publica alguns assim
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("Preços semestrais.csv", SAMPLE_CSV.encode("utf-8-sig"))
    df = read_raw(path)
    assert len(df) == len(ROWS)


def test_zip_with_several_files_is_rejected(tmp_path):
    path = tmp_path / "dois.zip"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("a.csv", SAMPLE_CSV)
        archive.writestr("b.csv", SAMPLE_CSV)
    with pytest.raises(ExtractionError, match="Esperado 1 arquivo"):
        read_raw(path)


def test_empty_cells_are_empty_strings(sample_path):
    df = read_raw(sample_path)
    assert df.loc[0, "Valor de Compra"] == ""
