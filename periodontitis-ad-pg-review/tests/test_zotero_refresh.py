#!/usr/bin/env python3
"""自动化测试：验证 Word 文档中的 Zotero 活动引用域与 Refresh 兼容性。"""

import json
import re
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOCX_MAIN = ROOT / "periodontitis-ad-pg-review.docx"
DOCX_ACTIVE = ROOT / "牙周炎与AD关联综述_Zotero活动引用版.docx"
NS = {
    "cp": "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
    "vt": "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes",
}


def _document_xml(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        return archive.read("word/document.xml").decode("utf-8")


def _pref_property_text(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        raw = archive.read("docProps/custom.xml")
    root = ET.fromstring(raw)
    chunks = []
    for prop in root.findall("cp:property", NS):
        name = prop.get("name") or ""
        if not name.startswith("ZOTERO_PREF_"):
            continue
        idx = int(name.rsplit("_", 1)[1])
        value = prop.findtext("vt:lpwstr", default="", namespaces=NS)
        chunks.append((idx, value))
    return "".join(text for _, text in sorted(chunks))


def _json_payloads(xml: str) -> list[dict]:
    instrs = re.findall(r"<w:instrText[^>]*>(.*?)</w:instrText>", xml, flags=re.DOTALL)
    payloads = []
    for text in instrs:
        if "CSL_CITATION" not in text:
            continue
        start = text.find("{")
        payloads.append(json.loads(text[start:]))
    return payloads


class TestZoteroRefreshCompatibility(unittest.TestCase):
    def test_main_docx_has_zotero_fields(self):
        self._verify_docx(DOCX_MAIN, min_cites=30)

    def test_active_docx_has_zotero_fields(self):
        self._verify_docx(DOCX_ACTIVE, min_cites=30)

    def _verify_docx(self, path: Path, min_cites: int):
        self.assertTrue(path.is_file(), f"File {path} does not exist")
        xml = _document_xml(path)
        with zipfile.ZipFile(path) as z:
            names = set(z.namelist())

        self.assertIn("docProps/custom.xml", names)
        self.assertIn("ZOTERO_ITEM", xml)
        self.assertIn("ZOTERO_BIBL", xml)
        self.assertNotIn("fldSimple", xml)

        # Verify Document Prefs
        pref_str = _pref_property_text(path)
        self.assertTrue(bool(pref_str.strip()), "ZOTERO_PREF is empty")
        pref = json.loads(pref_str)
        self.assertEqual(pref["dataVersion"], 3)
        self.assertEqual(pref["prefs"]["fieldType"], "Field")
        self.assertTrue(pref["prefs"]["storeReferences"])
        self.assertIn("china-national-standard-gb-t-7714-2015-numeric", pref["style"]["styleID"])

        # Verify Citation Payloads
        payloads = _json_payloads(xml)
        self.assertGreaterEqual(len(payloads), min_cites)
        citation_ids = [p["citationID"] for p in payloads]
        self.assertEqual(len(citation_ids), len(set(citation_ids)), "Citation IDs must be unique")

        for p in payloads:
            self.assertEqual(p["properties"]["noteIndex"], 0)
            for ci in p["citationItems"]:
                self.assertEqual(ci.get("uris"), [])
                self.assertIsInstance(ci["id"], str)
                self.assertTrue(ci["itemData"]["title"])
                self.assertEqual(ci["id"], ci["itemData"]["id"])


if __name__ == "__main__":
    unittest.main()
