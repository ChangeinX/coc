import pytest
from coclib.utils import normalize_tag, encode_tag


def test_normalize_tag_strip_and_upper():
    assert normalize_tag('#abc') == 'ABC'
    assert normalize_tag('Def') == 'DEF'


def test_encode_tag_quotes_percent23():
    assert encode_tag('abc') == '%23ABC'
    assert encode_tag('#def') == '%23DEF'
