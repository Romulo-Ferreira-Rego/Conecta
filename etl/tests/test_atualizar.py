"""Testes das decisões do job de atualização (sem rede e sem banco)."""

from datetime import date

import pytest

from etl.atualizar import (
    CHECK_HASH,
    NEW,
    PREVIOUS_ERROR,
    SIZE_CHANGED,
    SIZE_UNKNOWN,
    ImportedFile,
    months_ago,
    reason_to_import,
    select_candidates,
)
from etl.fontes import DataFile


def semester(year: int, number: int) -> DataFile:
    first = 1 if number == 1 else 7
    return DataFile(
        url="", name=f"dsas/ca/ca-{year}-0{number}.zip", kind="semestral",
        start=date(year, first, 1), end=date(year, first + 5, 1),
    )


def month(year: int, number: int) -> DataFile:
    start = date(year, number, 1)
    return DataFile(url="", name=f"dsan/{year}/{number:02d}-gasolina-etanol.csv", kind="mensal", start=start, end=start)


@pytest.mark.parametrize(
    "today, months, expected",
    [
        (date(2026, 10, 30), 24, date(2024, 10, 1)),
        (date(2026, 1, 15), 1, date(2025, 12, 1)),
        (date(2026, 3, 1), 0, date(2026, 3, 1)),
    ],
)
def test_months_ago(today, months, expected):
    assert months_ago(today, months) == expected


def test_select_candidates_uses_window_and_skips_covered_months():
    files = [
        semester(2024, 1),  # termina antes da janela
        semester(2024, 2),  # termina dentro da janela
        month(2024, 11),  # já coberto pelo semestral 2024-02
        semester(2026, 1),
        month(2026, 6),  # coberto pelo semestral 2026-01
        month(2026, 7),  # ainda não há semestral: deve entrar
    ]
    selected = [f.name for f in select_candidates(files, since=date(2024, 10, 1))]
    assert selected == [
        "dsas/ca/ca-2024-02.zip",
        "dsas/ca/ca-2026-01.zip",
        "dsan/2026/07-gasolina-etanol.csv",
    ]


OK = ImportedFile(size=1000, sha256="abc", status="sucesso")


@pytest.mark.parametrize(
    "previous, size_now, check_hash, expected",
    [
        (None, 1000, False, NEW),
        (ImportedFile(size=1000, sha256=None, status="erro"), 1000, False, PREVIOUS_ERROR),
        (OK, 1000, False, None),
        (OK, 2000, False, SIZE_CHANGED),
        (OK, None, False, SIZE_UNKNOWN),
        (OK, 1000, True, CHECK_HASH),
    ],
)
def test_reason_to_import(previous, size_now, check_hash, expected):
    assert reason_to_import(previous, size_now, check_hash) == expected
