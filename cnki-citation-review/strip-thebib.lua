-- strip-thebib.lua
-- 用途：pandoc 转 docx 时，去掉 LaTeX 源码中手工编写的 thebibliography 环境，
--       避免与 --citeproc 自动生成的 GB/T 7714 参考文献表重复。
-- 用法：pandoc x.tex --citeproc ... --lua-filter=strip-thebib.lua -o x.docx
function Div(el)
  if el.classes[1] == "thebibliography" then
    return {}
  end
  return nil
end
