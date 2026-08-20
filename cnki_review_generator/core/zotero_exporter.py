"""Zotero 活动引用注入与文献库导出核心引擎。"""

from __future__ import annotations

import json
import os
import re
import sys
import zipfile
from copy import deepcopy
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

DEFAULT_STYLE_ID = "http://www.zotero.org/styles/china-national-standard-gb-t-7714-2015-numeric"
DEFAULT_LOCALE = "zh-CN"
DEFAULT_SESSION_ID = "CnkiZotero01"
CSL_SCHEMA = "https://github.com/citation-style-language/schema/raw/master/csl-citation.json"
MAX_PROPERTY_LENGTH = 255

CUSTOM_PROPS_PART = "docProps/custom.xml"
CUSTOM_PROPS_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.custom-properties+xml"
CUSTOM_PROPS_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties"
_FMTID = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}"


def build_document_prefs(
    *,
    style_id: str = DEFAULT_STYLE_ID,
    locale: str = DEFAULT_LOCALE,
    store_references: bool = True,
    session_id: str = DEFAULT_SESSION_ID,
) -> str:
    return json.dumps(
        {
            "style": {
                "styleID": style_id,
                "locale": locale,
                "hasBibliography": True,
                "bibliographyStyleHasBeenSet": True,
            },
            "prefs": {
                "fieldType": "Field",
                "storeReferences": bool(store_references),
                "automaticJournalAbbreviations": True,
                "noteType": 0,
            },
            "sessionID": session_id,
            "zoteroVersion": "9.0.0",
            "dataVersion": 3,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def custom_properties_xml(prefs: str) -> str:
    properties: list[str] = []
    chunks = [
        prefs[i : i + MAX_PROPERTY_LENGTH]
        for i in range(0, len(prefs), MAX_PROPERTY_LENGTH)
    ] or [""]
    pid = 2
    for index, chunk in enumerate(chunks, start=1):
        properties.append(
            f'<property fmtid="{_FMTID}" pid="{pid}" name="ZOTERO_PREF_{index}">'
            f"<vt:lpwstr>{escape(chunk)}</vt:lpwstr></property>"
        )
        pid += 1
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        + "".join(properties)
        + "</Properties>\n"
    )


def _patch_content_types(xml: str) -> str:
    if f'PartName="/{CUSTOM_PROPS_PART}"' not in xml:
        override = (
            f'<Override PartName="/{CUSTOM_PROPS_PART}" '
            f'ContentType="{CUSTOM_PROPS_CONTENT_TYPE}"/>'
        )
        xml = xml.replace("</Types>", override + "</Types>", 1)
    return xml


def _patch_package_rels(xml: str) -> str:
    if CUSTOM_PROPS_REL_TYPE in xml:
        return xml
    rel = (
        '<Relationship Id="rIdZoteroPref" '
        f'Type="{CUSTOM_PROPS_REL_TYPE}" Target="{CUSTOM_PROPS_PART}"/>'
    )
    return xml.replace("</Relationships>", rel + "</Relationships>", 1)


def field_code_xml(code: str) -> str:
    return (
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        f'<w:r><w:instrText xml:space="preserve"> {escape(code)} </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    )


def build_citation_field_xml(tex_cite_keys: list[str], display_text: str, library: dict[str, dict], cite_index: int) -> str:
    citation_items = []
    for key in tex_cite_keys:
        item = deepcopy(library.get(key, {"id": key, "title": key, "type": "article-journal"}))
        citation_items.append({
            "id": key,
            "uris": [],
            "itemData": item
        })
    payload = {
        "citationID": f"cCnkiCite{cite_index:03d}",
        "properties": {
            "formattedCitation": display_text,
            "plainCitation": display_text,
            "noteIndex": 0,
        },
        "citationItems": citation_items,
        "schema": CSL_SCHEMA,
    }
    code = "ADDIN ZOTERO_ITEM CSL_CITATION " + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    result = (
        "<w:r>"
        "<w:rPr>"
        '<w:vertAlign w:val="superscript"/>'
        '<w:rFonts w:ascii="Times New Roman" w:eastAsia="宋体" w:hAnsi="Times New Roman"/>'
        "</w:rPr>"
        f"<w:t>{escape(display_text)}</w:t>"
        "</w:r>"
        '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    )
    return field_code_xml(code) + result


def convert_docx_to_zotero_live(
    in_docx_path: str | Path,
    out_docx_path: str | Path,
    tex_path: str | Path,
    references_json_path: str | Path,
    style_id: str = DEFAULT_STYLE_ID,
) -> None:
    with open(references_json_path, "r", encoding="utf-8") as f:
        ref_data = json.load(f)
    refs_list = ref_data.get("references", [])
    library = {item["id"]: item for item in refs_list}
    ref_keys = [item["id"] for item in refs_list]

    tex_cites = []
    if os.path.isfile(tex_path):
        with open(tex_path, "r", encoding="utf-8") as f:
            tex_text = f.read()
        raw_cites = re.findall(r'\\cite\{([^}]+)\}', tex_text)
        tex_cites = [[k.strip() for k in c.split(",") if k.strip()] for c in raw_cites]

    with zipfile.ZipFile(in_docx_path, "r") as zin:
        parts = {info.filename: zin.read(info.filename) for info in zin.infolist()}
        infos = list(zin.infolist())

    doc_xml = parts["word/document.xml"].decode("utf-8")

    super_pattern = re.compile(
        r'<w:r\b[^>]*><w:rPr>(?:(?!</w:rPr>).)*?<w:vertAlign w:val="superscript"/>.*?</w:rPr><w:t\b[^>]*>(\[[0-9,\-\s]+\])</w:t></w:r>',
        re.DOTALL
    )

    cite_counter = 0

    def _replace_super(match: re.Match[str]) -> str:
        nonlocal cite_counter
        display = match.group(1)

        # 解析方括号内的具体数字，精准映射到对应的文献 Key
        nums = []
        clean = display.strip("[]")
        for chunk in clean.split(","):
            chunk = chunk.strip()
            if "-" in chunk:
                p_parts = chunk.split("-")
                if len(p_parts) == 2 and p_parts[0].isdigit() and p_parts[1].isdigit():
                    nums.extend(range(int(p_parts[0]), int(p_parts[1]) + 1))
            elif chunk.isdigit():
                nums.append(int(chunk))

        keys = []
        for n in nums:
            if 1 <= n <= len(ref_keys):
                keys.append(ref_keys[n - 1])

        if not keys:
            if cite_counter < len(tex_cites):
                keys = tex_cites[cite_counter]
            else:
                keys = [ref_keys[0] if ref_keys else "dominy2019"]

        cite_counter += 1
        return build_citation_field_xml(keys, display, library, cite_counter)

    doc_xml = super_pattern.sub(_replace_super, doc_xml)

    # 包装文末参考文献表
    bibl_pattern = re.compile(r'(<w:p\b[^>]*>(?:(?!</w:p>).)*?<w:pStyle w:val="Bibliography"/>(?:(?!</w:p>).)*?</w:p>)', re.DOTALL)
    bibl_matches = list(bibl_pattern.finditer(doc_xml))
    if not bibl_matches:
        bibl_pattern = re.compile(r'(<w:p\b[^>]*>(?:(?!</w:p>).)*?<w:t\b[^>]*>\[[0-9]+\]\s+.*?</w:p>)', re.DOTALL)
        bibl_matches = list(bibl_pattern.finditer(doc_xml))

    if bibl_matches:
        first_match = bibl_matches[0]
        last_match = bibl_matches[-1]
        bib_start_code = field_code_xml('ADDIN ZOTERO_BIBL {"uncited":[],"omitted":[],"custom":[]} CSL_BIBLIOGRAPHY')
        bib_end_code = '<w:r><w:fldChar w:fldCharType="end"/></w:r>'

        first_p = first_match.group(1)
        last_p = last_match.group(1)

        insert_pos = first_p.find("</w:pPr>")
        if insert_pos >= 0:
            insert_pos += len("</w:pPr>")
            new_first_p = first_p[:insert_pos] + bib_start_code + first_p[insert_pos:]
        else:
            new_first_p = "<w:p>" + bib_start_code + first_p[len("<w:p>"):]

        last_insert_pos = last_p.rfind("</w:p>")
        new_last_p = last_p[:last_insert_pos] + bib_end_code + last_p[last_insert_pos:]

        if len(bibl_matches) == 1:
            combined = first_p
            p_pos = combined.find("</w:pPr>")
            if p_pos >= 0:
                p_pos += len("</w:pPr>")
                combined = combined[:p_pos] + bib_start_code + combined[p_pos:]
            end_pos = combined.rfind("</w:p>")
            combined = combined[:end_pos] + bib_end_code + combined[end_pos:]
            doc_xml = doc_xml[:first_match.start()] + combined + doc_xml[first_match.end():]
        else:
            doc_xml = (
                doc_xml[:first_match.start()]
                + new_first_p
                + doc_xml[first_match.end():last_match.start()]
                + new_last_p
                + doc_xml[last_match.end():]
            )

    parts["word/document.xml"] = doc_xml.encode("utf-8")
    prefs_json = build_document_prefs(style_id=style_id, locale="zh-CN", session_id=DEFAULT_SESSION_ID)
    parts[CUSTOM_PROPS_PART] = custom_properties_xml(prefs_json).encode("utf-8")

    content_types = parts.get("[Content_Types].xml", b"").decode("utf-8")
    parts["[Content_Types].xml"] = _patch_content_types(content_types).encode("utf-8")

    package_rels = parts.get("_rels/.rels", b"").decode("utf-8")
    parts["_rels/.rels"] = _patch_package_rels(package_rels).encode("utf-8")

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        written = set()
        for info in infos:
            new_info = zipfile.ZipInfo(filename=info.filename, date_time=info.date_time)
            new_info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(new_info, parts[info.filename])
            written.add(info.filename)
        for name, content in parts.items():
            if name not in written:
                zout.writestr(name, content)

    with open(out_docx_path, "wb") as f:
        f.write(buffer.getvalue())


def export_zotero_libraries(references_json_path: str | Path, base_output_path: str | Path) -> None:
    with open(references_json_path, "r", encoding="utf-8") as f:
        ref_data = json.load(f)
    refs = ref_data.get("references", [])

    json_path = f"{base_output_path}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(refs, f, ensure_ascii=False, indent=2)

    ris_path = f"{base_output_path}.ris"
    ris_lines = []
    for r in refs:
        t = r.get("type", "article-journal")
        if t in ("article-journal", "article"):
            ris_lines.append("TY  - JOUR")
        elif t in ("book", "monograph"):
            ris_lines.append("TY  - BOOK")
        elif t == "thesis":
            ris_lines.append("TY  - THES")
        elif t in ("standard", "legislation"):
            ris_lines.append("TY  - STAND")
        else:
            ris_lines.append("TY  - GEN")

        title = r.get("title", "")
        if title:
            ris_lines.append(f"TI  - {title}")

        for auth in r.get("author", []):
            if auth.get("literal"):
                ris_lines.append(f"AU  - {auth['literal']}")
            elif auth.get("family"):
                fam = auth["family"]
                giv = auth.get("given", "")
                ris_lines.append(f"AU  - {fam}, {giv}".strip(", "))

        if r.get("container-title"):
            ris_lines.append(f"JO  - {r['container-title']}")
            ris_lines.append(f"T2  - {r['container-title']}")
        if r.get("volume"):
            ris_lines.append(f"VL  - {r['volume']}")
        if r.get("issue"):
            ris_lines.append(f"IS  - {r['issue']}")
        if r.get("page"):
            ris_lines.append(f"SP  - {r['page']}")
        if r.get("DOI"):
            ris_lines.append(f"DO  - {r['DOI']}")
        if r.get("publisher"):
            ris_lines.append(f"PB  - {r['publisher']}")
        if r.get("publisher-place"):
            ris_lines.append(f"CY  - {r['publisher-place']}")

        issued = r.get("issued", {}).get("date-parts", [[]])[0]
        if issued:
            ris_lines.append(f"PY  - {issued[0]}")

        ris_lines.append("ER  - \n")

    with open(ris_path, "w", encoding="utf-8") as f:
        f.write("\n".join(ris_lines))
